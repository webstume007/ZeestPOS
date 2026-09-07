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
          // Fix invalid uuid for cash_register
          if (table === 'cash_register') {
            for (const record of localChanges) {
              if (record.shift_id === 'no-shift') {
                record.shift_id = null;
              }
            }
          }
          
          console.log(`[Sync] Pushing ${localChanges.length} records for ${table} to Supabase`);
          const { error } = await supabase.from(table).upsert(localChanges);
          if (error) {
            console.error(`[Sync] Supabase push error for ${table}:`, error);
            syncErrors.push(`Push error (${table}): ${error.message || JSON.stringify(error)}`);
            hasErrors = true;
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
          
          for (const record of remoteChanges) {
            const columns = Object.keys(record);
            const values = Object.values(record);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            const setClause = columns.map((col, i) => `${col} = EXCLUDED.${col}`).join(', ');
            
            // Upsert into local PGlite
            const sql = `
              INSERT INTO ${table} (${columns.join(', ')})
              VALUES (${placeholders})
              ON CONFLICT (id) 
              ${table === 'sales' || table === 'cash_register' ? 'DO NOTHING' : `DO UPDATE SET ${setClause}`}
            `;
            
            let primaryKey = 'id';
            if (table === 'sales') primaryKey = 'invoice_id';
            
            let finalSql = '';
            if (table === 'cash_register') {
               finalSql = `
                 INSERT INTO ${table} (${columns.join(', ')})
                 VALUES (${placeholders})
               `;
            } else {
               finalSql = `
                INSERT INTO ${table} (${columns.join(', ')})
                VALUES (${placeholders})
                ON CONFLICT (${primaryKey}) 
                DO UPDATE SET ${setClause}
              `;
            }
            
            try {
               await query(finalSql, values, false);
            } catch (err: any) {
               if (table !== 'cash_register') {
                 console.error(`[Sync] Local upsert error for ${table}:`, err);
                 // We don't necessarily fail the whole sync for one record, but we can log it.
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
