# Scarlet E-Commerce Backend API

A robust Node.js/Express backend API for the Scarlet e-commerce platform, optimized for MongoDB Atlas.

## 🔒 Security Notice

**IMPORTANT**: Never commit your `.env` file to version control! It contains sensitive information like database credentials and JWT secrets. The `.env` file is already included in `.gitignore` to prevent accidental commits.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account
- npm or yarn

### 1. Environment Setup

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Then edit the `.env` file with your actual configuration:

```bash
# Environment Configuration
NODE_ENV=development
PORT=4000

# MongoDB Atlas Configuration
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/scarlet?retryWrites=true&w=majority

# Optional: Override database name
DB_NAME=scarlet

# JWT Secret (Generate a secure random string)
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production

# API Configuration
API_BASE_URL=http://localhost:4000/api
FRONTEND_URL=http://localhost:3000
```

### 2. MongoDB Atlas Connection String

Replace the placeholder values in your MongoDB Atlas connection string:

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/scarlet?retryWrites=true&w=majority
```

- `<username>`: Your MongoDB Atlas username
- `<password>`: Your MongoDB Atlas password  
- `<cluster>`: Your cluster name (e.g., cluster0.abc123.mongodb.net)

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start

# Type checking only
npm run typecheck
```

## 🏗️ MongoDB Atlas Optimizations

The backend is specifically optimized for MongoDB Atlas with:

### Connection Features
- **Connection pooling** (5-20 connections)
- **Automatic retries** for reads and writes
- **Compression** (snappy, zlib) for network efficiency
- **TLS encryption** for Atlas connections
- **Replica set** read preferences
- **Connection monitoring** and health checks

### Performance Optimizations
- **Write concern** with majority acknowledgment
- **Read preference** set to primaryPreferred
- **Connection timeout** and retry settings
- **Heartbeat monitoring** every 10 seconds
- **Graceful shutdown** handling

## 📡 API Endpoints

### Health Checks
- `GET /api/health` - Basic health status
- `GET /api/health/detailed` - Detailed system health
- `GET /api/health/database` - MongoDB Atlas specific health

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Catalog
- `GET /api/catalog/categories` - Get all categories
- `GET /api/catalog/products` - Get products with filters
- `GET /api/catalog/products/:id` - Get single product

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items` - Update cart item
- `DELETE /api/cart/items/:productId` - Remove item from cart

### Orders
- `GET /api/orders` - Get user's orders
- `POST /api/orders/create` - Create new order
- `GET /api/orders/:id` - Get specific order

### Users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update user profile

## 🛡️ Security Features

- **JWT Authentication** with secure tokens
- **Password hashing** with Argon2
- **Rate limiting** to prevent abuse
- **CORS** configuration for frontend
- **Helmet** for security headers
- **Request compression** for performance

## 🔧 Database Schema

### Optimized for Bangladesh E-commerce

```javascript
// Products Collection
{
  _id: ObjectId,
  title: "Vitamin C Serum",
  slug: "vitamin-c-serum",
  price: {
    currency: "BDT",  // Bangladeshi Taka
    amount: 2499      // Price in paisa (like cents)
  },
  inventory: {
    stock: 150,
    reserved: 10,
    sold: 340
  },
  shipping: {
    zones: {
      dhaka: { cost: 60, time: "1-2 days" },
      chittagong: { cost: 120, time: "3-4 days" }
    }
  }
}

// Users Collection with Bangladesh addresses
{
  _id: ObjectId,
  email: "user@example.com",
  addresses: [{
    division: "Dhaka",
    district: "Dhaka", 
    area: "Dhanmondi",
    address: "Road 15, House 25",
    postalCode: "1209"
  }]
}

// Orders with local payment methods
{
  _id: ObjectId,
  payment: {
    method: "bkash",        // Popular in Bangladesh
    transactionId: "8N5A7X9M2K",
    gateway: "bKash"
  },
  shipping: {
    provider: "Pathao",     // Local delivery partner
    zone: "dhaka-inside"
  }
}
```

## 🚀 Production Deployment

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=4000
MONGO_URI=mongodb+srv://prod-user:secure-password@production-cluster.mongodb.net/scarlet?retryWrites=true&w=majority
JWT_SECRET=your-ultra-secure-production-jwt-secret-256-bits-minimum
API_BASE_URL=https://api.yourdomain.com/api
FRONTEND_URL=https://yourdomain.com
```

### MongoDB Atlas Production Setup

1. **Create production cluster** in Singapore region (closest to Bangladesh)
2. **Enable backup** with point-in-time recovery
3. **Set up monitoring** and alerts
4. **Configure IP whitelist** for your servers
5. **Use dedicated users** with minimal required permissions

### Recommended Atlas Configuration

```javascript
// Production cluster settings
{
  region: "ap-southeast-1",      // Singapore (closest to Bangladesh)
  tier: "M10",                   // Minimum for production
  backup: true,                  // Point-in-time recovery
  monitoring: true,              // Performance insights
  autoScaling: {
    compute: true,
    storage: true
  }
}
```

## 📊 Monitoring and Health Checks

### Health Check Endpoints

```bash
# Basic health check
curl http://localhost:4000/api/health

# Detailed system health
curl http://localhost:4000/api/health/detailed

# MongoDB Atlas status
curl http://localhost:4000/api/health/database
```

### MongoDB Atlas Monitoring

The backend provides detailed MongoDB stats:

```json
{
  "database": "scarlet",
  "collections": 8,
  "objects": 15420,
  "dataSize": 12458752,
  "storageSize": 8192000,
  "connections": {
    "current": 5,
    "available": 495
  },
  "uptime": 86400,
  "version": "7.0.4"
}
```

## 🔍 Troubleshooting

### Common MongoDB Atlas Issues

1. **Connection timeout**: Check IP whitelist and network connectivity
2. **Authentication failed**: Verify username/password in connection string
3. **Database not found**: Check database name in connection string
4. **Connection pool exhausted**: Increase maxPoolSize in mongoOptions

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development DEBUG=* npm run dev
```

## 📚 Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Node.js MongoDB Driver](https://mongodb.github.io/node-mongodb-native/)
- [Express.js Documentation](https://expressjs.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
