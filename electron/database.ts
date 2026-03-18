import Database from 'better-sqlite3';

export interface Category {
  id: number;
  name: string;
  image_path: string | null;
  country_code: string;
  state_code: string;
  cgst_rate: number;
  sgst_rate: number;
  created_at: string;
}

export interface Product {
  id: number;
  product_code: string;
  name: string;
  image_path: string | null;
  purchase_price: number;
  hsn_code: string;
  stock: number;
  category_id: number;
  low_stock_threshold: number;
  selling_price: number;
  mrp: number;
  gst_rate: number;
  created_at: string;
  updated_at: string;
  category_name?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone_number: string;
  total_purchases: number;
  created_at: string;
}

export interface OrderItem {
  product_id: number;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  subtotal: number;
  gst_amount: number;
  total: number;
}

export interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_id: number | null;
  purchase_date: string;
  total_amount: number;
  created_at: string;
  items?: OrderItem[];
}

export interface Tax {
  id: number;
  country_code: string;
  state_code: string;
  cgst_rate: number;
  sgst_rate: number;
  created_at: string;
}

export class DatabaseService {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        image_path TEXT,
        country_code TEXT NOT NULL DEFAULT 'IN',
        state_code TEXT NOT NULL DEFAULT '',
        cgst_rate REAL NOT NULL DEFAULT 0,
        sgst_rate REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        image_path TEXT,
        purchase_price REAL NOT NULL DEFAULT 0,
        hsn_code TEXT NOT NULL DEFAULT '',
        stock INTEGER NOT NULL DEFAULT 0,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        selling_price REAL NOT NULL DEFAULT 0,
        mrp REAL NOT NULL DEFAULT 0,
        gst_rate REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        total_purchases REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(phone_number)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        purchase_date TEXT NOT NULL,
        total_amount REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        gst_rate REAL NOT NULL DEFAULT 0,
        subtotal REAL NOT NULL,
        gst_amount REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

      CREATE TABLE IF NOT EXISTS store_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT ''
      );
      INSERT OR IGNORE INTO store_settings (key, value) VALUES
        ('name', 'VARALAKSHMI FANCY & GENERAL STORES'),
        ('address', '#34-05-27, Rajaji street, Kakinada'),
        ('phone', 'PH:0884-2364609'),
        ('gstin', '37AGLPG5663L1ZV'),
        ('fssai', '10119029000075');

      CREATE TABLE IF NOT EXISTS taxes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_code TEXT NOT NULL DEFAULT 'IN',
        state_code TEXT NOT NULL DEFAULT '',
        cgst_rate REAL NOT NULL DEFAULT 0,
        sgst_rate REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT OR IGNORE INTO categories (id, name, country_code, state_code) VALUES (1, 'Uncategorized', 'IN', '');
    `);

    this.runMigrations();
  }

  private runMigrations(): void {
    // Migration: remove UNIQUE constraint from taxes table if it still exists
    const tableInfo = this.db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='taxes'`).get() as { sql: string } | undefined;
    if (tableInfo && tableInfo.sql.includes('UNIQUE(country_code, state_code)')) {
      this.db.exec(`
        BEGIN TRANSACTION;
        ALTER TABLE taxes RENAME TO taxes_old;
        CREATE TABLE taxes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          country_code TEXT NOT NULL DEFAULT 'IN',
          state_code TEXT NOT NULL DEFAULT '',
          cgst_rate REAL NOT NULL DEFAULT 0,
          sgst_rate REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO taxes (id, country_code, state_code, cgst_rate, sgst_rate, created_at)
          SELECT id, country_code, state_code, cgst_rate, sgst_rate, created_at FROM taxes_old;
        DROP TABLE taxes_old;
        COMMIT;
      `);
    }
  }

  // Categories
  getCategories(): Category[] {
    return this.db.prepare('SELECT * FROM categories ORDER BY name').all() as Category[];
  }

  createCategory(data: Partial<Category>): Category {
    const stmt = this.db.prepare(`
      INSERT INTO categories (name, image_path, country_code, state_code, cgst_rate, sgst_rate)
      VALUES (@name, @image_path, @country_code, @state_code, @cgst_rate, @sgst_rate)
    `);
    const result = stmt.run({
      name: data.name ?? '',
      image_path: data.image_path ?? null,
      country_code: data.country_code ?? 'IN',
      state_code: data.state_code ?? '',
      cgst_rate: data.cgst_rate ?? 0,
      sgst_rate: data.sgst_rate ?? 0,
    });
    return this.getCategoryById(result.lastInsertRowid as number)!;
  }

  getCategoryById(id: number): Category | undefined {
    return this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
  }

  updateCategory(id: number, data: Partial<Category>): Category | null {
    const cat = this.getCategoryById(id);
    if (!cat) return null;
    this.db.prepare(`
      UPDATE categories SET
        name = COALESCE(?, name),
        image_path = COALESCE(?, image_path),
        country_code = COALESCE(?, country_code),
        state_code = COALESCE(?, state_code),
        cgst_rate = COALESCE(?, cgst_rate),
        sgst_rate = COALESCE(?, sgst_rate)
      WHERE id = ?
    `).run(
      data.name ?? cat.name,
      data.image_path !== undefined ? data.image_path : cat.image_path,
      data.country_code ?? cat.country_code,
      data.state_code ?? cat.state_code,
      data.cgst_rate ?? cat.cgst_rate,
      data.sgst_rate ?? cat.sgst_rate,
      id
    );
    return this.getCategoryById(id)!;
  }

  deleteCategory(id: number): boolean {
    const products = this.db.prepare('SELECT id FROM products WHERE category_id = ?').all(id);
    if (products.length > 0) return false;
    this.db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return true;
  }

  // Products
  getProducts(): (Product & { category_name: string })[] {
    return this.db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name
    `).all() as (Product & { category_name: string })[];
  }

  getProductById(id: number): (Product & { category_name: string }) | undefined {
    return this.db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id) as (Product & { category_name: string }) | undefined;
  }

  createProduct(data: Partial<Product>): Product {
    const stmt = this.db.prepare(`
      INSERT INTO products (product_code, name, image_path, purchase_price, hsn_code, stock,
        category_id, low_stock_threshold, selling_price, mrp, gst_rate)
      VALUES (@product_code, @name, @image_path, @purchase_price, @hsn_code, @stock,
        @category_id, @low_stock_threshold, @selling_price, @mrp, @gst_rate)
    `);
    const result = stmt.run({
      product_code: data.product_code ?? '',
      name: data.name ?? '',
      image_path: data.image_path ?? null,
      purchase_price: data.purchase_price ?? 0,
      hsn_code: data.hsn_code ?? '',
      stock: data.stock ?? 0,
      category_id: data.category_id ?? 1,
      low_stock_threshold: data.low_stock_threshold ?? 5,
      selling_price: data.selling_price ?? 0,
      mrp: data.mrp ?? 0,
      gst_rate: data.gst_rate ?? 0,
    });
    return this.getProductById(result.lastInsertRowid as number)!;
  }

  updateProduct(id: number, data: Partial<Product>): Product | null {
    const prod = this.getProductById(id);
    if (!prod) return null;
    this.db.prepare(`
      UPDATE products SET
        product_code = COALESCE(?, product_code),
        name = COALESCE(?, name),
        image_path = COALESCE(?, image_path),
        purchase_price = COALESCE(?, purchase_price),
        hsn_code = COALESCE(?, hsn_code),
        stock = COALESCE(?, stock),
        category_id = COALESCE(?, category_id),
        low_stock_threshold = COALESCE(?, low_stock_threshold),
        selling_price = COALESCE(?, selling_price),
        mrp = COALESCE(?, mrp),
        gst_rate = COALESCE(?, gst_rate),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.product_code ?? prod.product_code,
      data.name ?? prod.name,
      data.image_path !== undefined ? data.image_path : prod.image_path,
      data.purchase_price ?? prod.purchase_price,
      data.hsn_code ?? prod.hsn_code,
      data.stock ?? prod.stock,
      data.category_id ?? prod.category_id,
      data.low_stock_threshold ?? prod.low_stock_threshold,
      data.selling_price ?? prod.selling_price,
      data.mrp ?? prod.mrp,
      data.gst_rate ?? prod.gst_rate,
      id
    );
    return this.getProductById(id)!;
  }

  deleteProduct(id: number): { success: boolean; error?: string } {
    const refs = this.db.prepare('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?').get(id) as { count: number };
    if (refs.count > 0) {
      return { success: false, error: 'Cannot delete: product is referenced in invoices' };
    }
    this.db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return { success: true };
  }

  getLowStockProducts(): Product[] {
    return this.db.prepare(`
      SELECT p.*, c.name as category_name FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.stock <= p.low_stock_threshold AND p.stock >= 0
      ORDER BY p.stock ASC
    `).all() as Product[];
  }

  // Customers
  getCustomers(): Customer[] {
    return this.db.prepare('SELECT * FROM customers ORDER BY total_purchases DESC').all() as Customer[];
  }

  createCustomer(data: Partial<Customer>): Customer {
    const stmt = this.db.prepare(`
      INSERT INTO customers (name, phone_number, total_purchases)
      VALUES (@name, @phone_number, @total_purchases)
    `);
    const result = stmt.run({
      name: data.name ?? '',
      phone_number: data.phone_number ?? '',
      total_purchases: data.total_purchases ?? 0,
    });
    return this.db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid) as Customer;
  }

  updateCustomer(id: number, data: Partial<Customer>): Customer | null {
    const cust = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer | undefined;
    if (!cust) return null;
    this.db.prepare(`
      UPDATE customers SET
        name = COALESCE(?, name),
        phone_number = COALESCE(?, phone_number),
        total_purchases = COALESCE(?, total_purchases)
      WHERE id = ?
    `).run(data.name ?? cust.name, data.phone_number ?? cust.phone_number, data.total_purchases ?? cust.total_purchases, id);
    return this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer;
  }

  getOrCreateCustomer(name: string, phone: string): Customer {
    let cust = this.db.prepare('SELECT * FROM customers WHERE phone_number = ?').get(phone) as Customer | undefined;
    if (!cust) {
      return this.createCustomer({ name, phone_number: phone, total_purchases: 0 });
    }
    return cust;
  }

  // Orders
  getOrders(): Order[] {
    return this.db.prepare(`
      SELECT id, customer_id, customer_name, customer_phone, purchase_date, total_amount, created_at
      FROM orders ORDER BY purchase_date DESC, id DESC
    `).all() as Order[];
  }

  getOrderById(id: number): (Order & { items: OrderItem[] }) | undefined {
    const order = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Order | undefined;
    if (!order) return undefined;
    const items = this.db.prepare(`
      SELECT oi.product_id, p.product_code, p.name as product_name, p.hsn_code, p.mrp,
        oi.quantity, oi.unit_price, oi.gst_rate, oi.subtotal, oi.gst_amount, oi.total
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(id) as (OrderItem & { hsn_code?: string; mrp?: number })[];
    return { ...order, items };
  }

  createOrder(data: { customer_name: string; customer_phone: string; items: { product_id: number; quantity: number; unit_price: number; gst_rate: number }[]; additionalTotal?: number }): Order {
    const insertOrder = this.db.prepare(`
      INSERT INTO orders (customer_name, customer_phone, customer_id, purchase_date, total_amount)
      VALUES (@customer_name, @customer_phone, @customer_id, @purchase_date, @total_amount)
    `);
    const insertItem = this.db.prepare(`
      INSERT INTO order_items (order_id, product_id, quantity, unit_price, gst_rate, subtotal, gst_amount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateStock = this.db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    const updateCustomer = this.db.prepare('UPDATE customers SET total_purchases = total_purchases + ? WHERE id = ?');

    let totalAmount = 0;
    for (const item of data.items) {
      const subtotal = item.quantity * item.unit_price;
      const gstAmount = subtotal * (item.gst_rate / 100);
      totalAmount += subtotal + gstAmount;
    }
    totalAmount += data.additionalTotal ?? 0;

    const purchaseDate = new Date().toISOString().split('T')[0];
    const customer = this.getOrCreateCustomer(data.customer_name, data.customer_phone);

    const orderResult = insertOrder.run({
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_id: customer.id,
      purchase_date: purchaseDate,
      total_amount: totalAmount,
    });
    const orderId = orderResult.lastInsertRowid as number;

    for (const item of data.items) {
      const subtotal = item.quantity * item.unit_price;
      const gstAmount = subtotal * (item.gst_rate / 100);
      const total = subtotal + gstAmount;
      insertItem.run(orderId, item.product_id, item.quantity, item.unit_price, item.gst_rate, subtotal, gstAmount, total);
      updateStock.run(item.quantity, item.product_id);
    }

    updateCustomer.run(totalAmount, customer.id);

    return this.getOrderById(orderId)!;
  }

  getStoreSettings(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM store_settings').all() as { key: string; value: string }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  updateStoreSetting(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)').run(key, value);
  }

  // Taxes
  getTaxes(): Tax[] {
    return this.db.prepare('SELECT * FROM taxes ORDER BY country_code, state_code').all() as Tax[];
  }

  createTax(data: Partial<Tax>): Tax {
    const stmt = this.db.prepare(`
      INSERT INTO taxes (country_code, state_code, cgst_rate, sgst_rate)
      VALUES (@country_code, @state_code, @cgst_rate, @sgst_rate)
    `);
    const result = stmt.run({
      country_code: data.country_code ?? 'IN',
      state_code: data.state_code ?? '',
      cgst_rate: data.cgst_rate ?? 0,
      sgst_rate: data.sgst_rate ?? 0,
    });
    return this.db.prepare('SELECT * FROM taxes WHERE id = ?').get(result.lastInsertRowid) as Tax;
  }

  updateTax(id: number, data: Partial<Tax>): Tax | null {
    const tax = this.db.prepare('SELECT * FROM taxes WHERE id = ?').get(id) as Tax | undefined;
    if (!tax) return null;
    this.db.prepare(`
      UPDATE taxes SET
        country_code = COALESCE(?, country_code),
        state_code = COALESCE(?, state_code),
        cgst_rate = COALESCE(?, cgst_rate),
        sgst_rate = COALESCE(?, sgst_rate)
      WHERE id = ?
    `).run(
      data.country_code ?? tax.country_code,
      data.state_code ?? tax.state_code,
      data.cgst_rate ?? tax.cgst_rate,
      data.sgst_rate ?? tax.sgst_rate,
      id
    );
    return this.db.prepare('SELECT * FROM taxes WHERE id = ?').get(id) as Tax;
  }

  deleteTax(id: number): void {
    this.db.prepare('DELETE FROM taxes WHERE id = ?').run(id);
  }

  close(): void {
    this.db.close();
  }
}
