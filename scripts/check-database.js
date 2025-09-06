import { MongoClient } from 'mongodb'; 
import { config } from 'dotenv';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://imonatikulislam:1LhIjsSyfIWCVlgz@cluster0.08anqce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'scarlet';

async function checkDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Check products collection
    const products = await db.collection('products').find({}).toArray();
    console.log(`Products count: ${products.length}`);
    
    if (products.length > 0) {
      console.log('Sample product:', JSON.stringify(products[0], null, 2));
    }
    
    // Check all collections for any product data
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`Collection ${collection.name}: ${count} documents`);
      
      if (count > 0) {
        const sample = await db.collection(collection.name).findOne({});
        console.log(`Sample from ${collection.name}:`, JSON.stringify(sample, null, 2));
      }
    }
    
    // Search for the specific product you mentioned
    console.log('\n🔍 Searching for "La Roche-Posay Anthelios Ultra Light SPF 60"...');
    for (const collection of collections) {
      const product = await db.collection(collection.name).findOne({
        $or: [
          { name: { $regex: 'La Roche-Posay', $options: 'i' } },
          { title: { $regex: 'La Roche-Posay', $options: 'i' } },
          { productName: { $regex: 'La Roche-Posay', $options: 'i' } },
          { description: { $regex: 'La Roche-Posay', $options: 'i' } }
        ]
      });
      
      if (product) {
        console.log(`✅ Found product in collection ${collection.name}:`, JSON.stringify(product, null, 2));
      }
    }
    
    // Check if there are any other product-related collections
    const productCollections = collections.filter(c => 
      c.name.includes('product') || c.name.includes('catalog')
    );
    console.log('Product-related collections:', productCollections.map(c => c.name));
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await client.close();
  }
}

checkDatabase();
