// Define interfaces for DB models
export interface Product {
    id: string;
    name_en: string | null;
    name_ur: string | null;
    category: string | null;
    buy_price: number | null;
    buy_time: string | null;
    current_stock: number | null;
    retail_price: number | null;
    wholesale_shopkeeper_price: number | null;
    wholesale_customer_price: number | null;
}

export interface Customer {
    id: string;
    full_name: string | null;
    whatsapp_number: string | null;
    address: string | null;
    total_credit_balance: number | null;
    customer_type: string | null;
}

export interface Sale {
    invoice_id: string;
    timestamp: string;
    customer_id: string | null;
    cashier_id: string | null;
    total_amount: number;
    amount_paid: number;
    payment_status: string;
}

export interface SaleItem {
    id: string;
    invoice_id: string;
    product_id: string;
    quantity: number;
    price_applied: number;
}

export interface CashTransaction {
    shift_id: string;
    cashier_id: string;
    cash_in: number;
    cash_out: number;
    timestamp: string;
    reason: string;
}

export interface User {
    id: string;
    username: string;
    cnic: string;
    role: string;
}

export async function getUsers(): Promise<User[]> {
    return await query<User>("SELECT * FROM users ORDER BY username ASC");
}

export async function authenticateUser(username: string, cnic: string): Promise<User | null> {
    const users = await query<User>("SELECT * FROM users WHERE username = $1 AND cnic = $2", [username, cnic]);
    return users.length > 0 ? users[0] : null;
}

// Global augmentation for the Electron API bridge
declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>;
      dbQuery: (sql: string, params?: any[]) => Promise<any>;
    };
  }
}

let browserDb: any = null;

// Generic query wrapper
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  // 1. Desktop Mode (Electron IPC)
  if (typeof window !== 'undefined' && window.electronAPI) {
    const result = await window.electronAPI.dbQuery(sql, params);
    return result.rows as T[];
  }
  
  // 2. Web Browser Fallback Mode (for UI Testing)
  if (typeof window !== 'undefined' && !window.electronAPI) {
    if (!browserDb) {
      console.warn("⚠️ ELECTRON API NOT FOUND: Booting local PGlite fallback for Web Browser testing...");
      try {
        const { PGlite } = await import('@electric-sql/pglite');
        browserDb = new PGlite('idb://zeestpos-browser-db');
      } catch (e: any) {
        console.error("Failed to load PGlite", e);
        if (typeof window !== 'undefined') alert(`PGlite Import Error: ${e.message}`);
        throw e;
      }
      
      // Initialize schema for web fallback
      await browserDb.exec(`
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
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS customers (
          id UUID PRIMARY KEY,
          full_name TEXT,
          whatsapp_number TEXT,
          address TEXT,
          customer_type TEXT DEFAULT 'Regular',
          total_credit_balance NUMERIC DEFAULT 0,
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS sales (
          invoice_id UUID PRIMARY KEY,
          customer_id UUID REFERENCES customers(id),
          cashier_id TEXT,
          total_amount NUMERIC,
          amount_paid NUMERIC,
          payment_status TEXT,
          timestamp TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS sale_items (
          id UUID PRIMARY KEY,
          invoice_id UUID REFERENCES sales(invoice_id),
          product_id UUID REFERENCES products(id),
          quantity INTEGER,
          price_applied NUMERIC,
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS cash_register (
          shift_id TEXT,
          cashier_id TEXT,
          cash_in NUMERIC DEFAULT 0,
          cash_out NUMERIC DEFAULT 0,
          timestamp TIMESTAMP DEFAULT NOW(),
          reason TEXT,
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          username TEXT,
          cnic TEXT UNIQUE,
          role TEXT DEFAULT 'Cashier',
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Add newly added column to web fallback dynamically just in case
      try {
        await browserDb.exec(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'Regular';`);
        await browserDb.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT NOW());`);
        await browserDb.exec(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, username TEXT, cnic TEXT UNIQUE, role TEXT DEFAULT 'Cashier', updated_at TIMESTAMP DEFAULT NOW());`);
      } catch (e: any) {
        console.error("Failed to initialize browser DB", e);
        if (typeof window !== 'undefined') alert(`DB Boot Error: ${e.message}`);
        throw e;
      }
    }
    
    // Execute query on the browser fallback DB
    try {
      const result = await browserDb.query(sql, params);
      return result.rows as T[];
    } catch (e: any) {
      console.error("Browser DB Query Error:", e);
      if (typeof window !== 'undefined') alert(`DB Query Error: ${e.message}`);
      throw e;
    }
  }

  // 3. Fallback if something went wrong
  console.error("Database connection not available.");
  if (typeof window !== 'undefined') alert("Database connection not available.");
  throw new Error('Database access is not available in this environment.');
}

// Product CRUD
export async function getProducts(): Promise<Product[]> {
    return await query<Product>('SELECT * FROM products ORDER BY name_en ASC');
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const sql = `
        INSERT INTO products (
            id, name_en, name_ur, category, buy_price, buy_time, current_stock,
            retail_price, wholesale_shopkeeper_price, wholesale_customer_price
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING *
    `;
    const params = [
        product.name_en, product.name_ur, product.category, product.buy_price,
        product.buy_time, product.current_stock, product.retail_price,
        product.wholesale_shopkeeper_price, product.wholesale_customer_price
    ];
    const rows = await query<Product>(sql, params);
    return rows[0];
}

// Customer CRUD
export async function updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const setKeys = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(product)) {
        if (key !== 'id') {
            setKeys.push(`${key} = $${paramIndex}`);
            params.push(value);
            paramIndex++;
        }
    }

    params.push(id);
    const sql = `
        UPDATE products 
        SET ${setKeys.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
    `;
    
    const rows = await query<Product>(sql, params);
    return rows[0];
}

export async function deleteProduct(id: string): Promise<void> {
    await query('DELETE FROM products WHERE id = $1', [id]);
}

export async function getCustomers(): Promise<Customer[]> {
    return await query<Customer>('SELECT * FROM customers ORDER BY full_name ASC');
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'total_credit_balance'>): Promise<Customer> {
    const sql = `
        INSERT INTO customers (
            id, full_name, whatsapp_number, address, customer_type
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4
        ) RETURNING *
    `;
    const params = [
        customer.full_name, customer.whatsapp_number, customer.address, customer.customer_type || 'Regular'
    ];
    const rows = await query<Customer>(sql, params);
    return rows[0];
}

export async function getCustomer(id: string): Promise<Customer> {
    const rows = await query<Customer>('SELECT * FROM customers WHERE id = $1', [id]);
    return rows[0];
}

export async function getCustomerSales(customerId: string): Promise<Sale[]> {
    return await query<Sale>('SELECT * FROM sales WHERE customer_id = $1 ORDER BY timestamp DESC', [customerId]);
}

export async function receiveKhataPayment(
    customerId: string, 
    amount: number, 
    customerName: string,
    shiftId: string,
    cashierId: string
): Promise<void> {
    // 1. Update customer credit balance
    await query(`
        UPDATE customers 
        SET total_credit_balance = COALESCE(total_credit_balance, 0) - $1 
        WHERE id = $2
    `, [amount, customerId]);

    // 2. Insert into cash_register
    await query(`
        INSERT INTO cash_register (shift_id, cashier_id, cash_in, cash_out, reason)
        VALUES ($1, $2, $3, 0, $4)
    `, [shiftId, cashierId, amount, `Khata Payment - ${customerName}`]);
}

export async function processCheckout(
    sale: Omit<Sale, 'timestamp'>, 
    items: Omit<SaleItem, 'id' | 'invoice_id'>[],
    shiftId: string,
    creditUpdate?: { customerId: string, amountToAdd: number }
): Promise<void> {
    // Insert Sale
    const saleSql = `
        INSERT INTO sales (invoice_id, customer_id, cashier_id, total_amount, amount_paid, payment_status)
        VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await query(saleSql, [
        sale.invoice_id, sale.customer_id, sale.cashier_id, 
        sale.total_amount, sale.amount_paid, sale.payment_status
    ]);

    // Insert Items
    for (const item of items) {
        const itemSql = `
            INSERT INTO sale_items (id, invoice_id, product_id, quantity, price_applied)
            VALUES (gen_random_uuid(), $1, $2, $3, $4)
        `;
        await query(itemSql, [sale.invoice_id, item.product_id, item.quantity, item.price_applied]);
        
        // Update product stock
        await query(`UPDATE products SET current_stock = current_stock - $1 WHERE id = $2`, [item.quantity, item.product_id]);
    }

    // Update Customer Credit if applicable
    if (creditUpdate && creditUpdate.amountToAdd > 0) {
        await query(`
            UPDATE customers 
            SET total_credit_balance = COALESCE(total_credit_balance, 0) + $1 
            WHERE id = $2
        `, [creditUpdate.amountToAdd, creditUpdate.customerId]);
    }

    // Insert Cash Register log if money was paid
    if (sale.amount_paid > 0 && shiftId) {
        await query(`
            INSERT INTO cash_register (shift_id, cashier_id, cash_in, cash_out, reason)
            VALUES ($1, $2, $3, 0, $4)
        `, [shiftId, sale.cashier_id, sale.amount_paid, `Sale Invoice: ${sale.invoice_id}`]);
    }
}

export async function getShiftTransactions(shiftId: string): Promise<CashTransaction[]> {
    return await query<CashTransaction>('SELECT * FROM cash_register WHERE shift_id = $1 ORDER BY timestamp DESC', [shiftId]);
}

export async function addCashTransaction(
    shiftId: string, 
    cashierId: string, 
    cashIn: number, 
    cashOut: number, 
    reason: string
): Promise<void> {
    await query(`
        INSERT INTO cash_register (shift_id, cashier_id, cash_in, cash_out, reason)
        VALUES ($1, $2, $3, $4, $5)
    `, [shiftId, cashierId, cashIn, cashOut, reason]);
}

// Settings CRUD
export async function getSetting(key: string, defaultValue: string = ""): Promise<string> {
    const sql = `SELECT value FROM settings WHERE key = $1`;
    const rows = await query<{ value: string }>(sql, [key]);
    return rows.length > 0 ? rows[0].value : defaultValue;
}

export async function updateSetting(key: string, value: string): Promise<void> {
    const sql = `
        INSERT INTO settings (key, value) 
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
    await query(sql, [key, value]);
}

export async function getSales(): Promise<Sale[]> {
    const sql = "SELECT * FROM sales ORDER BY timestamp DESC";
    return await query<Sale>(sql);
}
