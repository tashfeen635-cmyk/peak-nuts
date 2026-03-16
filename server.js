const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ---- SQLite Setup ----
const db = new Database(path.join(__dirname, 'peaknuts.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    stock TEXT NOT NULL,
    image TEXT DEFAULT '',
    section TEXT DEFAULT '',
    badge TEXT DEFAULT '',
    oldPrice REAL DEFAULT 0,
    rating INTEGER DEFAULT 5,
    description TEXT DEFAULT '',
    urduName TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId TEXT NOT NULL UNIQUE,
    customer TEXT NOT NULL,
    status TEXT NOT NULL,
    date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    qty INTEGER NOT NULL,
    price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    labels TEXT NOT NULL,
    vals TEXT NOT NULL
  );
`);

// ---- Migrate: add new columns to existing databases ----
var existingCols = db.prepare("PRAGMA table_info(products)").all().map(function (c) { return c.name; });
if (existingCols.indexOf('section') === -1) db.exec("ALTER TABLE products ADD COLUMN section TEXT DEFAULT ''");
if (existingCols.indexOf('badge') === -1) db.exec("ALTER TABLE products ADD COLUMN badge TEXT DEFAULT ''");
if (existingCols.indexOf('oldPrice') === -1) db.exec("ALTER TABLE products ADD COLUMN oldPrice REAL DEFAULT 0");
if (existingCols.indexOf('rating') === -1) db.exec("ALTER TABLE products ADD COLUMN rating INTEGER DEFAULT 5");
if (existingCols.indexOf('description') === -1) db.exec("ALTER TABLE products ADD COLUMN description TEXT DEFAULT ''");
if (existingCols.indexOf('urduName') === -1) db.exec("ALTER TABLE products ADD COLUMN urduName TEXT DEFAULT ''");

// ---- Seed Data ----
const seedProducts = [
  { name: 'Organic Almonds', category: 'Nuts', price: 14.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=400&h=500&fit=crop&q=80', section: 'popular', badge: 'SALE', oldPrice: 18, rating: 5, description: '', urduName: '' },
  { name: 'Raw Cashews', category: 'Nuts', price: 16.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=400&h=500&fit=crop&q=80', section: 'popular', badge: '', oldPrice: 0, rating: 4, description: '', urduName: '' },
  { name: 'Roasted Pistachios', category: 'Nuts', price: 19.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=500&fit=crop&q=80', section: 'popular', badge: '', oldPrice: 0, rating: 5, description: '', urduName: '' },
  { name: 'Brazil Nuts', category: 'Nuts', price: 22.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=500&fit=crop&q=80', section: 'popular', badge: 'NEW', oldPrice: 0, rating: 4, description: '', urduName: '' },
  { name: 'Walnut Halves', category: 'Nuts', price: 15.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400&h=500&fit=crop&q=80', section: 'trending', badge: '', oldPrice: 0, rating: 5, description: '', urduName: '' },
  { name: 'Macadamia Nuts', category: 'Nuts', price: 28.00, stock: 'Low Stock', image: 'https://images.unsplash.com/photo-1509721434272-b79147e0e708?w=400&h=500&fit=crop&q=80', section: 'trending', badge: 'SALE', oldPrice: 34, rating: 4, description: '', urduName: '' },
  { name: 'Pecan Pieces', category: 'Nuts', price: 20.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1564424224827-cd24b8915874?w=400&h=500&fit=crop&q=80', section: 'trending', badge: '', oldPrice: 0, rating: 5, description: '', urduName: '' },
  { name: 'Hazelnut Premium', category: 'Nuts', price: 24.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1526081715791-7c538f86060e?w=400&h=500&fit=crop&q=80', section: 'bestselling', badge: '', oldPrice: 0, rating: 4, description: '', urduName: '' },
  { name: 'Shilajit Resin', category: 'Herbs & Supplements', price: 59.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=500&fit=crop&q=80', section: 'popular', badge: 'HOT', oldPrice: 79, rating: 5, description: 'Himalayan resin for energy, vitality & cognitive health', urduName: '\u0633\u0644\u0627\u062c\u06cc\u062a' },
  { name: 'Shilajit Capsules', category: 'Herbs & Supplements', price: 45.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&h=500&fit=crop&q=80', section: 'trending', badge: 'HOT', oldPrice: 55, rating: 5, description: 'Easy-to-take capsules for daily energy & longevity', urduName: '\u0633\u0644\u0627\u062c\u06cc\u062a \u06a9\u06cc\u067e\u0633\u0648\u0644' },
  { name: 'Ashwagandha', category: 'Herbs & Supplements', price: 24.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=500&fit=crop&q=80', section: 'popular', badge: '', oldPrice: 0, rating: 5, description: 'Adaptogenic herb for stress, anxiety & muscle growth', urduName: '\u0627\u0634\u0648\u06af\u0646\u062f\u06be\u0627' },
  { name: 'Panax Ginseng', category: 'Herbs & Supplements', price: 32.00, stock: 'Low Stock', image: 'https://images.unsplash.com/photo-1580541832626-2a7131ee809f?w=400&h=500&fit=crop&q=80', section: 'popular', badge: '', oldPrice: 0, rating: 4, description: 'Boosts energy, fights fatigue & supports cognitive function', urduName: '\u062c\u0646\u0633\u06cc\u0646\u06af' },
  { name: 'Triphala', category: 'Herbs & Supplements', price: 20.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=500&fit=crop&q=80', section: 'popular', badge: 'NEW', oldPrice: 0, rating: 5, description: 'Three-fruit blend for digestion & anti-inflammatory benefits', urduName: '\u062a\u0631\u067e\u06be\u0644\u0627' },
  { name: 'Boswellia', category: 'Herbs & Supplements', price: 26.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400&h=500&fit=crop&q=80', section: 'trending', badge: '', oldPrice: 0, rating: 4, description: 'Indian frankincense for inflammation & joint health', urduName: '\u0644\u0648\u0628\u0627\u0646 / \u06a9\u0646\u062f\u0631' },
  { name: 'Maca Root', category: 'Herbs & Supplements', price: 28.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=500&fit=crop&q=80', section: 'trending', badge: 'HOT', oldPrice: 0, rating: 5, description: 'Andean root for energy, stamina & hormonal balance', urduName: '\u0645\u0627\u06a9\u0627 \u062c\u0691' },
  { name: 'Gotu Kola', category: 'Herbs & Supplements', price: 22.00, stock: 'Out of Stock', image: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=400&h=500&fit=crop&q=80', section: 'trending', badge: '', oldPrice: 0, rating: 4, description: 'Herb of longevity for memory, stress & anxiety relief', urduName: '\u0628\u0631\u06c1\u0645\u06cc \u0628\u0648\u0679\u06cc' },
  { name: 'Tumoro Wild Thyme Tea', category: 'Teas', price: 25.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=500&fit=crop&q=80', section: 'popular', badge: 'HOT', oldPrice: 35, rating: 5, description: 'Caffeine-free herbal tea from Gilgit-Baltistan for immunity', urduName: '\u062a\u0645\u0648\u0631\u0648 / \u062c\u0646\u06af\u0644\u06cc \u0627\u062c\u0648\u0627\u0626\u0646' },
  { name: 'Tumoro Tea Loose Leaf', category: 'Teas', price: 22.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=500&fit=crop&q=80', section: 'trending', badge: 'HOT', oldPrice: 30, rating: 5, description: 'Aromatic Gilgit-Baltistan herbal tea for holistic wellness', urduName: '\u062a\u0645\u0648\u0631\u0648 / \u062c\u0646\u06af\u0644\u06cc \u0627\u062c\u0648\u0627\u0626\u0646' },
  { name: 'Honey Roast Mix', category: 'Mixes & Butters', price: 17.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&h=500&fit=crop&q=80', section: 'trending', badge: 'NEW', oldPrice: 0, rating: 5, description: '', urduName: '' },
  { name: 'Trail Mix Deluxe', category: 'Mixes & Butters', price: 16.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=400&h=500&fit=crop&q=80', section: 'bestselling', badge: '', oldPrice: 0, rating: 5, description: '', urduName: '' },
  { name: 'Mixed Nut Butter', category: 'Mixes & Butters', price: 12.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&h=500&fit=crop&q=80', section: 'bestselling', badge: '', oldPrice: 0, rating: 5, description: '', urduName: '' },
  { name: 'Turmeric Curcumin', category: 'Spices', price: 18.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1455853828816-0c301a011711?w=400&h=500&fit=crop&q=80', section: 'popular', badge: 'SALE', oldPrice: 22, rating: 5, description: 'Powerful antioxidant & anti-inflammatory for heart & mood', urduName: '\u06c1\u0644\u062f\u06cc' },
  { name: 'Cinnamon (Dal Chini)', category: 'Spices', price: 12.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1471943311424-646960669fbc?w=400&h=500&fit=crop&q=80', section: 'trending', badge: '', oldPrice: 0, rating: 5, description: 'Helps manage blood sugar & acts as anti-inflammatory', urduName: '\u062f\u0627\u0631 \u0686\u06cc\u0646\u06cc' }
];

const seedOrders = [
  { orderId: 'PN-1001', customer: 'Sarah Mitchell', status: 'Delivered', date: '2026-03-01', items: [{ name: 'Organic Almonds', qty: 2, price: 14.00 }, { name: 'Raw Cashews', qty: 1, price: 16.00 }] },
  { orderId: 'PN-1002', customer: 'James Parker', status: 'Shipped', date: '2026-03-04', items: [{ name: 'Shilajit Resin', qty: 1, price: 59.00 }, { name: 'Ashwagandha', qty: 1, price: 24.00 }] },
  { orderId: 'PN-1003', customer: 'Emily Chen', status: 'Pending', date: '2026-03-08', items: [{ name: 'Tumoro Wild Thyme Tea', qty: 3, price: 25.00 }] },
  { orderId: 'PN-1004', customer: 'Michael Torres', status: 'Delivered', date: '2026-02-18', items: [{ name: 'Walnut Halves', qty: 2, price: 15.00 }, { name: 'Trail Mix Deluxe', qty: 1, price: 16.00 }, { name: 'Mixed Nut Butter', qty: 2, price: 12.00 }] },
  { orderId: 'PN-1005', customer: 'Aisha Khan', status: 'Shipped', date: '2026-03-10', items: [{ name: 'Maca Root', qty: 1, price: 28.00 }, { name: 'Panax Ginseng', qty: 1, price: 32.00 }] },
  { orderId: 'PN-1006', customer: 'David Wilson', status: 'Pending', date: '2026-03-12', items: [{ name: 'Roasted Pistachios', qty: 2, price: 19.00 }, { name: 'Macadamia Nuts', qty: 1, price: 28.00 }] },
  { orderId: 'PN-1007', customer: 'Lisa Rodriguez', status: 'Delivered', date: '2026-02-25', items: [{ name: 'Turmeric Curcumin', qty: 1, price: 18.00 }, { name: 'Cinnamon (Dal Chini)', qty: 2, price: 12.00 }, { name: 'Triphala', qty: 1, price: 20.00 }] },
  { orderId: 'PN-1008', customer: 'Robert Kim', status: 'Shipped', date: '2026-03-13', items: [{ name: 'Shilajit Capsules', qty: 2, price: 45.00 }] },
  { orderId: 'PN-1009', customer: 'Fatima Hussain', status: 'Pending', date: '2026-03-14', items: [{ name: 'Tumoro Tea Loose Leaf', qty: 2, price: 22.00 }, { name: 'Honey Roast Mix', qty: 1, price: 17.00 }] },
  { orderId: 'PN-1010', customer: 'Anna Petrov', status: 'Delivered', date: '2026-02-10', items: [{ name: 'Brazil Nuts', qty: 1, price: 22.00 }, { name: 'Hazelnut Premium', qty: 1, price: 24.00 }, { name: 'Pecan Pieces', qty: 1, price: 20.00 }] }
];

const seedSubscribers = [
  { email: 'sarah.m@gmail.com', date: '2026-01-15' },
  { email: 'james.parker@outlook.com', date: '2026-01-22' },
  { email: 'emily.chen@yahoo.com', date: '2026-02-03' },
  { email: 'mike.torres@gmail.com', date: '2026-02-14' },
  { email: 'aisha.k@hotmail.com', date: '2026-02-28' },
  { email: 'david.wilson@gmail.com', date: '2026-03-05' },
  { email: 'lisa.r@protonmail.com', date: '2026-03-11' }
];

const seedRevenue = {
  labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  values: [1200, 1850, 2100, 1750, 2800, 3400, 2900, 3100, 2650, 0, 0, 0]
};

// ---- Seed endpoint ----
app.post('/api/seed', (req, res) => {
  try {
    const productCount = db.prepare('SELECT COUNT(*) AS cnt FROM products').get().cnt;
    const orderCount = db.prepare('SELECT COUNT(*) AS cnt FROM orders').get().cnt;
    const subCount = db.prepare('SELECT COUNT(*) AS cnt FROM subscribers').get().cnt;
    const revCount = db.prepare('SELECT COUNT(*) AS cnt FROM revenue').get().cnt;

    if (productCount === 0) {
      const insertProduct = db.prepare('INSERT INTO products (name, category, price, stock, image, section, badge, oldPrice, rating, description, urduName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const insertMany = db.transaction((items) => {
        for (const p of items) insertProduct.run(p.name, p.category, p.price, p.stock, p.image || '', p.section || '', p.badge || '', p.oldPrice || 0, p.rating || 5, p.description || '', p.urduName || '');
      });
      insertMany(seedProducts);
    }

    // Migrate: add section data to existing products that don't have it
    var sectionMap = {};
    seedProducts.forEach(function (p) { sectionMap[p.name] = p; });
    var noSectionRows = db.prepare("SELECT * FROM products WHERE section = '' OR section IS NULL").all();
    var updateSectionStmt = db.prepare('UPDATE products SET section=?, badge=?, oldPrice=?, rating=?, description=?, urduName=? WHERE id=?');
    for (var i = 0; i < noSectionRows.length; i++) {
      var row = noSectionRows[i];
      var seed = sectionMap[row.name];
      if (seed) {
        updateSectionStmt.run(seed.section || '', seed.badge || '', seed.oldPrice || 0, seed.rating || 5, seed.description || '', seed.urduName || '', row.id);
      }
    }

    if (orderCount === 0) {
      const insertOrder = db.prepare('INSERT INTO orders (orderId, customer, status, date) VALUES (?, ?, ?, ?)');
      const insertItem = db.prepare('INSERT INTO order_items (order_id, name, qty, price) VALUES (?, ?, ?, ?)');
      const insertOrders = db.transaction((orders) => {
        for (const o of orders) {
          const result = insertOrder.run(o.orderId, o.customer, o.status, o.date);
          const oid = result.lastInsertRowid;
          for (const item of o.items) {
            insertItem.run(oid, item.name, item.qty, item.price);
          }
        }
      });
      insertOrders(seedOrders);
    }

    if (subCount === 0) {
      const insertSub = db.prepare('INSERT INTO subscribers (email, date) VALUES (?, ?)');
      const insertSubs = db.transaction((subs) => {
        for (const s of subs) insertSub.run(s.email, s.date);
      });
      insertSubs(seedSubscribers);
    }

    if (revCount === 0) {
      db.prepare('INSERT INTO revenue (labels, vals) VALUES (?, ?)').run(
        JSON.stringify(seedRevenue.labels),
        JSON.stringify(seedRevenue.values)
      );
    }

    res.json({ message: 'Seed complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Products API ----
app.get('/api/products', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM products').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const { name, category, price, stock, image, section, badge, oldPrice, rating, description, urduName } = req.body;
    const result = db.prepare('INSERT INTO products (name, category, price, stock, image, section, badge, oldPrice, rating, description, urduName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, category, price, stock, image || '', section || '', badge || '', oldPrice || 0, rating || 5, description || '', urduName || '');
    res.status(201).json({ id: result.lastInsertRowid, name, category, price, stock, image: image || '', section: section || '', badge: badge || '', oldPrice: oldPrice || 0, rating: rating || 5, description: description || '', urduName: urduName || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const { name, category, price, stock, image, section, badge, oldPrice, rating, description, urduName } = req.body;
    const result = db.prepare('UPDATE products SET name=?, category=?, price=?, stock=?, image=?, section=?, badge=?, oldPrice=?, rating=?, description=?, urduName=? WHERE id=?').run(name, category, price, stock, image || '', section || '', badge || '', oldPrice || 0, rating || 5, description || '', urduName || '', req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ id: Number(req.params.id), name, category, price, stock, image: image || '', section: section || '', badge: badge || '', oldPrice: oldPrice || 0, rating: rating || 5, description: description || '', urduName: urduName || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Orders API ----
app.get('/api/orders', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM orders ORDER BY date DESC').all();
    // Attach items to each order
    const getItems = db.prepare('SELECT name, qty, price FROM order_items WHERE order_id=?');
    const orders = rows.map((o) => ({
      ...o,
      items: getItems.all(o.id)
    }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id', (req, res) => {
  try {
    const { status } = req.body;
    const result = db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ id: Number(req.params.id), status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Subscribers API ----
app.get('/api/subscribers', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM subscribers').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Revenue API ----
app.get('/api/revenue', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM revenue LIMIT 1').get();
    if (!row) return res.json({ labels: [], values: [] });
    res.json({ labels: JSON.parse(row.labels), values: JSON.parse(row.vals) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Start Server ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
  console.log('SQLite database: peaknuts.db');
});
