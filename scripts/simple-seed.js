import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is not set');
  process.exit(1);
}

const categories = [
  {
    name: 'Skincare',
    slug: 'skincare',
    description: 'Complete skincare solutions for all skin types',
    isActive: true
  },
  {
    name: 'Cleansers',
    slug: 'cleansers',
    description: 'Face washes, cleansing oils, and makeup removers',
    isActive: true
  },
  {
    name: 'Moisturizers',
    slug: 'moisturizers',
    description: 'Hydrating creams, lotions, and serums',
    isActive: true
  },
  {
    name: 'Serums',
    slug: 'serums',
    description: 'Concentrated treatments for specific skin concerns',
    isActive: true
  },
  {
    name: 'Sunscreen',
    slug: 'sunscreen',
    description: 'UV protection for daily skincare routine',
    isActive: true
  },
  {
    name: 'Makeup',
    slug: 'makeup',
    description: 'Beauty and cosmetic products',
    isActive: true
  },
  {
    name: 'Foundation',
    slug: 'foundation',
    description: 'Base makeup for flawless coverage',
    isActive: true
  },
  {
    name: 'Lipstick',
    slug: 'lipstick',
    description: 'Lip colors and treatments',
    isActive: true
  }
];

const products = [
  {
    title: 'CeraVe Foaming Facial Cleanser',
    slug: 'cerave-foaming-facial-cleanser',
    description: 'A gentle yet effective foaming cleanser that removes makeup, dirt, and excess oil while maintaining the skin\'s natural barrier. Formulated with ceramides and hyaluronic acid for all skin types.',
    shortDescription: 'Gentle foaming cleanser with ceramides for all skin types',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500'
    ],
    price: {
      currency: 'BDT',
      amount: 1250,
      originalAmount: 1500,
      discountPercentage: 17
    },
    brand: 'CeraVe',
    stock: 45,
    categoryIds: [],
    attributes: {
      skinType: 'All skin types',
      volume: '236ml',
      keyIngredients: 'Ceramides, Hyaluronic Acid, Niacinamide',
      madeIn: 'USA',
      crueltyFree: true
    },
    tags: ['cleanser', 'foaming', 'ceramides', 'gentle', 'daily-use'],
    sku: 'CV-FC-236',
    weight: 250,
    dimensions: { length: 6, width: 6, height: 18, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    seoTitle: 'CeraVe Foaming Facial Cleanser - Gentle Daily Cleanser',
    seoDescription: 'Shop CeraVe Foaming Facial Cleanser in Bangladesh. Gentle, effective cleansing with ceramides for healthy skin barrier.',
    rating: { average: 4.5, count: 128 }
  },
  {
    title: 'The Ordinary Hyaluronic Acid 2% + B5',
    slug: 'the-ordinary-hyaluronic-acid-2-b5',
    description: 'A powerful hydrating serum that holds up to 1000 times its weight in water. Features multiple molecular weights of hyaluronic acid for multi-depth hydration.',
    shortDescription: 'Intense hydration serum with multiple molecular weights of HA',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500'
    ],
    price: {
      currency: 'BDT',
      amount: 850
    },
    brand: 'The Ordinary',
    stock: 67,
    categoryIds: [],
    attributes: {
      skinType: 'All skin types',
      volume: '30ml',
      keyIngredients: 'Hyaluronic Acid, Vitamin B5',
      madeIn: 'Canada',
      vegan: true,
      crueltyFree: true
    },
    tags: ['serum', 'hyaluronic-acid', 'hydrating', 'the-ordinary'],
    sku: 'TO-HA-30',
    weight: 50,
    dimensions: { length: 3, width: 3, height: 10, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    rating: { average: 4.7, count: 245 }
  },
  {
    title: 'Paula\'s Choice 2% BHA Liquid Exfoliant',
    slug: 'paulas-choice-2-bha-liquid-exfoliant',
    description: 'A gentle yet effective liquid exfoliant with 2% salicylic acid. Unclogs pores, reduces blackheads, and improves skin texture for clearer, smoother skin.',
    shortDescription: 'Gentle liquid exfoliant with 2% salicylic acid',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500'
    ],
    price: {
      currency: 'BDT',
      amount: 2850
    },
    brand: 'Paula\'s Choice',
    stock: 19,
    categoryIds: [],
    attributes: {
      skinType: 'Oily, Combination, Acne-prone',
      volume: '118ml',
      keyIngredients: 'Salicylic Acid 2%, Green Tea Extract',
      madeIn: 'USA',
      nonComedogenic: true
    },
    tags: ['exfoliant', 'bha', 'salicylic-acid', 'acne', 'pores'],
    sku: 'PC-BHA-118',
    weight: 130,
    dimensions: { length: 4, width: 4, height: 15, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    rating: { average: 4.6, count: 312 }
  },
  {
    title: 'La Roche-Posay Anthelios Ultra Light SPF 60',
    slug: 'la-roche-posay-anthelios-ultra-light-spf60',
    description: 'Broad-spectrum SPF 60 sunscreen with Cell-Ox Shield technology. Ultra-light, non-greasy formula perfect for daily use under makeup or alone.',
    shortDescription: 'Ultra-light broad-spectrum SPF 60 sunscreen',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500'
    ],
    price: {
      currency: 'BDT',
      amount: 1850
    },
    brand: 'La Roche-Posay',
    stock: 41,
    categoryIds: [],
    attributes: {
      skinType: 'All skin types',
      volume: '60ml',
      spf: '60',
      broadSpectrum: true,
      waterResistant: '80 minutes',
      madeIn: 'France'
    },
    tags: ['sunscreen', 'spf60', 'broad-spectrum', 'daily-use'],
    sku: 'LRP-AU-60',
    weight: 80,
    dimensions: { length: 4, width: 4, height: 12, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    rating: { average: 4.5, count: 187 }
  },
  {
    title: 'MAC Ruby Woo Lipstick',
    slug: 'mac-ruby-woo-lipstick',
    description: 'An iconic blue-red lipstick with a matte finish. This cult-favorite shade complements all skin tones and provides long-lasting, comfortable wear.',
    shortDescription: 'Iconic blue-red matte lipstick',
    images: [
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500',
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500'
    ],
    price: {
      currency: 'BDT',
      amount: 2250
    },
    brand: 'MAC',
    stock: 28,
    categoryIds: [],
    attributes: {
      skinType: 'All skin types',
      volume: '3g',
      finish: 'Matte',
      shade: 'Ruby Woo (Blue-Red)',
      longWearing: true,
      madeIn: 'Canada'
    },
    tags: ['lipstick', 'matte', 'red', 'classic', 'long-lasting'],
    sku: 'MAC-RW-3',
    weight: 25,
    dimensions: { length: 2, width: 2, height: 9, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    rating: { average: 4.8, count: 156 }
  },
  {
    title: 'COSRX Advanced Snail 96 Mucin Power Essence',
    slug: 'cosrx-advanced-snail-96-mucin-power-essence',
    description: 'A lightweight essence with 96% snail secretion filtrate that repairs and rejuvenates skin. Helps with hydration, healing, and improving skin texture.',
    shortDescription: 'Repairing essence with 96% snail mucin',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500'
    ],
    price: {
      currency: 'BDT',
      amount: 1650
    },
    brand: 'COSRX',
    stock: 34,
    categoryIds: [],
    attributes: {
      skinType: 'All skin types',
      volume: '100ml',
      keyIngredients: 'Snail Secretion Filtrate 96%',
      madeIn: 'South Korea',
      kBeauty: true,
      crueltyFree: true
    },
    tags: ['essence', 'snail-mucin', 'k-beauty', 'repairing', 'hydrating'],
    sku: 'CX-SM-100',
    weight: 120,
    dimensions: { length: 5, width: 5, height: 12, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    rating: { average: 4.6, count: 289 }
  }
];

async function seedDatabase() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log('🌱 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db('scarlet');
    
    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await db.collection('products').deleteMany({});
    await db.collection('categories').deleteMany({});
    
    // Insert categories
    console.log('📁 Inserting categories...');
    const categoryResult = await db.collection('categories').insertMany(categories);
    const insertedCategories = await db.collection('categories').find({}).toArray();
    
    // Create category mapping
    const categoryMap = {};
    insertedCategories.forEach(cat => {
      categoryMap[cat.slug] = cat._id;
    });
    
    // Assign categories to products
    const productsWithCategories = products.map(product => {
      const categoryIds = [];
      
      // Assign categories based on tags
      if (product.tags.includes('cleanser')) {
        categoryIds.push(categoryMap['cleansers'], categoryMap['skincare']);
      }
      if (product.tags.includes('serum') || product.tags.includes('essence')) {
        categoryIds.push(categoryMap['serums'], categoryMap['moisturizers'], categoryMap['skincare']);
      }
      if (product.tags.includes('sunscreen')) {
        categoryIds.push(categoryMap['sunscreen'], categoryMap['skincare']);
      }
      if (product.tags.includes('lipstick')) {
        categoryIds.push(categoryMap['lipstick'], categoryMap['makeup']);
      }
      if (product.tags.includes('exfoliant')) {
        categoryIds.push(categoryMap['serums'], categoryMap['skincare']);
      }
      
      // Default to skincare if no category assigned
      if (categoryIds.length === 0) {
        categoryIds.push(categoryMap['skincare']);
      }
      
      return {
        ...product,
        categoryIds: categoryIds.filter(Boolean),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
    
    // Insert products
    console.log('🛍️ Inserting products...');
    const productResult = await db.collection('products').insertMany(productsWithCategories);
    
    // Create indexes
    console.log('📊 Creating indexes...');
    await db.collection('products').createIndex({ slug: 1 }, { unique: true });
    await db.collection('products').createIndex({ title: 'text', description: 'text', brand: 'text' });
    await db.collection('products').createIndex({ categoryIds: 1 });
    await db.collection('products').createIndex({ isActive: 1 });
    await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
    
    // Success summary
    console.log('🎉 Database seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Categories: ${Object.keys(categoryResult.insertedIds).length}`);
    console.log(`   - Products: ${Object.keys(productResult.insertedIds).length}`);
    console.log(`   - Brands: ${[...new Set(products.map(p => p.brand))].length}`);
    
    const totalValue = products.reduce((sum, p) => sum + p.price.amount, 0);
    console.log(`   - Total Catalog Value: ৳${totalValue.toLocaleString('bn-BD')}`);
    
    console.log('✅ Database is ready for use!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

seedDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
