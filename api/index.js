const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

// ---- Auth Setup ----
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'PeakNuts2026!';

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
  var resetLink = (process.env.SITE_URL || 'https://peaknuts.com') + '/account.html?reset=' + resetToken;
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
  var verifyLink = (process.env.SITE_URL || 'https://peaknuts.com') + '/account.html?verify=' + verifyToken;
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
app.use(express.json({ limit: '10mb' }));

// ---- Rate Limiting for Auth Endpoints ----
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again after 15 minutes' }
});

app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/user/login', authLimiter);
app.use('/api/forgot-password', authLimiter);

// ---- Mongoose Schemas ----
const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  category:    { type: String, required: true },
  price:       { type: Number, required: true },
  stock:       { type: String, required: true },
  image:       { type: String, default: '' },
  section:     { type: String, default: '' },
  badge:       { type: String, default: '' },
  oldPrice:    { type: Number, default: 0 },
  rating:      { type: Number, default: 5 },
  description: { type: String, default: '' },
  urduName:    { type: String, default: '' }
});

const orderSchema = new mongoose.Schema({
  orderId:  { type: String, required: true, unique: true },
  customer: { type: String, required: true },
  email:    { type: String, default: '' },
  phone:    { type: String, default: '' },
  city:     { type: String, default: '' },
  address:  { type: String, default: '' },
  status:   { type: String, required: true },
  date:     { type: String, required: true },
  items: [{
    name:  String,
    qty:   Number,
    price: Number
  }]
});

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true },
  date:  { type: String, required: true }
});

const revenueSchema = new mongoose.Schema({
  labels: [String],
  values: [Number]
});

const tokenSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

const Product    = mongoose.models.Product    || mongoose.model('Product', productSchema);
const Order      = mongoose.models.Order      || mongoose.model('Order', orderSchema);
const Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema);
const Revenue    = mongoose.models.Revenue    || mongoose.model('Revenue', revenueSchema);
const Token      = mongoose.models.Token      || mongoose.model('Token', tokenSchema);

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  salt:      { type: String, required: true },
  phone:     { type: String, default: '' },
  city:      { type: String, default: '' },
  address:   { type: String, default: '' },
  verified:  { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const userTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

const passwordResetTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 }
});

const emailVerificationTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  createdAt: { type: Date, default: Date.now }
});
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

const User      = mongoose.models.User      || mongoose.model('User', userSchema);
const UserToken = mongoose.models.UserToken || mongoose.model('UserToken', userTokenSchema);
const PasswordResetToken = mongoose.models.PasswordResetToken || mongoose.model('PasswordResetToken', passwordResetTokenSchema);
const EmailVerificationToken = mongoose.models.EmailVerificationToken || mongoose.model('EmailVerificationToken', emailVerificationTokenSchema);
const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);
const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

// ---- Auth Middleware ----
async function requireAuth(req, res, next) {
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  var tokenStr = authHeader.slice(7);
  try {
    await connectDB();
    var found = await Token.findOne({ token: tokenStr });
    if (!found) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ---- User Auth Middleware ----
async function requireUser(req, res, next) {
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  var tokenStr = authHeader.slice(7);
  try {
    await connectDB();
    var found = await UserToken.findOne({ token: tokenStr });
    if (!found) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    var user = await User.findById(found.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

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

// ---- MongoDB Connection (cached for serverless) ----
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI env variable is not set');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  isConnected = true;
}

// Debug endpoint to check connection
app.get('/api/debug', async (req, res) => {
  try {
    const uri = process.env.MONGO_URI;
    const masked = uri ? uri.replace(/:([^@]+)@/, ':****@') : 'NOT SET';
    await connectDB();
    res.json({ status: 'connected', uri: masked });
  } catch (err) {
    const uri = process.env.MONGO_URI;
    const masked = uri ? uri.replace(/:([^@]+)@/, ':****@') : 'NOT SET';
    res.status(500).json({ status: 'failed', error: err.message, uri: masked });
  }
});

// ---- Auth Endpoints ----
app.post('/api/login', async (req, res) => {
  try {
    await connectDB();
    var { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    var token = crypto.randomBytes(32).toString('hex');
    await Token.create({ token: token });
    res.json({ token: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logout', requireAuth, async (req, res) => {
  try {
    var authHeader = req.headers.authorization;
    var token = authHeader.slice(7);
    await Token.deleteOne({ token: token });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- API Routes ----

app.post('/api/seed', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const [pc, oc, sc, rc] = await Promise.all([
      Product.countDocuments(), Order.countDocuments(),
      Subscriber.countDocuments(), Revenue.countDocuments()
    ]);
    if (pc === 0) await Product.insertMany(seedProducts);
    if (oc === 0) await Order.insertMany(seedOrders);
    if (sc === 0) await Subscriber.insertMany(seedSubscribers);
    if (rc === 0) await Revenue.create(seedRevenue);

    // Migrate: add images to existing products that don't have them
    const imageMap = {};
    seedProducts.forEach(function (p) { imageMap[p.name] = p.image; });
    const noImage = await Product.find({ $or: [{ image: { $exists: false } }, { image: '' }] });
    for (const p of noImage) {
      if (imageMap[p.name]) {
        p.image = imageMap[p.name];
        await p.save();
      }
    }

    // Migrate: add section data to existing products that don't have it
    const sectionMap = {};
    seedProducts.forEach(function (p) { sectionMap[p.name] = p; });
    const noSection = await Product.find({ $or: [{ section: { $exists: false } }, { section: '' }] });
    for (const p of noSection) {
      var seed = sectionMap[p.name];
      if (seed) {
        p.section = seed.section || '';
        p.badge = seed.badge || '';
        p.oldPrice = seed.oldPrice || 0;
        p.rating = seed.rating || 5;
        p.description = seed.description || '';
        p.urduName = seed.urduName || '';
        await p.save();
      }
    }

    res.json({ message: 'Seed complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    await connectDB();
    res.json(await Product.find());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    await connectDB();
    res.json(await Order.find().sort({ date: -1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    await connectDB();
    const { customer, email, phone, city, address, items } = req.body;
    if (!customer || !email || !phone || !city || !address || !items || !items.length) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Generate orderId: find max existing PN-XXXX and increment
    const lastOrder = await Order.findOne().sort({ _id: -1 }).limit(1);
    let nextNum = 1011;
    if (lastOrder && lastOrder.orderId) {
      const match = lastOrder.orderId.match(/PN-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const orderId = 'PN-' + nextNum;
    const date = new Date().toISOString().slice(0, 10);
    const status = 'Pending';

    const order = await Order.create({ orderId, customer, email, phone, city, address, status, date, items });
    await sendOrderConfirmationEmail(email, order);

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const oldOrder = await Order.findById(req.params.id);
    if (!oldOrder) return res.status(404).json({ error: 'Order not found' });
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    // Send status notification email
    if (req.body.status && order.email && (req.body.status === 'Shipped' || req.body.status === 'Delivered')) {
      sendOrderStatusEmail(order.email, order, req.body.status);
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/subscribers', requireAuth, async (req, res) => {
  try {
    await connectDB();
    res.json(await Subscriber.find());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subscribers/:id', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const sub = await Subscriber.findByIdAndDelete(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscriber not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscribers', async (req, res) => {
  try {
    await connectDB();
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const existing = await Subscriber.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Already subscribed' });
    const date = new Date().toISOString().slice(0, 10);
    await Subscriber.create({ email, date });
    var emailStatus = 'sent';
    try {
      await sendWelcomeEmail(email);
    } catch (emailErr) {
      emailStatus = 'failed: ' + emailErr.message;
    }
    res.status(201).json({ message: 'Subscribed successfully', email_status: emailStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/revenue', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const revenue = await Revenue.findOne();
    res.json(revenue || { labels: [], values: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- User Account Endpoints ----

app.post('/api/register', async (req, res) => {
  try {
    await connectDB();
    var { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    var existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    var hashed = hashPassword(password);
    var user = await User.create({
      name: name,
      email: email.toLowerCase(),
      password: hashed.hash,
      salt: hashed.salt,
      verified: false
    });

    // Send verification email
    var verifyToken = crypto.randomBytes(32).toString('hex');
    await EmailVerificationToken.create({ token: verifyToken, userId: user._id });
    sendVerificationEmail(user.email, verifyToken);

    var token = crypto.randomBytes(32).toString('hex');
    await UserToken.create({ token: token, userId: user._id });
    res.status(201).json({
      token: token,
      profile: { name: user.name, email: user.email, phone: user.phone, city: user.city, address: user.address },
      needsVerification: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/login', async (req, res) => {
  try {
    await connectDB();
    var { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    var user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!verifyPassword(password, user.password, user.salt)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    var token = crypto.randomBytes(32).toString('hex');
    await UserToken.create({ token: token, userId: user._id });
    res.json({
      token: token,
      profile: { name: user.name, email: user.email, phone: user.phone, city: user.city, address: user.address }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/logout', requireUser, async (req, res) => {
  try {
    var authHeader = req.headers.authorization;
    var token = authHeader.slice(7);
    await UserToken.deleteOne({ token: token });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/profile', requireUser, async (req, res) => {
  try {
    var user = req.user;
    res.json({ name: user.name, email: user.email, phone: user.phone, city: user.city, address: user.address });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/user/profile', requireUser, async (req, res) => {
  try {
    var { name, phone, city, address } = req.body;
    var user = req.user;
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (city !== undefined) user.city = city;
    if (address !== undefined) user.address = address;
    await user.save();
    res.json({ name: user.name, email: user.email, phone: user.phone, city: user.city, address: user.address });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/orders', requireUser, async (req, res) => {
  try {
    await connectDB();
    var userOrders = await Order.find({ email: req.user.email }).sort({ date: -1 });
    res.json(userOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Forgot Password ----
app.post('/api/forgot-password', async (req, res) => {
  try {
    await connectDB();
    var { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    var user = await User.findOne({ email: email.toLowerCase() });
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If an account exists, a reset link has been sent.' });
    // Delete old reset tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id });
    var token = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({ token: token, userId: user._id });
    sendPasswordResetEmail(user.email, token);
    res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    await connectDB();
    var { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    var resetToken = await PasswordResetToken.findOne({ token: token });
    if (!resetToken) return res.status(400).json({ error: 'Invalid or expired reset link' });
    // Check expiry (1 hour)
    if (Date.now() - resetToken.createdAt.getTime() > 60 * 60 * 1000) {
      await PasswordResetToken.deleteOne({ token: token });
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }
    var hashed = hashPassword(password);
    await User.findByIdAndUpdate(resetToken.userId, { password: hashed.hash, salt: hashed.salt });
    await PasswordResetToken.deleteMany({ userId: resetToken.userId });
    res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Email Verification ----
app.get('/api/verify-email', async (req, res) => {
  try {
    await connectDB();
    var token = req.query.token;
    if (!token) return res.status(400).json({ error: 'Token is required' });
    var verifyToken = await EmailVerificationToken.findOne({ token: token });
    if (!verifyToken) return res.status(400).json({ error: 'Invalid or expired verification link' });
    // Check expiry (24 hours)
    if (Date.now() - verifyToken.createdAt.getTime() > 24 * 60 * 60 * 1000) {
      await EmailVerificationToken.deleteOne({ token: token });
      return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
    }
    await User.findByIdAndUpdate(verifyToken.userId, { verified: true });
    await EmailVerificationToken.deleteMany({ userId: verifyToken.userId });
    res.json({ message: 'Email verified successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/resend-verification', requireUser, async (req, res) => {
  try {
    await connectDB();
    var user = req.user;
    if (user.verified) return res.json({ message: 'Email already verified' });
    await EmailVerificationToken.deleteMany({ userId: user._id });
    var token = crypto.randomBytes(32).toString('hex');
    await EmailVerificationToken.create({ token: token, userId: user._id });
    sendVerificationEmail(user.email, token);
    res.json({ message: 'Verification email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Wishlist Endpoints ----
app.get('/api/user/wishlist', requireUser, async (req, res) => {
  try {
    await connectDB();
    var items = await Wishlist.find({ userId: req.user._id }).sort({ createdAt: -1 });
    // Populate product details
    var result = [];
    for (var i = 0; i < items.length; i++) {
      var product = await Product.findById(items[i].productId);
      if (product) {
        result.push({
          _id: items[i]._id,
          productId: items[i].productId,
          createdAt: items[i].createdAt,
          name: product.name,
          price: product.price,
          image: product.image,
          category: product.category,
          stock: product.stock,
          badge: product.badge,
          oldPrice: product.oldPrice,
          rating: product.rating,
          description: product.description,
          urduName: product.urduName,
          section: product.section
        });
      }
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/wishlist', requireUser, async (req, res) => {
  try {
    await connectDB();
    var { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Product ID is required' });
    var existing = await Wishlist.findOne({ userId: req.user._id, productId: productId });
    if (existing) return res.status(409).json({ error: 'Already in wishlist' });
    await Wishlist.create({ userId: req.user._id, productId: productId });
    res.status(201).json({ message: 'Added to wishlist' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/user/wishlist/:productId', requireUser, async (req, res) => {
  try {
    await connectDB();
    var result = await Wishlist.deleteOne({ userId: req.user._id, productId: req.params.productId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Not in wishlist' });
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Reviews Endpoints ----
app.get('/api/reviews/:productId', async (req, res) => {
  try {
    await connectDB();
    var reviews = await Review.find({ productId: req.params.productId }).sort({ createdAt: -1 });
    // Populate user names
    var result = [];
    for (var i = 0; i < reviews.length; i++) {
      var user = await User.findById(reviews[i].userId);
      result.push({
        _id: reviews[i]._id,
        rating: reviews[i].rating,
        comment: reviews[i].comment,
        createdAt: reviews[i].createdAt,
        userName: user ? user.name : 'Unknown'
      });
    }
    // Calculate average
    var totalRating = 0;
    for (var j = 0; j < reviews.length; j++) {
      totalRating += reviews[j].rating;
    }
    var avgRating = reviews.length > 0 ? Math.round((totalRating / reviews.length) * 10) / 10 : null;
    res.json({ reviews: result, avgRating: avgRating, count: reviews.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews/:productId', requireUser, async (req, res) => {
  try {
    await connectDB();
    var { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    var existing = await Review.findOne({ userId: req.user._id, productId: req.params.productId });
    if (existing) {
      existing.rating = rating;
      existing.comment = comment || '';
      existing.createdAt = new Date();
      await existing.save();
      res.json({ message: 'Review updated' });
    } else {
      await Review.create({ productId: req.params.productId, userId: req.user._id, rating: rating, comment: comment || '' });
      res.status(201).json({ message: 'Review added' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Admin: Users Management ----
app.get('/api/admin/users', requireAuth, async (req, res) => {
  try {
    await connectDB();
    var users = await User.find({}, 'name email phone city address verified createdAt').sort({ createdAt: -1 });
    var result = [];
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      var orderCount = await Order.countDocuments({ email: u.email });
      result.push({
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        city: u.city,
        address: u.address,
        verified: u.verified,
        createdAt: u.createdAt,
        orderCount: orderCount
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Admin: Sales Analytics ----
app.get('/api/admin/analytics', requireAuth, async (req, res) => {
  try {
    await connectDB();
    var allOrders = await Order.find().sort({ date: -1 });

    // Calculate daily sales for last 30 days
    var dailySales = {};
    var weeklySales = {};
    var monthlySales = {};
    var topProducts = {};
    var totalRevenue = 0;
    var statusCounts = { Pending: 0, Shipped: 0, Delivered: 0 };

    for (var i = 0; i < allOrders.length; i++) {
      var o = allOrders[i];
      var orderTotal = 0;
      for (var j = 0; j < o.items.length; j++) {
        var lineTotal = o.items[j].qty * o.items[j].price;
        orderTotal += lineTotal;
        // Top products
        var pName = o.items[j].name;
        if (!topProducts[pName]) topProducts[pName] = { name: pName, qty: 0, revenue: 0 };
        topProducts[pName].qty += o.items[j].qty;
        topProducts[pName].revenue += lineTotal;
      }
      totalRevenue += orderTotal;
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

      // Daily
      dailySales[o.date] = (dailySales[o.date] || 0) + orderTotal;

      // Weekly (week start = Sunday)
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

module.exports = app;
