const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

// ---- Auth Setup ----
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'PeakNuts2026!';
var activeTokens = {};

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ---- Password Hashing ----
function hashPassword(password, existingSalt) {
  var salt = existingSalt || crypto.randomBytes(16).toString('hex');
  var hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash: hash, salt: salt };
}

function verifyPassword(password, hash, salt) {
  var derived = crypto.scryptSync(password, salt, 64);
  var hashBuffer = Buffer.from(hash, 'hex');
  if (derived.length !== hashBuffer.length) return false;
  return crypto.timingSafeEqual(derived, hashBuffer);
}

function cleanExpiredTokens() {
  var now = Date.now();
  var maxAge = 24 * 60 * 60 * 1000;
  for (var token in activeTokens) {
    if (now - activeTokens[token].createdAt > maxAge) {
      delete activeTokens[token];
    }
  }
}

function requireAuth(req, res, next) {
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  var token = authHeader.slice(7);
  if (!activeTokens[token]) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  if (Date.now() - activeTokens[token].createdAt > 24 * 60 * 60 * 1000) {
    delete activeTokens[token];
    return res.status(401).json({ error: 'Token expired' });
  }
  next();
}

// ---- User Token Management ----
var activeUserTokens = {};

function cleanExpiredUserTokens() {
  var now = Date.now();
  var maxAge = 24 * 60 * 60 * 1000;
  for (var token in activeUserTokens) {
    if (now - activeUserTokens[token].createdAt > maxAge) {
      delete activeUserTokens[token];
    }
  }
}

function requireUser(req, res, next) {
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  var token = authHeader.slice(7);
  if (!activeUserTokens[token]) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  if (Date.now() - activeUserTokens[token].createdAt > 24 * 60 * 60 * 1000) {
    delete activeUserTokens[token];
    return res.status(401).json({ error: 'Token expired' });
  }
  var userId = activeUserTokens[token].userId;
  var user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  if (!user) {
    delete activeUserTokens[token];
    return res.status(401).json({ error: 'User not found' });
  }
  req.user = user;
  next();
}

// ---- Email Transporter ----
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function sendOrderConfirmationEmail(toEmail, order) {
  var itemsHtml = '';
  var total = 0;
  for (var i = 0; i < order.items.length; i++) {
    var item = order.items[i];
    var lineTotal = item.qty * item.price;
    total += lineTotal;
    itemsHtml += '<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px">' + item.name + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;text-align:center">' + item.qty + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;text-align:right">Rs.' + lineTotal.toFixed(2) + '</td></tr>';
  }

  const mailOptions = {
    from: '"Peak Nuts" <' + process.env.EMAIL_USER + '>',
    to: toEmail,
    subject: 'Order Confirmed - ' + order.orderId + ' | Peak Nuts',
    html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f9f8f5;border-radius:8px">' +
      '<h1 style="font-family:Georgia,serif;color:#1a1a1a;font-size:28px;margin-bottom:10px">Order Confirmed!</h1>' +
      '<p style="color:#5d5b5b;font-size:15px;line-height:1.8">Thank you, <strong>' + order.customer + '</strong>! Your order has been placed successfully.</p>' +
      '<div style="background:#fff;padding:20px;border-radius:6px;margin:20px 0">' +
        '<p style="margin:0 0 5px;font-size:14px;color:#5d5b5b"><strong>Order ID:</strong> ' + order.orderId + '</p>' +
        '<p style="margin:0 0 5px;font-size:14px;color:#5d5b5b"><strong>Payment:</strong> Cash on Delivery</p>' +
        '<p style="margin:0 0 5px;font-size:14px;color:#5d5b5b"><strong>Phone:</strong> ' + order.phone + '</p>' +
        '<p style="margin:0;font-size:14px;color:#5d5b5b"><strong>Delivery:</strong> ' + order.address + ', ' + order.city + '</p>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;margin:20px 0">' +
        '<thead><tr style="background:#1a1a1a;color:#fff">' +
          '<th style="padding:10px 12px;text-align:left;font-size:13px">Item</th>' +
          '<th style="padding:10px 12px;text-align:center;font-size:13px">Qty</th>' +
          '<th style="padding:10px 12px;text-align:right;font-size:13px">Price</th>' +
        '</tr></thead>' +
        '<tbody>' + itemsHtml + '</tbody>' +
        '<tfoot><tr><td colspan="2" style="padding:12px;font-weight:bold;font-size:15px;border-top:2px solid #1a1a1a">Total</td>' +
          '<td style="padding:12px;font-weight:bold;font-size:15px;text-align:right;border-top:2px solid #1a1a1a">Rs.' + total.toFixed(2) + '</td></tr></tfoot>' +
      '</table>' +
      '<p style="color:#5d5b5b;font-size:15px;line-height:1.8">We will notify you when your order is shipped. Stay healthy, stay natural!</p>' +
      '<p style="color:#8B9A46;font-weight:600;font-size:16px;margin-top:20px">&mdash; The Peak Nuts Team</p>' +
      '<hr style="border:none;border-top:1px solid #e0e0e0;margin:25px 0">' +
      '<p style="color:#999;font-size:12px;text-align:center">Peak Nuts &mdash; Premium Organic Nuts &amp; Superfoods</p>' +
    '</div>'
  };
  return transporter.sendMail(mailOptions).catch(function (err) {
    console.error('Order confirmation email error:', err.message);
  });
}

function sendPasswordResetEmail(toEmail, resetToken) {
  var resetLink = (process.env.SITE_URL || 'http://localhost:5000') + '/account.html?reset=' + resetToken;
  const mailOptions = {
    from: '"Peak Nuts" <' + process.env.EMAIL_USER + '>',
    to: toEmail,
    subject: 'Reset Your Password - Peak Nuts',
    html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f9f8f5;border-radius:8px">' +
      '<h1 style="font-family:Georgia,serif;color:#1a1a1a;font-size:28px;margin-bottom:10px">Reset Your Password</h1>' +
      '<p style="color:#5d5b5b;font-size:15px;line-height:1.8">We received a request to reset your password. Click the button below to create a new password:</p>' +
      '<div style="text-align:center;margin:30px 0">' +
        '<a href="' + resetLink + '" style="background:#1a1a1a;color:#fff;padding:14px 32px;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600;letter-spacing:1px">RESET PASSWORD</a>' +
      '</div>' +
      '<p style="color:#5d5b5b;font-size:13px;line-height:1.8">This link will expire in 1 hour. If you didn\'t request this, please ignore this email.</p>' +
      '<p style="color:#8B9A46;font-weight:600;font-size:16px;margin-top:20px">&mdash; The Peak Nuts Team</p>' +
      '<hr style="border:none;border-top:1px solid #e0e0e0;margin:25px 0">' +
      '<p style="color:#999;font-size:12px;text-align:center">Peak Nuts &mdash; Premium Organic Nuts &amp; Superfoods</p>' +
    '</div>'
  };
  return transporter.sendMail(mailOptions).catch(function (err) {
    console.error('Password reset email error:', err.message);
  });
}

function sendVerificationEmail(toEmail, verifyToken) {
  var verifyLink = (process.env.SITE_URL || 'http://localhost:5000') + '/account.html?verify=' + verifyToken;
  const mailOptions = {
    from: '"Peak Nuts" <' + process.env.EMAIL_USER + '>',
    to: toEmail,
    subject: 'Verify Your Email - Peak Nuts',
    html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f9f8f5;border-radius:8px">' +
      '<h1 style="font-family:Georgia,serif;color:#1a1a1a;font-size:28px;margin-bottom:10px">Verify Your Email</h1>' +
      '<p style="color:#5d5b5b;font-size:15px;line-height:1.8">Welcome to Peak Nuts! Please verify your email address to activate your account:</p>' +
      '<div style="text-align:center;margin:30px 0">' +
        '<a href="' + verifyLink + '" style="background:#8B9A46;color:#fff;padding:14px 32px;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600;letter-spacing:1px">VERIFY EMAIL</a>' +
      '</div>' +
      '<p style="color:#5d5b5b;font-size:13px;line-height:1.8">This link will expire in 24 hours.</p>' +
      '<p style="color:#8B9A46;font-weight:600;font-size:16px;margin-top:20px">&mdash; The Peak Nuts Team</p>' +
      '<hr style="border:none;border-top:1px solid #e0e0e0;margin:25px 0">' +
      '<p style="color:#999;font-size:12px;text-align:center">Peak Nuts &mdash; Premium Organic Nuts &amp; Superfoods</p>' +
    '</div>'
  };
  return transporter.sendMail(mailOptions).catch(function (err) {
    console.error('Verification email error:', err.message);
  });
}

function sendOrderStatusEmail(toEmail, order, newStatus) {
  var statusMsg = '';
  var statusIcon = '';
  if (newStatus === 'Shipped') {
    statusMsg = 'Great news! Your order <strong>' + order.orderId + '</strong> has been shipped and is on its way to you.';
    statusIcon = '&#128666;';
  } else if (newStatus === 'Delivered') {
    statusMsg = 'Your order <strong>' + order.orderId + '</strong> has been delivered. We hope you enjoy your purchase!';
    statusIcon = '&#9989;';
  } else {
    return Promise.resolve();
  }
  const mailOptions = {
    from: '"Peak Nuts" <' + process.env.EMAIL_USER + '>',
    to: toEmail,
    subject: 'Order ' + newStatus + ' - ' + order.orderId + ' | Peak Nuts',
    html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f9f8f5;border-radius:8px">' +
      '<h1 style="font-family:Georgia,serif;color:#1a1a1a;font-size:28px;margin-bottom:10px">Order ' + newStatus + ' ' + statusIcon + '</h1>' +
      '<p style="color:#5d5b5b;font-size:15px;line-height:1.8">' + statusMsg + '</p>' +
      '<div style="background:#fff;padding:20px;border-radius:6px;margin:20px 0">' +
        '<p style="margin:0 0 5px;font-size:14px;color:#5d5b5b"><strong>Order ID:</strong> ' + order.orderId + '</p>' +
        '<p style="margin:0 0 5px;font-size:14px;color:#5d5b5b"><strong>Status:</strong> ' + newStatus + '</p>' +
        '<p style="margin:0;font-size:14px;color:#5d5b5b"><strong>Delivery:</strong> ' + (order.address || '') + ', ' + (order.city || '') + '</p>' +
      '</div>' +
      '<p style="color:#5d5b5b;font-size:15px;line-height:1.8">Thank you for shopping with Peak Nuts!</p>' +
      '<p style="color:#8B9A46;font-weight:600;font-size:16px;margin-top:20px">&mdash; The Peak Nuts Team</p>' +
      '<hr style="border:none;border-top:1px solid #e0e0e0;margin:25px 0">' +
      '<p style="color:#999;font-size:12px;text-align:center">Peak Nuts &mdash; Premium Organic Nuts &amp; Superfoods</p>' +
    '</div>'
  };
  return transporter.sendMail(mailOptions).catch(function (err) {
    console.error('Order status email error:', err.message);
  });
}

function sendWelcomeEmail(toEmail) {
  const mailOptions = {
    from: '"Peak Nuts" <' + process.env.EMAIL_USER + '>',
    to: toEmail,
    subject: 'Welcome to Peak Nuts! 🌰',
    html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f9f8f5;border-radius:8px">' +
      '<h1 style="font-family:Georgia,serif;color:#1a1a1a;font-size:28px;margin-bottom:10px">Welcome to Peak Nuts!</h1>' +
      '<p style="color:#5d5b5b;font-size:15px;line-height:1.8">Thank you for subscribing to our newsletter. You\'ll be the first to know about:</p>' +
      '<ul style="color:#5d5b5b;font-size:15px;line-height:2">' +
        '<li>New product launches</li>' +
        '<li>Exclusive discounts &amp; offers</li>' +
        '<li>Seasonal recipes &amp; health tips</li>' +
        '<li>Early access to sales</li>' +
      '</ul>' +
      '<p style="color:#5d5b5b;font-size:15px;line-height:1.8">Stay healthy, stay natural!</p>' +
      '<p style="color:#8B9A46;font-weight:600;font-size:16px;margin-top:20px">— The Peak Nuts Team</p>' +
      '<hr style="border:none;border-top:1px solid #e0e0e0;margin:25px 0">' +
      '<p style="color:#999;font-size:12px;text-align:center">Peak Nuts — Premium Organic Nuts &amp; Superfoods</p>' +
    '</div>'
  };
  return transporter.sendMail(mailOptions).catch(function (err) {
    console.error('Email send error:', err.message);
  });
}

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

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    salt TEXT NOT NULL,
    phone TEXT DEFAULT '',
    city TEXT DEFAULT '',
    address TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    productId INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    createdAt TEXT DEFAULT (datetime('now')),
    UNIQUE(userId, productId)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now')),
    UNIQUE(userId, productId)
  );
`);

// ---- Migrate: add new columns to orders table ----
var orderCols = db.prepare("PRAGMA table_info(orders)").all().map(function (c) { return c.name; });
if (orderCols.indexOf('email') === -1) db.exec("ALTER TABLE orders ADD COLUMN email TEXT DEFAULT ''");
if (orderCols.indexOf('phone') === -1) db.exec("ALTER TABLE orders ADD COLUMN phone TEXT DEFAULT ''");
if (orderCols.indexOf('city') === -1) db.exec("ALTER TABLE orders ADD COLUMN city TEXT DEFAULT ''");
if (orderCols.indexOf('address') === -1) db.exec("ALTER TABLE orders ADD COLUMN address TEXT DEFAULT ''");

// ---- Migrate: add new columns to existing databases ----
var existingCols = db.prepare("PRAGMA table_info(products)").all().map(function (c) { return c.name; });
if (existingCols.indexOf('section') === -1) db.exec("ALTER TABLE products ADD COLUMN section TEXT DEFAULT ''");
if (existingCols.indexOf('badge') === -1) db.exec("ALTER TABLE products ADD COLUMN badge TEXT DEFAULT ''");
if (existingCols.indexOf('oldPrice') === -1) db.exec("ALTER TABLE products ADD COLUMN oldPrice REAL DEFAULT 0");
if (existingCols.indexOf('rating') === -1) db.exec("ALTER TABLE products ADD COLUMN rating INTEGER DEFAULT 5");
if (existingCols.indexOf('description') === -1) db.exec("ALTER TABLE products ADD COLUMN description TEXT DEFAULT ''");
if (existingCols.indexOf('urduName') === -1) db.exec("ALTER TABLE products ADD COLUMN urduName TEXT DEFAULT ''");

// ---- Migrate: add verified column to users table ----
var userCols = db.prepare("PRAGMA table_info(users)").all().map(function (c) { return c.name; });
if (userCols.indexOf('verified') === -1) db.exec("ALTER TABLE users ADD COLUMN verified INTEGER DEFAULT 0");

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

const seedSubscribers = [];

const seedRevenue = {
  labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  values: [1200, 1850, 2100, 1750, 2800, 3400, 2900, 3100, 2650, 0, 0, 0]
};

// ---- Auth Endpoints ----
app.post('/api/login', (req, res) => {
  try {
    cleanExpiredTokens();
    var { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    var token = generateToken();
    activeTokens[token] = { createdAt: Date.now() };
    res.json({ token: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logout', requireAuth, (req, res) => {
  var authHeader = req.headers.authorization;
  var token = authHeader.slice(7);
  delete activeTokens[token];
  res.json({ message: 'Logged out successfully' });
});

// ---- Seed endpoint ----
app.post('/api/seed', requireAuth, (req, res) => {
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
    // Aggregate real review stats per product
    const reviewStats = db.prepare('SELECT productId, AVG(rating) as avg, COUNT(*) as count FROM reviews GROUP BY productId').all();
    var statsMap = {};
    for (var i = 0; i < reviewStats.length; i++) {
      statsMap[reviewStats[i].productId] = reviewStats[i];
    }
    var result = rows.map(function (p) {
      var stat = statsMap[p.id];
      p.reviewAvg = stat ? Math.round(stat.avg * 10) / 10 : null;
      p.reviewCount = stat ? stat.count : 0;
      return p;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', requireAuth, (req, res) => {
  try {
    const { name, category, price, stock, image, section, badge, oldPrice, rating, description, urduName } = req.body;
    const result = db.prepare('INSERT INTO products (name, category, price, stock, image, section, badge, oldPrice, rating, description, urduName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, category, price, stock, image || '', section || '', badge || '', oldPrice || 0, rating || 5, description || '', urduName || '');
    res.status(201).json({ id: result.lastInsertRowid, name, category, price, stock, image: image || '', section: section || '', badge: badge || '', oldPrice: oldPrice || 0, rating: rating || 5, description: description || '', urduName: urduName || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', requireAuth, (req, res) => {
  try {
    const { name, category, price, stock, image, section, badge, oldPrice, rating, description, urduName } = req.body;
    const result = db.prepare('UPDATE products SET name=?, category=?, price=?, stock=?, image=?, section=?, badge=?, oldPrice=?, rating=?, description=?, urduName=? WHERE id=?').run(name, category, price, stock, image || '', section || '', badge || '', oldPrice || 0, rating || 5, description || '', urduName || '', req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ id: Number(req.params.id), name, category, price, stock, image: image || '', section: section || '', badge: badge || '', oldPrice: oldPrice || 0, rating: rating || 5, description: description || '', urduName: urduName || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
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
      email: o.email || '',
      phone: o.phone || '',
      city: o.city || '',
      address: o.address || '',
      items: getItems.all(o.id)
    }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const { customer, email, phone, city, address, items } = req.body;
    if (!customer || !email || !phone || !city || !address || !items || !items.length) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Generate orderId: find max existing PN-XXXX and increment
    const lastOrder = db.prepare("SELECT orderId FROM orders ORDER BY id DESC LIMIT 1").get();
    let nextNum = 1011;
    if (lastOrder && lastOrder.orderId) {
      const match = lastOrder.orderId.match(/PN-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const orderId = 'PN-' + nextNum;
    const date = new Date().toISOString().slice(0, 10);
    const status = 'Pending';

    const result = db.prepare('INSERT INTO orders (orderId, customer, email, phone, city, address, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(orderId, customer, email, phone, city, address, status, date);
    const oid = result.lastInsertRowid;

    const insertItem = db.prepare('INSERT INTO order_items (order_id, name, qty, price) VALUES (?, ?, ?, ?)');
    for (const item of items) {
      insertItem.run(oid, item.name, item.qty, item.price);
    }

    const order = { orderId, customer, email, phone, city, address, status, date, items };
    sendOrderConfirmationEmail(email, order);

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id', requireAuth, (req, res) => {
  try {
    const { status } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, req.params.id);
    // Send status notification email
    if (order.email && (status === 'Shipped' || status === 'Delivered')) {
      sendOrderStatusEmail(order.email, order, status);
    }
    res.json({ id: Number(req.params.id), status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Subscribers API ----
app.get('/api/subscribers', requireAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM subscribers').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subscribers/:id', requireAuth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM subscribers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Subscriber not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscribers', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const existing = db.prepare('SELECT * FROM subscribers WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Already subscribed' });
    const date = new Date().toISOString().slice(0, 10);
    db.prepare('INSERT INTO subscribers (email, date) VALUES (?, ?)').run(email, date);
    sendWelcomeEmail(email);
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Revenue API ----
app.get('/api/revenue', requireAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM revenue LIMIT 1').get();
    if (!row) return res.json({ labels: [], values: [] });
    res.json({ labels: JSON.parse(row.labels), values: JSON.parse(row.vals) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- User Account Endpoints ----

app.post('/api/register', (req, res) => {
  try {
    cleanExpiredUserTokens();
    var { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    var emailLower = email.toLowerCase();
    var existing = db.prepare('SELECT id FROM users WHERE email=?').get(emailLower);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    var hashed = hashPassword(password);
    var result = db.prepare('INSERT INTO users (name, email, password, salt, verified) VALUES (?, ?, ?, ?, 0)').run(name, emailLower, hashed.hash, hashed.salt);
    var userId = result.lastInsertRowid;

    // Send verification email
    var verifyToken = generateToken();
    db.prepare('INSERT INTO email_verification_tokens (token, userId, createdAt) VALUES (?, ?, ?)').run(verifyToken, Number(userId), Date.now());
    sendVerificationEmail(emailLower, verifyToken);

    var token = generateToken();
    activeUserTokens[token] = { userId: Number(userId), createdAt: Date.now() };
    res.status(201).json({
      token: token,
      profile: { name: name, email: emailLower, phone: '', city: '', address: '' },
      needsVerification: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/login', (req, res) => {
  try {
    cleanExpiredUserTokens();
    var { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    var user = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!verifyPassword(password, user.password, user.salt)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    var token = generateToken();
    activeUserTokens[token] = { userId: user.id, createdAt: Date.now() };
    res.json({
      token: token,
      profile: { name: user.name, email: user.email, phone: user.phone || '', city: user.city || '', address: user.address || '' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/logout', requireUser, (req, res) => {
  var authHeader = req.headers.authorization;
  var token = authHeader.slice(7);
  delete activeUserTokens[token];
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/user/profile', requireUser, (req, res) => {
  var user = req.user;
  res.json({ name: user.name, email: user.email, phone: user.phone || '', city: user.city || '', address: user.address || '' });
});

app.put('/api/user/profile', requireUser, (req, res) => {
  try {
    var { name, phone, city, address } = req.body;
    var user = req.user;
    var newName = name !== undefined ? name : user.name;
    var newPhone = phone !== undefined ? phone : (user.phone || '');
    var newCity = city !== undefined ? city : (user.city || '');
    var newAddress = address !== undefined ? address : (user.address || '');
    db.prepare('UPDATE users SET name=?, phone=?, city=?, address=? WHERE id=?').run(newName, newPhone, newCity, newAddress, user.id);
    res.json({ name: newName, email: user.email, phone: newPhone, city: newCity, address: newAddress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/orders', requireUser, (req, res) => {
  try {
    var rows = db.prepare('SELECT * FROM orders WHERE email=? ORDER BY date DESC').all(req.user.email);
    var getItems = db.prepare('SELECT name, qty, price FROM order_items WHERE order_id=?');
    var orders = rows.map(function (o) {
      return {
        orderId: o.orderId,
        customer: o.customer,
        email: o.email || '',
        phone: o.phone || '',
        city: o.city || '',
        address: o.address || '',
        status: o.status,
        date: o.date,
        items: getItems.all(o.id)
      };
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Forgot Password ----
app.post('/api/forgot-password', (req, res) => {
  try {
    var { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    var user = db.prepare('SELECT id, email FROM users WHERE email=?').get(email.toLowerCase());
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If an account exists, a reset link has been sent.' });
    // Delete old reset tokens for this user
    db.prepare('DELETE FROM password_reset_tokens WHERE userId=?').run(user.id);
    var token = generateToken();
    db.prepare('INSERT INTO password_reset_tokens (token, userId, createdAt) VALUES (?, ?, ?)').run(token, user.id, Date.now());
    sendPasswordResetEmail(user.email, token);
    res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reset-password', (req, res) => {
  try {
    var { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    var resetToken = db.prepare('SELECT * FROM password_reset_tokens WHERE token=?').get(token);
    if (!resetToken) return res.status(400).json({ error: 'Invalid or expired reset link' });
    // Check expiry (1 hour)
    if (Date.now() - resetToken.createdAt > 60 * 60 * 1000) {
      db.prepare('DELETE FROM password_reset_tokens WHERE token=?').run(token);
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }
    var hashed = hashPassword(password);
    db.prepare('UPDATE users SET password=?, salt=? WHERE id=?').run(hashed.hash, hashed.salt, resetToken.userId);
    db.prepare('DELETE FROM password_reset_tokens WHERE userId=?').run(resetToken.userId);
    res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Email Verification ----
app.get('/api/verify-email', (req, res) => {
  try {
    var token = req.query.token;
    if (!token) return res.status(400).json({ error: 'Token is required' });
    var verifyToken = db.prepare('SELECT * FROM email_verification_tokens WHERE token=?').get(token);
    if (!verifyToken) return res.status(400).json({ error: 'Invalid or expired verification link' });
    // Check expiry (24 hours)
    if (Date.now() - verifyToken.createdAt > 24 * 60 * 60 * 1000) {
      db.prepare('DELETE FROM email_verification_tokens WHERE token=?').run(token);
      return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
    }
    db.prepare('UPDATE users SET verified=1 WHERE id=?').run(verifyToken.userId);
    db.prepare('DELETE FROM email_verification_tokens WHERE userId=?').run(verifyToken.userId);
    res.json({ message: 'Email verified successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/resend-verification', requireUser, (req, res) => {
  try {
    var user = req.user;
    if (user.verified) return res.json({ message: 'Email already verified' });
    db.prepare('DELETE FROM email_verification_tokens WHERE userId=?').run(user.id);
    var token = generateToken();
    db.prepare('INSERT INTO email_verification_tokens (token, userId, createdAt) VALUES (?, ?, ?)').run(token, user.id, Date.now());
    sendVerificationEmail(user.email, token);
    res.json({ message: 'Verification email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Wishlist Endpoints ----
app.get('/api/user/wishlist', requireUser, (req, res) => {
  try {
    var rows = db.prepare('SELECT w.id, w.productId, w.createdAt, p.name, p.price, p.image, p.category, p.stock, p.badge, p.oldPrice, p.rating, p.description, p.urduName, p.section FROM wishlist w JOIN products p ON w.productId = p.id WHERE w.userId=? ORDER BY w.createdAt DESC').all(req.user.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/wishlist', requireUser, (req, res) => {
  try {
    var { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Product ID is required' });
    var existing = db.prepare('SELECT id FROM wishlist WHERE userId=? AND productId=?').get(req.user.id, productId);
    if (existing) return res.status(409).json({ error: 'Already in wishlist' });
    db.prepare('INSERT INTO wishlist (userId, productId) VALUES (?, ?)').run(req.user.id, productId);
    res.status(201).json({ message: 'Added to wishlist' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/user/wishlist/:productId', requireUser, (req, res) => {
  try {
    var result = db.prepare('DELETE FROM wishlist WHERE userId=? AND productId=?').run(req.user.id, req.params.productId);
    if (result.changes === 0) return res.status(404).json({ error: 'Not in wishlist' });
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Reviews Endpoints ----
app.get('/api/reviews/:productId', (req, res) => {
  try {
    // Optional user identification for pre-filling existing review
    var currentUserId = null;
    var authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      var tokenData = activeUserTokens[authHeader.slice(7)];
      if (tokenData && Date.now() - tokenData.createdAt <= 24 * 60 * 60 * 1000) {
        currentUserId = tokenData.userId;
      }
    }
    var rows = db.prepare('SELECT r.id, r.rating, r.comment, r.createdAt, r.userId, u.name as userName FROM reviews r JOIN users u ON r.userId = u.id WHERE r.productId=? ORDER BY r.createdAt DESC').all(req.params.productId);
    var avg = db.prepare('SELECT AVG(rating) as avgRating, COUNT(*) as count FROM reviews WHERE productId=?').get(req.params.productId);
    var userReview = null;
    if (currentUserId) {
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].userId === currentUserId) {
          userReview = { rating: rows[i].rating, comment: rows[i].comment };
          break;
        }
      }
    }
    // Remove userId from response
    var reviews = rows.map(function (r) { return { id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, userName: r.userName }; });
    res.json({ reviews: reviews, avgRating: avg.avgRating ? Math.round(avg.avgRating * 10) / 10 : null, count: avg.count, userReview: userReview });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews/:productId', requireUser, (req, res) => {
  try {
    var { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    var existing = db.prepare('SELECT id FROM reviews WHERE userId=? AND productId=?').get(req.user.id, req.params.productId);
    if (existing) {
      db.prepare('UPDATE reviews SET rating=?, comment=?, createdAt=datetime("now") WHERE id=?').run(rating, comment || '', existing.id);
      res.json({ message: 'Review updated' });
    } else {
      db.prepare('INSERT INTO reviews (productId, userId, rating, comment) VALUES (?, ?, ?, ?)').run(req.params.productId, req.user.id, rating, comment || '');
      res.status(201).json({ message: 'Review added' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Admin: Users Management ----
app.get('/api/admin/users', requireAuth, (req, res) => {
  try {
    var rows = db.prepare('SELECT id, name, email, phone, city, address, verified, createdAt FROM users ORDER BY createdAt DESC').all();
    // Add order count for each user
    var getOrderCount = db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE email=?');
    var users = rows.map(function (u) {
      var orderCount = getOrderCount.get(u.email);
      return { id: u.id, name: u.name, email: u.email, phone: u.phone, city: u.city, address: u.address, verified: u.verified, createdAt: u.createdAt, orderCount: orderCount ? orderCount.cnt : 0 };
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Admin: Sales Analytics ----
app.get('/api/admin/analytics', requireAuth, (req, res) => {
  try {
    var allOrders = db.prepare('SELECT * FROM orders ORDER BY date DESC').all();
    var getItems = db.prepare('SELECT name, qty, price FROM order_items WHERE order_id=?');

    // Calculate daily sales for last 30 days
    var dailySales = {};
    var weeklySales = {};
    var monthlySales = {};
    var topProducts = {};
    var totalRevenue = 0;
    var statusCounts = { Pending: 0, Shipped: 0, Delivered: 0 };

    for (var i = 0; i < allOrders.length; i++) {
      var o = allOrders[i];
      var items = getItems.all(o.id);
      var orderTotal = 0;
      for (var j = 0; j < items.length; j++) {
        var lineTotal = items[j].qty * items[j].price;
        orderTotal += lineTotal;
        // Top products
        if (!topProducts[items[j].name]) topProducts[items[j].name] = { name: items[j].name, qty: 0, revenue: 0 };
        topProducts[items[j].name].qty += items[j].qty;
        topProducts[items[j].name].revenue += lineTotal;
      }
      totalRevenue += orderTotal;
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

      // Daily
      dailySales[o.date] = (dailySales[o.date] || 0) + orderTotal;

      // Weekly (ISO week)
      var d = new Date(o.date + 'T00:00:00');
      var weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      var weekKey = weekStart.toISOString().slice(0, 10);
      weeklySales[weekKey] = (weeklySales[weekKey] || 0) + orderTotal;

      // Monthly
      var monthKey = o.date.slice(0, 7);
      monthlySales[monthKey] = (monthlySales[monthKey] || 0) + orderTotal;
    }

    // Sort top products by revenue
    var topList = Object.values(topProducts).sort(function (a, b) { return b.revenue - a.revenue; }).slice(0, 10);

    // Convert to arrays sorted by date
    var dailyArr = Object.keys(dailySales).sort().slice(-30).map(function (k) { return { date: k, revenue: dailySales[k] }; });
    var weeklyArr = Object.keys(weeklySales).sort().slice(-12).map(function (k) { return { week: k, revenue: weeklySales[k] }; });
    var monthlyArr = Object.keys(monthlySales).sort().slice(-12).map(function (k) { return { month: k, revenue: monthlySales[k] }; });

    res.json({
      totalRevenue: totalRevenue,
      totalOrders: allOrders.length,
      statusCounts: statusCounts,
      dailySales: dailyArr,
      weeklySales: weeklyArr,
      monthlySales: monthlyArr,
      topProducts: topList
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Static files ----
app.use(express.static(path.join(__dirname)));

// ---- Start Server ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
  console.log('SQLite database: peaknuts.db');
});
