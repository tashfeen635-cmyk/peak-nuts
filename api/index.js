const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// ---- Mongoose Schemas ----
const productSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  category: { type: String, required: true },
  price:    { type: Number, required: true },
  stock:    { type: String, required: true },
  image:    { type: String, default: '' }
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
  { name: 'Organic Almonds', category: 'Nuts', price: 14.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=400&h=500&fit=crop&q=80' },
  { name: 'Raw Cashews', category: 'Nuts', price: 16.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=400&h=500&fit=crop&q=80' },
  { name: 'Roasted Pistachios', category: 'Nuts', price: 19.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=500&fit=crop&q=80' },
  { name: 'Brazil Nuts', category: 'Nuts', price: 22.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=500&fit=crop&q=80' },
  { name: 'Walnut Halves', category: 'Nuts', price: 15.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400&h=500&fit=crop&q=80' },
  { name: 'Macadamia Nuts', category: 'Nuts', price: 28.00, stock: 'Low Stock', image: 'https://images.unsplash.com/photo-1509721434272-b79147e0e708?w=400&h=500&fit=crop&q=80' },
  { name: 'Pecan Pieces', category: 'Nuts', price: 20.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1564424224827-cd24b8915874?w=400&h=500&fit=crop&q=80' },
  { name: 'Hazelnut Premium', category: 'Nuts', price: 24.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1526081715791-7c538f86060e?w=400&h=500&fit=crop&q=80' },
  { name: 'Shilajit Resin', category: 'Herbs & Supplements', price: 59.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=500&fit=crop&q=80' },
  { name: 'Shilajit Capsules', category: 'Herbs & Supplements', price: 45.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&h=500&fit=crop&q=80' },
  { name: 'Ashwagandha', category: 'Herbs & Supplements', price: 24.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=500&fit=crop&q=80' },
  { name: 'Panax Ginseng', category: 'Herbs & Supplements', price: 32.00, stock: 'Low Stock', image: 'https://images.unsplash.com/photo-1580541832626-2a7131ee809f?w=400&h=500&fit=crop&q=80' },
  { name: 'Triphala', category: 'Herbs & Supplements', price: 20.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=500&fit=crop&q=80' },
  { name: 'Boswellia', category: 'Herbs & Supplements', price: 26.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400&h=500&fit=crop&q=80' },
  { name: 'Maca Root', category: 'Herbs & Supplements', price: 28.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=500&fit=crop&q=80' },
  { name: 'Gotu Kola', category: 'Herbs & Supplements', price: 22.00, stock: 'Out of Stock', image: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=400&h=500&fit=crop&q=80' },
  { name: 'Tumoro Wild Thyme Tea', category: 'Teas', price: 25.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=500&fit=crop&q=80' },
  { name: 'Tumoro Tea Loose Leaf', category: 'Teas', price: 22.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=500&fit=crop&q=80' },
  { name: 'Honey Roast Mix', category: 'Mixes & Butters', price: 17.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&h=500&fit=crop&q=80' },
  { name: 'Trail Mix Deluxe', category: 'Mixes & Butters', price: 16.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=400&h=500&fit=crop&q=80' },
  { name: 'Mixed Nut Butter', category: 'Mixes & Butters', price: 12.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&h=500&fit=crop&q=80' },
  { name: 'Turmeric Curcumin', category: 'Spices', price: 18.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1455853828816-0c301a011711?w=400&h=500&fit=crop&q=80' },
  { name: 'Cinnamon (Dal Chini)', category: 'Spices', price: 12.00, stock: 'In Stock', image: 'https://images.unsplash.com/photo-1471943311424-646960669fbc?w=400&h=500&fit=crop&q=80' }
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
