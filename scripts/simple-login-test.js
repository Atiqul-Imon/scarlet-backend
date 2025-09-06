import express from 'express';
import { MongoClient } from 'mongodb';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://imonatikulislam:1LhIjsSyfIWCVlgz@cluster0.08anqce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const dbName = process.env.DB_NAME || 'scarlet';
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

let db;

// Connect to MongoDB
const client = new MongoClient(mongoUri);
await client.connect();
db = client.db(dbName);
console.log('✅ Connected to MongoDB');

// Simple login endpoint
app.post('/api/test-login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    console.log('🔍 Test login request:', { identifier, password: password ? '[PROVIDED]' : '[MISSING]' });
    
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Identifier and password required', code: 'MISSING_FIELDS' }
      });
    }
    
    // Find user
    const user = await db.collection('users').findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier }
      ]
    });
    
    console.log('   User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }
      });
    }
    
    // Verify password
    const isValid = await argon2.verify(user.passwordHash, password);
    console.log('   Password valid:', isValid);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }
      });
    }
    
    // Generate token
    const token = jwt.sign(
      { sub: user._id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
    );
    
    console.log('   ✅ Login successful');
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        tokens: {
          accessToken: token,
          refreshToken: token // Using same token for simplicity
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', code: 'INTERNAL_ERROR' }
    });
  }
});

// Health check
app.get('/api/test-health', (req, res) => {
  res.json({ success: true, message: 'Simple test server running' });
});

const PORT = 4001;
app.listen(PORT, () => {
  console.log(`🚀 Simple test server running on http://localhost:${PORT}`);
  console.log(`   Test login: POST http://localhost:${PORT}/api/test-login`);
  console.log(`   Health: GET http://localhost:${PORT}/api/test-health`);
});
