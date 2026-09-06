import { supabase } from './supabase';
import { query } from './db';

const TABLES = ['products', 'customers', 'sales', 'sale_items', 'cash_register', 'users', 'vendors'];

export async function syncDatabase(): Promise<void> {
  console.log('[Sync] Starting background sync...');
  
  // Get last synced timestamp from local storage (or default to epoch if never synced)
  const lastSynced = localStorage.getItem('last_synced_timestamp') || '1970-01-01T00:00:00.000Z';
  const syncStartTime = new Date().toISOString();

  let hasErrors = false;

  try {
    // 1. PUSH LOGIC (Local -> Remote)
    for (const table of TABLES) {
      try {
        // Fetch local records modified since last sync
        const localChanges = await query(`SELECT * FROM ${table} WHERE updated_at > $1`, [lastSynced]);
        
        if (localChanges.length > 0) {
          console.log(`[Sync] Pushing ${localChanges.length} records for ${table} to Supabase`);
          const { error } = await supabase.from(table).upsert(localChanges);
          if (error) {
            console.error(`[Sync] Supabase push error for ${table}:`, error);
            hasErrors = true;
          }
        }
      } catch (err) {
        console.error(`[Sync] Local read error for ${table}:`, err);
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
            // Note: sales and cash_register don't have typical primary keys if not specified, 
            // wait, we should assume they all have 'id' or we need custom conflict resolution.
            // Let's use a dynamic approach based on primary keys. 
            // In our schema: products(id), customers(id), sales(invoice_id), sale_items(id), cash_register doesn't have an ID?
            
            let primaryKey = 'id';
            if (table === 'sales') primaryKey = 'invoice_id';
            
            let finalSql = '';
            if (table === 'cash_register') {
               // no PK in cash_register from previous schema, let's just insert if not exists based on timestamp/shift
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
               await query(finalSql, values);
            } catch (err) {
               // Ignore cash_register duplicates if we can't upsert
               if (table !== 'cash_register') console.error(`[Sync] Local upsert error for ${table}:`, err);
            }
          }
        }
      } catch (err) {
        console.error(`[Sync] Remote read error for ${table}:`, err);
        hasErrors = true;
      }
    }

    // Only update the last synced timestamp if no errors occurred
    if (!hasErrors) {
      localStorage.setItem('last_synced_timestamp', syncStartTime);
      console.log('[Sync] Background sync completed successfully.');
    } else {
      console.warn('[Sync] Background sync completed with some errors. Will retry next cycle.');
      throw new Error("Sync completed with errors");
    }
  } catch (error) {
    console.error('[Sync] Sync process failed:', error);
    throw error;
  }
}
