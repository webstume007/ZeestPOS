import { supabase } from './supabase';
import { query } from './db';

const TABLES = [
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

export async function syncDatabase(): Promise<void> {
  console.log('[Sync] Starting background sync...');
  
  // Get last synced timestamp from local storage (or default to epoch if never synced)
  const lastSynced = localStorage.getItem('last_synced_timestamp') || '1970-01-01T00:00:00.000Z';
  const syncStartTime = new Date().toISOString();

  let hasErrors = false;
  let syncErrors: string[] = [];

  try {
    // 1. PUSH LOGIC (Local -> Remote)
    for (const table of TABLES) {
      try {
        // Fetch local records modified since last sync
        const localChanges = await query(`SELECT * FROM ${table} WHERE updated_at > $1 OR updated_at IS NULL`, [lastSynced], false);
        
        if (localChanges.length > 0) {
          // Fix invalid uuid for cash_register (must be valid UUID due to NOT NULL constraint)
          // Also forcefully update the updated_at timestamp to syncStartTime so Supabase registers it as a NEW change
          // This guarantees it will be pulled by other devices that might have a slightly older lastSynced time
          if (table === 'cash_register') {
            for (const record of localChanges) {
              record.updated_at = syncStartTime;
              if (record.shift_id === 'no-shift' || record.shift_id === null) {
                record.shift_id = '00000000-0000-0000-0000-000000000000';
              }
            }
          } else {
            for (const record of localChanges) {
              record.updated_at = syncStartTime;
            }
          }
          
          console.log(`[Sync] Pushing ${localChanges.length} records for ${table} to Supabase`);
          const { error } = await supabase.from(table).upsert(localChanges);
          
          if (error) {
            console.warn(`[Sync] Batch push failed for ${table}, falling back to individual inserts:`, error.message);
            // Fallback to individual upsert to prevent one bad record (poison pill) from failing the whole table
            let tableHasErrors = false;
            for (const record of localChanges) {
              const { error: recordError } = await supabase.from(table).upsert([record]);
              if (recordError) {
                // Auto-resolve foreign key errors for products referencing deleted vendors
                if (recordError.message.includes('foreign key constraint') && table === 'products') {
                   record.vendor_id = null; // Strip invalid vendor
                   const { error: retryError } = await supabase.from(table).upsert([record]);
                   if (!retryError) continue; // Resolved!
                }
                
                syncErrors.push(`Push error (${table}): ${recordError.message || JSON.stringify(recordError)}`);
                tableHasErrors = true;
              }
            }
            if (tableHasErrors) hasErrors = true;
          }
        }
      } catch (err: any) {
        console.error(`[Sync] Local read error for ${table}:`, err);
        syncErrors.push(`Local read error (${table}): ${err.message || 'Unknown error'}`);
        hasErrors = true;
      }
    }

    // 2. PULL LOGIC (Remote -> Local)
    for (const table of TABLES) {
      try {
        // Fetch remote records modified since last sync
        const { data: remoteChanges, error } = await supabase
          .from(table)
          .select('*')
          .gt('updated_at', lastSynced);

        if (error) {
          console.error(`[Sync] Supabase pull error for ${table}:`, error);
          syncErrors.push(`Pull error (${table}): ${error.message || JSON.stringify(error)}`);
          hasErrors = true;
          continue;
        }

        if (remoteChanges && remoteChanges.length > 0) {
          console.log(`[Sync] Pulling ${remoteChanges.length} records for ${table} from Supabase`);
          
          // Batch process records in chunks of 50 to maximize speed and avoid parameter limits
          const CHUNK_SIZE = 50;
          for (let i = 0; i < remoteChanges.length; i += CHUNK_SIZE) {
            const chunk = remoteChanges.slice(i, i + CHUNK_SIZE);
            // Use columns from the first record in the chunk
            const columns = Object.keys(chunk[0]);
            
            const allValues: any[] = [];
            const valueStrings = chunk.map((record, rowIndex) => {
              const recordValues = columns.map(col => record[col]);
              allValues.push(...recordValues);
              
              const startIdx = rowIndex * columns.length + 1;
              const placeholders = columns.map((_, colIdx) => `$${startIdx + colIdx}`).join(', ');
              return `(${placeholders})`;
            });
            
            const setClause = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');
            let primaryKey = 'id';
            if (table === 'sales') primaryKey = 'invoice_id';
            
            let finalSql = '';
            if (table === 'cash_register') {
               finalSql = `
                 INSERT INTO ${table} (${columns.join(', ')})
                 VALUES ${valueStrings.join(', ')}
               `;
            } else {
               finalSql = `
                INSERT INTO ${table} (${columns.join(', ')})
                VALUES ${valueStrings.join(', ')}
                ON CONFLICT (${primaryKey}) 
                DO UPDATE SET ${setClause}
              `;
            }
            
            try {
               await query(finalSql, allValues, false);
            } catch (err: any) {
               console.error(`[Sync] Local batch upsert error for ${table} at chunk ${i}:`, err);
               // If batch fails (e.g. missing column in local fallback db), log it but don't crash
               if (table !== 'cash_register') {
                 syncErrors.push(`Local batch upsert error (${table}): ${err.message}`);
                 hasErrors = true;
               }
            }
          }
        }
      } catch (err: any) {
        console.error(`[Sync] Remote read error for ${table}:`, err);
        syncErrors.push(`Remote read error (${table}): ${err.message || 'Unknown error'}`);
        hasErrors = true;
      }
    }

    // Only update the last synced timestamp if no errors occurred
    if (!hasErrors) {
      localStorage.setItem('last_synced_timestamp', syncStartTime);
      console.log('[Sync] Background sync completed successfully.');
    } else {
      console.warn('[Sync] Background sync completed with some errors. Will retry next cycle.');
      throw new Error(syncErrors.join(" | "));
    }
  } catch (error) {
    console.error('[Sync] Sync process failed:', error);
    throw error;
  }
}
