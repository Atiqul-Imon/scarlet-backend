import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://imonatikulislam:1LhIjsSyfIWCVlgz@cluster0.08anqce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function checkCategories() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('scarlet');
    const categories = await db.collection('categories').find({}).toArray();
    
    console.log('📊 Current categories in database:');
    console.log('Total count:', categories.length);
    console.log('Categories:');
    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (${cat.slug}) - Active: ${cat.isActive}`);
    });
    
    return categories.length;
  } catch (error) {
    console.error('Error checking categories:', error);
    return 0;
  } finally {
    await client.close();
  }
}

checkCategories();
