import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is not set');
  process.exit(1);
}

async function checkCategories() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const categories = await db.collection('categories').find({}).toArray();
    
    console.log(`\n📊 Total categories in database: ${categories.length}`);
    console.log('\n📋 All categories:');
    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (ID: ${cat._id})`);
      console.log(`   - Parent ID: ${cat.parentId || 'null'}`);
      console.log(`   - Active: ${cat.isActive}`);
      console.log(`   - Level: ${cat.level || 'undefined'}`);
      console.log('');
    });
    
    // Check for Basic Care specifically
    const basicCare = categories.find(cat => cat.name === 'Basic Care');
    if (basicCare) {
      console.log('✅ Found Basic Care:');
      console.log(`   - ID: ${basicCare._id}`);
      console.log(`   - Parent ID: ${basicCare.parentId}`);
      console.log(`   - Active: ${basicCare.isActive}`);
    } else {
      console.log('❌ Basic Care not found in database');
    }
    
    // Check for Skin Care
    const skinCare = categories.find(cat => cat.name === 'Skin Care');
    if (skinCare) {
      console.log('✅ Found Skin Care:');
      console.log(`   - ID: ${skinCare._id}`);
      console.log(`   - Parent ID: ${skinCare.parentId}`);
      console.log(`   - Active: ${skinCare.isActive}`);
    } else {
      console.log('❌ Skin Care not found in database');
    }
    
    // Check parent-child relationships
    console.log('\n🔗 Parent-Child Relationships:');
    categories.forEach(cat => {
      if (cat.parentId) {
        const parent = categories.find(p => p._id.toString() === cat.parentId);
        console.log(`${cat.name} → ${parent ? parent.name : 'PARENT NOT FOUND'} (${cat.parentId})`);
      } else {
        console.log(`${cat.name} → ROOT`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkCategories();
