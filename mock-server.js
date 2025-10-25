const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock data storage
let orders = [];
let users = [];
let orderCounter = 1;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication endpoints
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  // Create new user
  const user = {
    id: users.length + 1,
    username,
    email,
    password, // In real app, this would be hashed
    createdAt: new Date().toISOString()
  };
  
  users.push(user);
  
  // Generate mock JWT token
  const token = Buffer.from(JSON.stringify({ id: user.id, email: user.email })).toString('base64');
  
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Find user
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate mock JWT token
  const token = Buffer.from(JSON.stringify({ id: user.id, email: user.email })).toString('base64');
  
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email }
  });
});

// Orders endpoints
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const orderData = req.body;
  
  const order = {
    id: `ORD-${orderCounter++}`,
    ...orderData,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  orders.unshift(order);
  
  // Emit to Socket.IO clients if connected
  if (global.io) {
    global.io.emit('orderCreated', order);
  }
  
  res.status(201).json(order);
});

app.get('/api/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

app.patch('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const order = orders.find(o => o.id === req.params.id);
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  order.status = status;
  order.updatedAt = new Date().toISOString();
  
  // Emit to Socket.IO clients if connected
  if (global.io) {
    global.io.emit('orderStatusUpdated', { orderId: order.id, status, order });
  }
  
  res.json(order);
});

// Socket.IO setup
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

global.io = io;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Test real-time order updates
  socket.on('requestOrderUpdate', (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      socket.emit('orderUpdate', order);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Mock API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth endpoints: /api/auth/login, /api/auth/register`);
  console.log(`📦 Orders endpoint: /api/orders`);
  console.log(`⚡ Socket.IO enabled for real-time features`);
});