# GasFill Backend API

Modern Node.js backend for the GasFill LPG cylinder delivery platform.

## 🚀 Quick Start

```bash
# Setup the project
npm run setup

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📋 Prerequisites

- Node.js 16+ 
- MongoDB 4.4+
- Redis (optional, for caching)

## 🔧 Configuration

1. Copy `.env.example` to `.env`
2. Update environment variables with your values
3. Ensure MongoDB is running

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product details

### Riders
- `GET /api/riders/available-orders` - Get available orders
- `POST /api/riders/accept-order/:id` - Accept order
- `PUT /api/riders/location` - Update location

## 🛠 Development

```bash
# Run tests
npm test

# Run with file watching
npm run dev

# Lint code
npm run lint
```

## 🏗 Architecture

- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Express Validator** - Input validation

## 📊 Features

- ✅ User authentication & authorization
- ✅ Real-time order tracking
- ✅ Rider management system
- ✅ Payment processing integration
- ✅ SMS & WhatsApp notifications
- ✅ Geographic services
- ✅ Analytics & reporting

## 🔒 Security

- Rate limiting
- Input validation & sanitization
- Helmet.js security headers
- CORS configuration
- Password hashing with bcrypt
- JWT token authentication

## 📈 Monitoring

Health check endpoint: `GET /health`

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-23T...",
  "version": "1.0.0",
  "environment": "development"
}
```