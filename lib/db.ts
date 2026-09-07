// Define interfaces for DB models
export interface Product {
    id: string;
    name_en: string | null;
    name_ur: string | null;
    category: string | null;
    unit?: string | null;
    buy_price: number | null;
    buy_time: string | null;
    current_stock: number | null;
    retail_price: number | null;
    wholesale_shopkeeper_price: number | null;
    is_deleted?: boolean | null;
    vendor_id?: string | null;
}

export interface Vendor {
    id: string;
    name: string;
    representative_name: string | null;
    contact: string | null;
    address: string | null;
}

export interface StockLog {
    id: string;
    product_id: string;
    vendor_id: string;
    quantity_added: number;
    buy_price: number;
    timestamp: string;
    product_name?: string;
    vendor_name?: string;
}

export interface Customer {
    id: string;
    full_name: string | null;
    whatsapp_number: string | null;
    address: string | null;
    total_credit_balance: number | null;
    customer_type: string | null;
}

export interface CustomerTransaction {
    id: string;
    customer_id: string;
    type: 'payment' | 'loan' | 'sale_credit';
    amount: number;
    balance_after: number;
    description: string;
    created_by: string;
    timestamp: string;
}

export interface Sale {
    invoice_id: string;
    timestamp: string;
    customer_id: string | null;
    cashier_id: string | null;
    total_amount: number;
    amount_paid: number;
    payment_status: string;
    customer_name?: string | null;
    discount_amount?: number;
    invoice_number?: string | null;
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
    pin: string;
    role: string;
}

export interface DashboardStats {
    todaySales: number;
    todayProfit: number;
    availableStockSum: number;
    inventoryValuation: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const salesRes = await query<{ total_sales: number }>(`
        SELECT COALESCE(SUM(total_amount), 0) as total_sales
        FROM sales 
        WHERE DATE(timestamp) = CURRENT_DATE
    `);
    
    const profitRes = await query<{ profit: number }>(`
        SELECT COALESCE(SUM((si.price_applied - p.buy_price) * si.quantity), 0) as profit
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.invoice_id = s.invoice_id
        WHERE DATE(s.timestamp) = CURRENT_DATE
    `);

    const stockRes = await query<{ total_stock: number, inventory_value: number }>(`
        SELECT 
            COALESCE(SUM(current_stock), 0) as total_stock,
            COALESCE(SUM(current_stock * buy_price), 0) as inventory_value
        FROM products
        WHERE current_stock > 0 AND is_deleted IS NOT TRUE
    `);

    const discountRes = await query<{ discount: number }>(`
        SELECT COALESCE(SUM(discount_amount), 0) as discount
        FROM sales
        WHERE DATE(timestamp) = CURRENT_DATE
    `);

    return {
        todaySales: Number(salesRes[0]?.total_sales || 0),
        todayProfit: Number(profitRes[0]?.profit || 0) - Number(discountRes[0]?.discount || 0),
        availableStockSum: Number(stockRes[0]?.total_stock || 0),
        inventoryValuation: Number(stockRes[0]?.inventory_value || 0)
    };
}

export async function getUsers(): Promise<User[]> {
    return await query<User>("SELECT * FROM users ORDER BY username ASC");
}

export async function authenticateUser(username: string, pin: string): Promise<User | null> {
    const users = await query<User>("SELECT * FROM users WHERE username = $1 AND pin = $2", [username, pin]);
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
          is_deleted BOOLEAN DEFAULT FALSE,
          vendor_id UUID,
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS vendors (
          id UUID PRIMARY KEY,
          name TEXT,
          representative_name TEXT,
          contact TEXT,
          address TEXT,
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
          customer_name TEXT,
          discount_amount NUMERIC DEFAULT 0,
          invoice_number TEXT,
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
          pin TEXT DEFAULT '0000',
          role TEXT DEFAULT 'Cashier',
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Add newly added column to web fallback dynamically just in case
      try {
        await browserDb.exec(`
          CREATE TABLE IF NOT EXISTS vendors (
            id UUID PRIMARY KEY,
            name TEXT,
            representative_name TEXT,
            contact TEXT,
            address TEXT,
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);
        await browserDb.exec(`ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_id UUID;`);
        await browserDb.exec(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name TEXT;`);
        await browserDb.exec(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;`);
        await browserDb.exec(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_number TEXT;`);
        await browserDb.exec(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'Regular';`);
        await browserDb.exec(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;`);
        await browserDb.exec(`ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT;`);
        await browserDb.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT NOW());`);
        await browserDb.exec(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, username TEXT, cnic TEXT UNIQUE, pin TEXT DEFAULT '0000', role TEXT DEFAULT 'Cashier', updated_at TIMESTAMP DEFAULT NOW());`);
        await browserDb.exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pin TEXT DEFAULT '0000';`);
        await browserDb.exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Cashier';`);
        await browserDb.exec(`UPDATE users SET pin = '0000' WHERE pin IS NULL;`);
        await browserDb.exec(`
          INSERT INTO users (id, username, cnic, pin, role)
          VALUES ('46c2226c-1086-4c31-88bb-daf23d830452', 'Mohsin', '3120352438849', '0000', 'Admin')
          ON CONFLICT (id) DO NOTHING;
        `);
        await browserDb.exec(`
          CREATE TABLE IF NOT EXISTS stock_logs (
            id UUID PRIMARY KEY,
            product_id UUID REFERENCES products(id),
            vendor_id UUID REFERENCES vendors(id),
            quantity_added INTEGER,
            buy_price NUMERIC,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
          );
          CREATE TABLE IF NOT EXISTS customer_transactions (
            id UUID PRIMARY KEY,
            customer_id UUID REFERENCES customers(id),
            type TEXT,
            amount NUMERIC,
            balance_after NUMERIC,
            description TEXT,
            created_by TEXT,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
          );
        `);
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

import { getCache, setCache, clearCache } from "./cache";

// Product CRUD
export async function getProducts(): Promise<Product[]> {
    const cached = getCache<Product[]>('all_products');
    if (cached) return cached;
    
    const products = await query<Product>('SELECT * FROM products WHERE is_deleted IS NOT TRUE ORDER BY name_en ASC');
    setCache('all_products', products);
    return products;
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const sql = `
        INSERT INTO products (
            id, name_en, name_ur, category, unit, buy_price, buy_time, current_stock,
            retail_price, wholesale_shopkeeper_price, vendor_id
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) RETURNING *
    `;
    const params = [
        product.name_en, product.name_ur, product.category, product.unit || null, product.buy_price,
        product.buy_time, product.current_stock, product.retail_price,
        product.wholesale_shopkeeper_price, product.vendor_id || null
    ];
    const rows = await query<Product>(sql, params);
    clearCache('all_products');
    return rows[0];
}

// Vendor CRUD
export async function getVendors(): Promise<Vendor[]> {
    return await query<Vendor>('SELECT * FROM vendors ORDER BY name ASC');
}

export async function createVendor(vendor: Omit<Vendor, 'id'>): Promise<Vendor> {
    const sql = `
        INSERT INTO vendors (
            id, name, representative_name, contact, address
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4
        ) RETURNING *
    `;
    const params = [
        vendor.name, vendor.representative_name, vendor.contact, vendor.address
    ];
    const rows = await query<Vendor>(sql, params);
    return rows[0];
}

export async function addStockLog(productId: string, vendorId: string, quantity: number, buyPrice: number): Promise<void> {
    const sql = `
        INSERT INTO stock_logs (id, product_id, vendor_id, quantity_added, buy_price)
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
    `;
    await query(sql, [productId, vendorId, quantity, buyPrice]);
    
    // Also update product's buy_price and stock
    await query(`
        UPDATE products 
        SET current_stock = COALESCE(current_stock, 0) + $1, 
            buy_price = $2, 
            vendor_id = $3,
            updated_at = NOW()
        WHERE id = $4
    `, [quantity, buyPrice, vendorId, productId]);
    
    clearCache('all_products');
}

export async function getVendorStockHistory(vendorId: string): Promise<StockLog[]> {
    return await query<StockLog>(`
        SELECT s.*, p.name_en as product_name, v.name as vendor_name 
        FROM stock_logs s
        JOIN products p ON s.product_id = p.id
        JOIN vendors v ON s.vendor_id = v.id
        WHERE s.vendor_id = $1
        ORDER BY s.timestamp DESC
    `, [vendorId]);
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
    clearCache('all_products');
    return rows[0];
}

export async function deleteProduct(id: string): Promise<void> {
    await query('UPDATE products SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1', [id]);
    clearCache('all_products');
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

export async function getCustomerTransactions(customerId: string): Promise<CustomerTransaction[]> {
    return await query<CustomerTransaction>(`
        SELECT * FROM customer_transactions 
        WHERE customer_id = $1 
        ORDER BY timestamp DESC
    `, [customerId]);
}

export async function getProductStockLogs(productId: string): Promise<StockLog[]> {
    return await query<StockLog>(`
        SELECT s.*, p.name_en as product_name, v.name as vendor_name 
        FROM stock_logs s
        JOIN products p ON s.product_id = p.id
        LEFT JOIN vendors v ON s.vendor_id = v.id
        WHERE s.product_id = $1
        ORDER BY s.timestamp DESC
    `, [productId]);
}

export async function receiveKhataPayment(
    customerId: string, 
    amount: number, 
    customerName: string,
    shiftId: string,
    cashierId: string,
    createdBy: string = "Admin"
): Promise<void> {
    // 1. Update customer credit balance
    const updated = await query<Customer>(`
        UPDATE customers 
        SET total_credit_balance = COALESCE(total_credit_balance, 0) - $1 
        WHERE id = $2
        RETURNING *
    `, [amount, customerId]);

    const newBalance = Number(updated[0]?.total_credit_balance || 0);

    // 2. Insert into customer_transactions log
    await query(`
        INSERT INTO customer_transactions (id, customer_id, type, amount, balance_after, description, created_by, timestamp)
        VALUES (gen_random_uuid(), $1, 'payment', $2, $3, $4, $5, NOW())
    `, [customerId, amount, newBalance, `Cash payment received - ${customerName}`, createdBy]);

    // 3. Insert into cash_register
    await query(`
        INSERT INTO cash_register (shift_id, cashier_id, cash_in, cash_out, reason)
        VALUES ($1, $2, $3, 0, $4)
    `, [shiftId, cashierId, amount, `Khata Payment - ${customerName}`]);
}

export async function giveKhataLoan(
    customerId: string, 
    amount: number, 
    customerName: string,
    shiftId: string,
    cashierId: string,
    createdBy: string = "Admin"
): Promise<void> {
    // 1. Update customer credit balance (increase)
    const updated = await query<Customer>(`
        UPDATE customers 
        SET total_credit_balance = COALESCE(total_credit_balance, 0) + $1 
        WHERE id = $2
        RETURNING *
    `, [amount, customerId]);

    const newBalance = Number(updated[0]?.total_credit_balance || 0);

    // 2. Insert into customer_transactions log
    await query(`
        INSERT INTO customer_transactions (id, customer_id, type, amount, balance_after, description, created_by, timestamp)
        VALUES (gen_random_uuid(), $1, 'loan', $2, $3, $4, $5, NOW())
    `, [customerId, amount, newBalance, `Credit loan given - ${customerName}`, createdBy]);

    // 3. Insert into cash_register (cash out)
    await query(`
        INSERT INTO cash_register (shift_id, cashier_id, cash_in, cash_out, reason)
        VALUES ($1, $2, 0, $3, $4)
    `, [shiftId, cashierId, amount, `Khata Loan given - ${customerName}`]);
}

export async function processCheckout(
    sale: Omit<Sale, 'timestamp'>, 
    items: Omit<SaleItem, 'id' | 'invoice_id'>[],
    shiftId: string,
    creditUpdate?: { customerId: string, amountToAdd: number }
): Promise<void> {
    // Insert Sale
    const saleSql = `
        INSERT INTO sales (invoice_id, customer_id, cashier_id, total_amount, amount_paid, payment_status, customer_name, discount_amount, invoice_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    await query(saleSql, [
        sale.invoice_id, sale.customer_id, sale.cashier_id, 
        sale.total_amount, sale.amount_paid, sale.payment_status,
        sale.customer_name || null, sale.discount_amount || 0, sale.invoice_number || null
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
        const updated = await query<Customer>(`
            UPDATE customers 
            SET total_credit_balance = COALESCE(total_credit_balance, 0) + $1 
            WHERE id = $2
            RETURNING *
        `, [creditUpdate.amountToAdd, creditUpdate.customerId]);

        const newBalance = Number(updated[0]?.total_credit_balance || 0);
        const cashierName = (typeof window !== 'undefined' ? localStorage.getItem("cashierName") : null) || sale.cashier_id || "Cashier";

        await query(`
            INSERT INTO customer_transactions (id, customer_id, type, amount, balance_after, description, created_by, timestamp)
            VALUES (gen_random_uuid(), $1, 'sale_credit', $2, $3, $4, $5, NOW())
        `, [
            creditUpdate.customerId, 
            creditUpdate.amountToAdd, 
            newBalance, 
            `Added to Khata on invoice #${sale.invoice_number || sale.invoice_id.split('-')[0]}`, 
            cashierName
        ]);
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
    const sql = `
        SELECT s.*, COALESCE(c.full_name, s.customer_name) as customer_name 
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id 
        ORDER BY s.timestamp DESC
    `;
    return await query<Sale>(sql);
}
