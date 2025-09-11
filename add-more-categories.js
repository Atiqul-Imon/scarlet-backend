import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://imonatikulislam:1LhIjsSyfIWCVlgz@cluster0.08anqce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Additional categories to reach at least 15
const additionalCategories = [
  {
    name: 'Face Masks',
    slug: 'face-masks',
    description: 'Hydrating and purifying face masks for all skin types',
    isActive: true,
    sortOrder: 13,
    icon: '🎭'
  },
  {
    name: 'Eye Care',
    slug: 'eye-care',
    description: 'Specialized eye creams and treatments',
    isActive: true,
    sortOrder: 14,
    icon: '👁️'
  },
  {
    name: 'Acne Treatment',
    slug: 'acne-treatment',
    description: 'Products to treat and prevent acne breakouts',
    isActive: true,
    sortOrder: 15,
    icon: '🔬'
  },
  {
    name: 'Anti-Aging',
    slug: 'anti-aging',
    description: 'Anti-aging serums and creams for mature skin',
    isActive: true,
    sortOrder: 16,
    icon: '✨'
  },
  {
    name: 'Sensitive Skin',
    slug: 'sensitive-skin',
    description: 'Gentle products for sensitive and reactive skin',
    isActive: true,
    sortOrder: 17,
    icon: '🤲'
  },
  {
    name: 'Oily Skin',
    slug: 'oily-skin',
    description: 'Oil-control products for oily and combination skin',
    isActive: true,
    sortOrder: 18,
    icon: '💧'
  },
  {
    name: 'Dry Skin',
    slug: 'dry-skin',
    description: 'Intensive hydration for dry and dehydrated skin',
    isActive: true,
    sortOrder: 19,
    icon: '🌊'
  },
  {
    name: 'Hair Styling',
    slug: 'hair-styling',
    description: 'Hair styling products and tools',
    isActive: true,
    sortOrder: 20,
    icon: '💇‍♀️'
  },
  {
    name: 'Hair Color',
    slug: 'hair-color',
    description: 'Hair coloring products and treatments',
    isActive: true,
    sortOrder: 21,
    icon: '🎨'
  },
  {
    name: 'Nail Care',
    slug: 'nail-care',
    description: 'Nail polish, treatments, and care products',
    isActive: true,
    sortOrder: 22,
    icon: '💅'
  },
  {
    name: 'Fragrance',
    slug: 'fragrance',
    description: 'Perfumes, body sprays, and scented products',
    isActive: true,
    sortOrder: 23,
    icon: '🌸'
  },
  {
    name: 'Tools & Brushes',
    slug: 'tools-brushes',
    description: 'Makeup brushes, skincare tools, and applicators',
    isActive: true,
    sortOrder: 24,
    icon: '🖌️'
  },
  {
    name: 'Men\'s Grooming',
    slug: 'mens-grooming',
    description: 'Specialized grooming products for men',
    isActive: true,
    sortOrder: 25,
    icon: '👨'
  },
  {
    name: 'Travel Size',
    slug: 'travel-size',
    description: 'Travel-friendly mini and sample products',
    isActive: true,
    sortOrder: 26,
    icon: '✈️'
  },
  {
    name: 'Organic & Natural',
    slug: 'organic-natural',
    description: 'Organic, natural, and eco-friendly beauty products',
    isActive: true,
    sortOrder: 27,
    icon: '🌿'
  }
];

async function addMoreCategories() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log('🌱 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db('scarlet');
    
    // Check current categories
    const currentCategories = await db.collection('categories').find({}).toArray();
    console.log(`📊 Current categories: ${currentCategories.length}`);
    
    if (currentCategories.length >= 15) {
      console.log('✅ Already have 15+ categories. No need to add more.');
      return;
    }
    
    // Add timestamps to new categories
    const categoriesWithTimestamps = additionalCategories.map(cat => ({
      ...cat,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    console.log('➕ Adding additional categories...');
    const result = await db.collection('categories').insertMany(categoriesWithTimestamps);
    
    console.log(`✅ Successfully added ${Object.keys(result.insertedIds).length} new categories!`);
    
    // Show final count
    const finalCategories = await db.collection('categories').find({}).toArray();
    console.log(`📊 Total categories now: ${finalCategories.length}`);
    
    console.log('\n📋 All categories:');
    finalCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (${cat.slug}) - Active: ${cat.isActive}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding categories:', error);
  } finally {
    await client.close();
  }
}

addMoreCategories();
