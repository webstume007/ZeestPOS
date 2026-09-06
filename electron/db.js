const { app } = require('electron');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

let db;

async function initDB() {
  const dbPath = path.join(app.getPath('userData'), 'zeestpos-db');
  console.log('Initializing local PGlite database at:', dbPath);
  
  // Initialize PGlite with persistent local filesystem storage
  db = new PGlite(dbPath);
  
  // Wait for the DB to be ready
  await db.waitReady;
  
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY,
        name_en TEXT,
        name_ur TEXT,
        category TEXT,
        buy_price NUMERIC,
        buy_time TIMESTAMP,
        current_stock INTEGER,
        retail_price NUMERIC,
        wholesale_shopkeeper_price NUMERIC,
        wholesale_customer_price NUMERIC,
        is_deleted BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY,
        full_name TEXT,
        whatsapp_number TEXT,
        address TEXT,
        customer_type TEXT DEFAULT 'Regular',
        total_credit_balance NUMERIC DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sales (
        invoice_id UUID PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        customer_id UUID REFERENCES customers(id) NULL,
        cashier_id TEXT,
        total_amount NUMERIC,
        amount_paid NUMERIC,
        payment_status TEXT
    );

    CREATE TABLE IF NOT EXISTS sale_items (
        id UUID PRIMARY KEY,
        invoice_id UUID REFERENCES sales(invoice_id),
        product_id UUID REFERENCES products(id),
        quantity INTEGER,
        price_applied NUMERIC
    );

    CREATE TABLE IF NOT EXISTS cash_register (
        shift_id UUID REFERENCES shifts(id),
        cashier_id UUID REFERENCES users(id),
        cash_in NUMERIC(10, 2) DEFAULT 0,
        cash_out NUMERIC(10, 2) DEFAULT 0,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        reason TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  await db.exec(schemaSQL);
  console.log('Database schema verified/created successfully.');

  // Add updated_at columns and triggers if they don't exist
  const tables = ['products', 'customers', 'sales', 'sale_items', 'cash_register'];
    
  for (const table of tables) {
    try {
      await db.exec(`ALTER TABLE ${table} ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();`);
    } catch (e) {
      // Ignore column exists error
    }
  }

  // Add newly added column to web fallback dynamically just in case
  try {
    await db.exec(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'Regular';`);
    await db.exec(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;`);
  } catch (e) {}

  // PGlite trigger creation
  await db.exec(`
    CREATE OR REPLACE FUNCTION trigger_set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  for (const table of tables) {
    await db.exec(`
      DROP TRIGGER IF EXISTS set_updated_at ON ${table};
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON ${table}
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_updated_at();
    `);
  }

  // Dummy insert on boot as requested to test persistence
  try {
    const { rows } = await db.query('SELECT COUNT(*) as count FROM products');
    if (rows[0].count === 0) {
      const res = await db.query(`
        INSERT INTO products (id, name_en, name_ur, category, buy_price, current_stock, retail_price) 
        VALUES (gen_random_uuid(), 'Test Product', 'ٹیسٹ پروڈکٹ', 'General', 10.0, 100, 15.0)
        RETURNING *;
      `);
      console.log('Test product inserted on boot:', res.rows[0]);
    }
  } catch (error) {
    console.error('Error inserting dummy product:', error);
  }
}

async function queryDB(sql, params) {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db.query(sql, params);
}

module.exports = {
  initDB,
  queryDB,
};
