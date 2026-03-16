const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// ---- Mongoose Schemas ----
const productSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  category: { type: String, required: true },
  price:    { type: Number, required: true },
  stock:    { type: String, required: true }
});

const orderSchema = new mongoose.Schema({
  orderId:  { type: String, required: true, unique: true },
  customer: { type: String, required: true },
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

const Product    = mongoose.models.Product    || mongoose.model('Product', productSchema);
const Order      = mongoose.models.Order      || mongoose.model('Order', orderSchema);
const Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema);
const Revenue    = mongoose.models.Revenue    || mongoose.model('Revenue', revenueSchema);

// ---- Seed Data ----
const seedProducts = [
  { name: 'Organic Almonds', category: 'Nuts', price: 14.00, stock: 'In Stock' },
  { name: 'Raw Cashews', category: 'Nuts', price: 16.00, stock: 'In Stock' },
  { name: 'Roasted Pistachios', category: 'Nuts', price: 19.00, stock: 'In Stock' },
  { name: 'Brazil Nuts', category: 'Nuts', price: 22.00, stock: 'In Stock' },
  { name: 'Walnut Halves', category: 'Nuts', price: 15.00, stock: 'In Stock' },
  { name: 'Macadamia Nuts', category: 'Nuts', price: 28.00, stock: 'Low Stock' },
  { name: 'Pecan Pieces', category: 'Nuts', price: 20.00, stock: 'In Stock' },
  { name: 'Hazelnut Premium', category: 'Nuts', price: 24.00, stock: 'In Stock' },
  { name: 'Shilajit Resin', category: 'Herbs & Supplements', price: 59.00, stock: 'In Stock' },
  { name: 'Shilajit Capsules', category: 'Herbs & Supplements', price: 45.00, stock: 'In Stock' },
  { name: 'Ashwagandha', category: 'Herbs & Supplements', price: 24.00, stock: 'In Stock' },
  { name: 'Panax Ginseng', category: 'Herbs & Supplements', price: 32.00, stock: 'Low Stock' },
  { name: 'Triphala', category: 'Herbs & Supplements', price: 20.00, stock: 'In Stock' },
  { name: 'Boswellia', category: 'Herbs & Supplements', price: 26.00, stock: 'In Stock' },
  { name: 'Maca Root', category: 'Herbs & Supplements', price: 28.00, stock: 'In Stock' },
  { name: 'Gotu Kola', category: 'Herbs & Supplements', price: 22.00, stock: 'Out of Stock' },
  { name: 'Tumoro Wild Thyme Tea', category: 'Teas', price: 25.00, stock: 'In Stock' },
  { name: 'Tumoro Tea Loose Leaf', category: 'Teas', price: 22.00, stock: 'In Stock' },
  { name: 'Honey Roast Mix', category: 'Mixes & Butters', price: 17.00, stock: 'In Stock' },
  { name: 'Trail Mix Deluxe', category: 'Mixes & Butters', price: 16.00, stock: 'In Stock' },
  { name: 'Mixed Nut Butter', category: 'Mixes & Butters', price: 12.00, stock: 'In Stock' },
  { name: 'Turmeric Curcumin', category: 'Spices', price: 18.00, stock: 'In Stock' },
  { name: 'Cinnamon (Dal Chini)', category: 'Spices', price: 12.00, stock: 'In Stock' }
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

// ---- API Routes ----

app.post('/api/seed', async (req, res) => {
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

app.post('/api/products', async (req, res) => {
  try {
    await connectDB();
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
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

app.put('/api/orders/:id', async (req, res) => {
  try {
    await connectDB();
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/subscribers', async (req, res) => {
  try {
    await connectDB();
    res.json(await Subscriber.find());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/revenue', async (req, res) => {
  try {
    await connectDB();
    const revenue = await Revenue.findOne();
    res.json(revenue || { labels: [], values: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
