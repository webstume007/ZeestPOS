import { supabase } from './supabase';
import { query, setSyncEventsSuppressed } from './db';

// Sync table configuration: order matters (parents before children for push)
const PUSH_ORDER = [
  'users', 
  'vendors', 
  'customers', 
  'products', 
  'sales', 
  'sale_items', 
  'stock_logs', 
  'customer_transactions', 
  'cash_register'
];

// Pull order: same dependency order
const PULL_ORDER = PUSH_ORDER;

// Known columns per local PGlite table (prevents crashes from unknown Supabase columns)
const LOCAL_COLUMNS: Record<string, string[]> = {
  users: ['id', 'username', 'cnic', 'pin', 'role', 'updated_at'],
  vendors: ['id', 'name', 'representative_name', 'contact', 'address', 'updated_at'],
  customers: ['id', 'full_name', 'whatsapp_number', 'address', 'customer_type', 'total_credit_balance', 'updated_at'],
  products: ['id', 'name_en', 'name_ur', 'category', 'buy_price', 'buy_time', 'current_stock', 'retail_price', 'wholesale_shopkeeper_price', 'wholesale_customer_price', 'is_deleted', 'vendor_id', 'unit', 'updated_at'],
  sales: ['invoice_id', 'timestamp', 'customer_id', 'cashier_id', 'total_amount', 'amount_paid', 'payment_status', 'customer_name', 'discount_amount', 'invoice_number', 'updated_at'],
  sale_items: ['id', 'invoice_id', 'product_id', 'quantity', 'price_applied', 'updated_at'],
  stock_logs: ['id', 'product_id', 'vendor_id', 'quantity_added', 'buy_price', 'timestamp', 'updated_at'],
  customer_transactions: ['id', 'customer_id', 'type', 'amount', 'balance_after', 'description', 'created_by', 'timestamp', 'updated_at'],
  cash_register: ['id', 'shift_id', 'cashier_id', 'cash_in', 'cash_out', 'timestamp', 'reason', 'updated_at'],
};

// Primary key per table
const PRIMARY_KEYS: Record<string, string> = {
  users: 'id',
  vendors: 'id',
  customers: 'id',
  products: 'id',
  sales: 'invoice_id',
  sale_items: 'id',
  stock_logs: 'id',
  customer_transactions: 'id',
  cash_register: 'id',
};

// Sync lock to prevent concurrent syncs
let _isSyncing = false;

export async function syncDatabase(): Promise<void> {
  if (_isSyncing) {
    console.log('[Sync] Sync already in progress, skipping.');
    return;
  }
  _isSyncing = true;

  console.log('[Sync] Starting background sync...');
  
  const lastSynced = localStorage.getItem('last_synced_timestamp') || '1970-01-01T00:00:00.000Z';
  const syncStartTime = new Date().toISOString();

  let syncErrors: string[] = [];

  try {
    // ═══════════════════════════════════════════════════════
    // 1. PUSH LOGIC (Local → Supabase)
    // ═══════════════════════════════════════════════════════
    for (const table of PUSH_ORDER) {
      try {
        const localChanges = await query(
          `SELECT * FROM ${table} WHERE updated_at > $1 OR updated_at IS NULL`, 
          [lastSynced], 
          false
        );
        
        if (localChanges.length === 0) continue;

        // Sanitize records before pushing
        const sanitized = localChanges.map(record => {
          const clean = { ...record };
          // Stamp with sync time so other devices can discover these changes
          clean.updated_at = syncStartTime;
          // Fix cash_register: ensure shift_id is not "no-shift" (invalid for UUID column on Supabase)
          if (table === 'cash_register') {
            if (clean.shift_id === 'no-shift' || !clean.shift_id) {
              clean.shift_id = null;
            }
          }
          return clean;
        });
        
        console.log(`[Sync] Pushing ${sanitized.length} records for ${table}`);
        
        // Try batch upsert first (fast path)
        const { error } = await supabase.from(table).upsert(sanitized, { 
          onConflict: PRIMARY_KEYS[table] 
        });
        
        if (!error) continue; // Success!
        
        // Batch failed — fallback to individual upserts (resilient path)
        console.warn(`[Sync] Batch push failed for ${table}: ${error.message}. Falling back to individual inserts.`);
        
        for (const record of sanitized) {
          const { error: recErr } = await supabase.from(table).upsert([record], {
            onConflict: PRIMARY_KEYS[table]
          });
          
          if (!recErr) continue;
          
          // Auto-fix: strip invalid FK references and retry
          if (recErr.message.includes('foreign key constraint')) {
            if (table === 'products') record.vendor_id = null;
            if (table === 'stock_logs') { record.vendor_id = null; record.product_id = null; }
            if (table === 'sale_items') { record.product_id = null; }
            if (table === 'sales') { record.customer_id = null; }
            if (table === 'customer_transactions') { record.customer_id = null; }
            
            const { error: retry } = await supabase.from(table).upsert([record], {
              onConflict: PRIMARY_KEYS[table]
            });
            if (!retry) continue;
          }
          
          syncErrors.push(`Push(${table}): ${recErr.message}`);
        }
      } catch (err: any) {
        syncErrors.push(`Push read(${table}): ${err.message || 'Unknown'}`);
      }
    }

    // ═══════════════════════════════════════════════════════
    // 2. PULL LOGIC (Supabase → Local)
    // Suppress db-mutation events to prevent infinite sync loops
    // ═══════════════════════════════════════════════════════
    setSyncEventsSuppressed(true);
    
    try {
      for (const table of PULL_ORDER) {
        try {
          // Fetch remote changes since last sync
          const { data: remoteChanges, error } = await supabase
            .from(table)
            .select('*')
            .gt('updated_at', lastSynced);

          if (error) {
            syncErrors.push(`Pull(${table}): ${error.message}`);
            continue;
          }

          if (!remoteChanges || remoteChanges.length === 0) continue;
          
          console.log(`[Sync] Pulling ${remoteChanges.length} records for ${table}`);
          
          // Filter to only columns that exist in local PGlite schema
          const knownCols = LOCAL_COLUMNS[table];
          if (!knownCols) continue;
          
          const pk = PRIMARY_KEYS[table];
          
          // Process in chunks of 50 for performance
          const CHUNK_SIZE = 50;
          for (let i = 0; i < remoteChanges.length; i += CHUNK_SIZE) {
            const chunk = remoteChanges.slice(i, i + CHUNK_SIZE);
            
            // Filter each record to only known columns
            const filteredChunk = chunk.map(record => {
              const filtered: Record<string, any> = {};
              for (const col of knownCols) {
                if (col in record) {
                  filtered[col] = record[col];
                }
              }
              return filtered;
            });
            
            const columns = knownCols.filter(col => col in filteredChunk[0]);
            
            const allValues: any[] = [];
            const valueStrings = filteredChunk.map((record, rowIndex) => {
              const startIdx = rowIndex * columns.length + 1;
              const placeholders = columns.map((_, colIdx) => `$${startIdx + colIdx}`).join(', ');
              for (const col of columns) {
                allValues.push(record[col] ?? null);
              }
              return `(${placeholders})`;
            });
            
            const setClause = columns
              .filter(col => col !== pk)
              .map(col => `${col} = EXCLUDED.${col}`)
              .join(', ');
            
            const sql = `
              INSERT INTO ${table} (${columns.join(', ')})
              VALUES ${valueStrings.join(', ')}
              ON CONFLICT (${pk}) 
              DO UPDATE SET ${setClause}
            `;
            
            try {
              await query(sql, allValues, false);
            } catch (err: any) {
              // If batch fails, try one-by-one (slower but resilient)
              console.warn(`[Sync] Batch pull insert failed for ${table}, trying individually:`, err.message);
              for (const record of filteredChunk) {
                const cols = Object.keys(record);
                const vals = Object.values(record);
                const ph = cols.map((_, idx) => `$${idx + 1}`).join(', ');
                const sc = cols.filter(c => c !== pk).map(c => `${c} = EXCLUDED.${c}`).join(', ');
                try {
                  await query(
                    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph}) ON CONFLICT (${pk}) DO UPDATE SET ${sc}`,
                    vals,
                    false
                  );
                } catch (innerErr: any) {
                  // Silently skip individual record failures (orphaned FKs, etc.)
                  console.warn(`[Sync] Skipped pull record for ${table}:`, innerErr.message);
                }
              }
            }
          }
        } catch (err: any) {
          syncErrors.push(`Pull read(${table}): ${err.message || 'Unknown'}`);
        }
      }
    } finally {
      setSyncEventsSuppressed(false);
    }

    // ═══════════════════════════════════════════════════════
    // 3. UPDATE TIMESTAMP
    // Always advance the timestamp, even with some errors, to prevent
    // re-syncing the entire history every time. Only block on critical failures.
    // ═══════════════════════════════════════════════════════
    localStorage.setItem('last_synced_timestamp', syncStartTime);
    
    if (syncErrors.length > 0) {
      console.warn(`[Sync] Completed with ${syncErrors.length} non-critical errors:`, syncErrors);
      // Only throw if the majority of tables failed (critical failure)
      if (syncErrors.length > PUSH_ORDER.length) {
        throw new Error(syncErrors.slice(0, 5).join(' | '));
      }
    } else {
      console.log('[Sync] Background sync completed successfully.');
    }
  } catch (error) {
    console.error('[Sync] Sync process failed:', error);
    throw error;
  } finally {
    _isSyncing = false;
  }
}
