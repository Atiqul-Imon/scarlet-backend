import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://imonatikulislam:1LhIjsSyfIWCVlgz@cluster0.08anqce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'scarlet';

async function populateInventory() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Get all products
    const products = await db.collection('products').find({}).toArray();
    console.log(`Found ${products.length} products`);
    
    // Create inventory items for each product
    const inventoryItems = products.map(product => ({
      productId: product._id.toString(),
      sku: product.sku || `SKU-${product._id.toString().slice(-8)}`,
      currentStock: product.stock || 0,
      reservedStock: 0,
      availableStock: product.stock || 0,
      minStockLevel: 5, // Default minimum stock level
      maxStockLevel: 100, // Default maximum stock level
      reorderPoint: 10, // Default reorder point
      costPrice: product.costPrice || (product.price?.amount * 0.6) || 0, // 60% of selling price as cost
      sellingPrice: product.price?.amount || 0,
      supplier: product.brand || 'Unknown',
      location: 'Main Warehouse',
      lastRestocked: new Date().toISOString(),
      lastSold: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    // Insert inventory items
    if (inventoryItems.length > 0) {
      const result = await db.collection('inventory').insertMany(inventoryItems);
      console.log(`Created ${result.insertedCount} inventory items`);
    }
    
    // Also create some sample stock movements
    const stockMovements = inventoryItems.map(item => ({
      productId: item.productId,
      sku: item.sku,
      type: 'in',
      quantity: item.currentStock,
      previousStock: 0,
      newStock: item.currentStock,
      reason: 'Initial inventory setup',
      reference: 'INITIAL_SETUP',
      userId: 'system',
      notes: 'Initial inventory population from products',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    if (stockMovements.length > 0) {
      const movementsResult = await db.collection('stock_movements').insertMany(stockMovements);
      console.log(`Created ${movementsResult.insertedCount} stock movements`);
    }
    
    console.log('Inventory population completed successfully!');
    
  } catch (error) {
    console.error('Error populating inventory:', error);
  } finally {
    await client.close();
  }
}

populateInventory();
