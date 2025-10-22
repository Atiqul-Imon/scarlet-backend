import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/scarlet';

async function addSearchIndexes() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log('🔍 Connecting to MongoDB...');
    await client.connect();
    const db = client.db();
    
    console.log('📊 Creating enhanced search indexes...');
    
    // Drop existing text index if it exists
    try {
      await db.collection('products').dropIndex('title_text_description_text_brand_text');
    } catch (error) {
      // Index might not exist, that's okay
    }
    
    // Create weighted text search index
    await db.collection('products').createIndex(
      { 
        title: "text", 
        description: "text", 
        brand: "text",
        tags: "text",
        "attributes.value": "text"
      },
      { 
        weights: {
          title: 10,        // Highest priority
          brand: 5,
          tags: 3,
          description: 1,
          "attributes.value": 1
        },
        name: "product_search_index"
      }
    );
    
    // Compound indexes for filtering + search
    await db.collection('products').createIndex({ brand: 1, "price.amount": 1 });
    await db.collection('products').createIndex({ categoryIds: 1, "price.amount": 1 });
    await db.collection('products').createIndex({ isBestSeller: 1, "rating.average": -1 });
    await db.collection('products').createIndex({ isNewArrival: 1, "rating.average": -1 });
    await db.collection('products').createIndex({ stock: 1, "price.amount": 1 });
    
    // Index for autocomplete suggestions
    await db.collection('products').createIndex({ title: 1, brand: 1 });
    await db.collection('products').createIndex({ tags: 1 });
    
    console.log('✅ Search indexes created successfully!');
    console.log('📈 Indexes added:');
    console.log('   - Weighted text search (title:10, brand:5, tags:3, description:1)');
    console.log('   - Brand + price compound index');
    console.log('   - Category + price compound index');
    console.log('   - Best seller + rating compound index');
    console.log('   - New arrival + rating compound index');
    console.log('   - Stock + price compound index');
    console.log('   - Title + brand for autocomplete');
    console.log('   - Tags index for tag suggestions');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addSearchIndexes()
    .then(() => {
      console.log('🎉 Index creation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Index creation failed:', error);
      process.exit(1);
    });
}

export { addSearchIndexes };
