const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://imonatikulislam:1LhIjsSyfIWCVlgz@cluster0.08anqce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// 3 Additional New Arrivals Products
const additionalNewArrivals = [
  {
    title: 'Glow Recipe Plum Plump Hyaluronic Acid Serum',
    slug: 'glow-recipe-plum-plump-hyaluronic-acid-serum',
    description: 'A hydrating serum with 5 types of hyaluronic acid and plum extract for plump, dewy skin. Delivers intense moisture while improving skin texture and elasticity.',
    shortDescription: 'Hydrating serum with 5 types of hyaluronic acid',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=85',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 4250, originalAmount: 4600, discountPercentage: 8 },
    brand: 'Glow Recipe',
    stock: 38,
    categoryIds: [],
    tags: ['new-arrival', 'serum', 'hyaluronic-acid', 'hydrating', 'plum'],
    sku: 'GR-PP-30',
    weight: 45,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Rare Beauty Soft Pinch Tinted Lip Oil',
    slug: 'rare-beauty-soft-pinch-tinted-lip-oil',
    description: 'A weightless, buildable lip oil that delivers a natural flush of color with intense hydration. Non-sticky formula with a glossy finish that lasts all day.',
    shortDescription: 'Weightless tinted lip oil with natural flush',
    images: [
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800',
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 2850 },
    brand: 'Rare Beauty',
    stock: 52,
    categoryIds: [],
    tags: ['new-arrival', 'lip-oil', 'tinted', 'hydrating', 'glossy'],
    sku: 'RB-SP-12',
    weight: 18,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Tower 28 BeachPlease Tinted Lip Balm',
    slug: 'tower-28-beachplease-tinted-lip-balm',
    description: 'A clean, hydrating lip balm with buildable color and SPF 15 protection. Infused with shea butter and vitamin E for soft, protected lips.',
    shortDescription: 'Clean tinted lip balm with SPF 15',
    images: [
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800',
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=85',
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 1950, originalAmount: 2200, discountPercentage: 11 },
    brand: 'Tower 28',
    stock: 67,
    categoryIds: [],
    tags: ['new-arrival', 'lip-balm', 'tinted', 'spf', 'clean-beauty'],
    sku: 'T28-BP-4',
    weight: 12,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 3 Additional Skincare Essentials Products
const additionalSkincareEssentials = [
  {
    title: 'The Ordinary AHA 30% + BHA 2% Peeling Solution',
    slug: 'the-ordinary-aha-30-bha-2-peeling-solution',
    description: 'A high-strength exfoliating solution with 30% AHA and 2% BHA for dramatic skin renewal. Use once weekly for smoother, clearer, more radiant skin.',
    shortDescription: 'High-strength weekly exfoliating solution',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 1250, originalAmount: 1450, discountPercentage: 14 },
    brand: 'The Ordinary',
    stock: 41,
    categoryIds: [],
    tags: ['skincare-essential', 'exfoliant', 'aha', 'bha', 'weekly-treatment'],
    sku: 'TO-AB-30',
    weight: 30,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'La Mer The Moisturizing Soft Cream',
    slug: 'la-mer-the-moisturizing-soft-cream',
    description: 'A luxurious moisturizing cream with the brand\'s signature Miracle Broth. Provides intense hydration and helps improve skin texture for a radiant, healthy glow.',
    shortDescription: 'Luxurious moisturizing cream with Miracle Broth',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=85',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 12500, originalAmount: 13500, discountPercentage: 7 },
    brand: 'La Mer',
    stock: 8,
    categoryIds: [],
    tags: ['skincare-essential', 'moisturizer', 'luxury', 'miracle-broth', 'hydrating'],
    sku: 'LM-MSC-30',
    weight: 50,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Drunk Elephant C-Firma Vitamin C Day Serum',
    slug: 'drunk-elephant-c-firma-vitamin-c-day-serum',
    description: 'A potent vitamin C serum with 15% L-ascorbic acid, ferulic acid, and vitamin E. Brightens skin, reduces dark spots, and provides antioxidant protection.',
    shortDescription: 'Potent vitamin C serum for brightening',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 4850, originalAmount: 5200, discountPercentage: 7 },
    brand: 'Drunk Elephant',
    stock: 23,
    categoryIds: [],
    tags: ['skincare-essential', 'vitamin-c', 'serum', 'brightening', 'antioxidant'],
    sku: 'DE-CF-30',
    weight: 40,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 3 Additional Makeup Collection Products
const additionalMakeupCollection = [
  {
    title: 'Fenty Beauty Pro Filt\'r Instant Retouch Setting Powder',
    slug: 'fenty-beauty-pro-filtr-instant-retouch-setting-powder',
    description: 'A lightweight, translucent setting powder that blurs pores and sets makeup for a flawless, airbrushed finish. Available in multiple shades for all skin tones.',
    shortDescription: 'Lightweight setting powder for flawless finish',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 3150, originalAmount: 3400, discountPercentage: 7 },
    brand: 'Fenty Beauty',
    stock: 44,
    categoryIds: [],
    tags: ['makeup-collection', 'setting-powder', 'translucent', 'pore-blurring'],
    sku: 'FB-PF-28',
    weight: 25,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Charlotte Tilbury Pillow Talk Lipstick',
    slug: 'charlotte-tilbury-pillow-talk-lipstick',
    description: 'A universally flattering nude-pink lipstick with a matte finish. Long-wearing formula that provides comfortable, non-drying color for all-day wear.',
    shortDescription: 'Universally flattering nude-pink lipstick',
    images: [
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800',
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=85',
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 3850 },
    brand: 'Charlotte Tilbury',
    stock: 31,
    categoryIds: [],
    tags: ['makeup-collection', 'lipstick', 'nude', 'matte', 'long-wearing'],
    sku: 'CT-PT-3.5',
    weight: 20,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Urban Decay All Nighter Setting Spray',
    slug: 'urban-decay-all-nighter-setting-spray',
    description: 'A long-lasting setting spray that locks makeup in place for up to 16 hours. Oil-free formula controls shine and prevents makeup from fading or creasing.',
    shortDescription: '16-hour long-lasting setting spray',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 2650, originalAmount: 2900, discountPercentage: 9 },
    brand: 'Urban Decay',
    stock: 58,
    categoryIds: [],
    tags: ['makeup-collection', 'setting-spray', 'long-lasting', 'oil-free'],
    sku: 'UD-AN-118',
    weight: 110,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

async function addProducts() {
  const client = new MongoClient(mongoUri);
  
  try {
    console.log('🌱 Adding 9 additional products to homepage sections...');
    console.log('🔗 Connecting to MongoDB Atlas...');
    
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('scarlet');
    
    // Get category mappings
    console.log('📂 Getting category mappings...');
    const categoryMap = {};
    const categories = await db.collection('categories').find({}).toArray();
    categories.forEach(cat => {
      categoryMap[cat.slug] = cat._id;
    });
    console.log(`✅ Found ${categories.length} categories`);
    
    // Function to assign categories
    const assignCategories = (product, section) => {
      const categoryIds = [];
      
      if (section === 'skincare-essentials' || product.tags.includes('skincare-essential')) {
        if (categoryMap['skincare']) categoryIds.push(categoryMap['skincare']);
        if (product.tags.includes('serum') && categoryMap['serums']) categoryIds.push(categoryMap['serums']);
        if (product.tags.includes('moisturizer') && categoryMap['moisturizers']) categoryIds.push(categoryMap['moisturizers']);
      }
      
      if (section === 'makeup-collection' || product.tags.includes('makeup-collection')) {
        if (categoryMap['makeup']) categoryIds.push(categoryMap['makeup']);
        if (product.tags.includes('lipstick') && categoryMap['lipstick']) categoryIds.push(categoryMap['lipstick']);
      }
      
      if (section === 'new-arrivals') {
        if (product.tags.some(t => ['serum', 'moisturizer', 'skincare-essential'].includes(t)) && categoryMap['skincare']) {
          categoryIds.push(categoryMap['skincare']);
        }
        if (product.tags.some(t => ['lipstick', 'lip-oil', 'lip-balm', 'makeup'].includes(t)) && categoryMap['makeup']) {
          categoryIds.push(categoryMap['makeup']);
        }
      }
      
      return categoryIds.filter(Boolean);
    };
    
    // Combine all products
    const allProducts = [
      ...additionalNewArrivals.map(p => ({ ...p, categoryIds: assignCategories(p, 'new-arrivals') })),
      ...additionalSkincareEssentials.map(p => ({ ...p, categoryIds: assignCategories(p, 'skincare-essentials') })),
      ...additionalMakeupCollection.map(p => ({ ...p, categoryIds: assignCategories(p, 'makeup-collection') }))
    ];
    
    console.log(`🛍️ Inserting ${allProducts.length} additional products...`);
    
    // Insert products one by one to avoid conflicts
    let insertedCount = 0;
    for (const product of allProducts) {
      try {
        const result = await db.collection('products').insertOne(product);
        if (result.insertedId) {
          insertedCount++;
          console.log(`✅ Inserted: ${product.title}`);
        }
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️ Skipped (duplicate): ${product.title}`);
        } else {
          console.error(`❌ Error inserting ${product.title}:`, error.message);
        }
      }
    }
    
    console.log(`\n✅ Successfully inserted ${insertedCount} products`);
    
    // Verify counts
    console.log('\n📊 Verifying updated counts...');
    const newArrivalsCount = await db.collection('products').countDocuments({ homepageSection: 'new-arrivals' });
    const skincareCount = await db.collection('products').countDocuments({ homepageSection: 'skincare-essentials' });
    const makeupCount = await db.collection('products').countDocuments({ homepageSection: 'makeup-collection' });
    const totalCount = await db.collection('products').countDocuments({});
    
    console.log('\n📊 Updated Homepage Section Counts:');
    console.log(`   - New Arrivals: ${newArrivalsCount} products`);
    console.log(`   - Skincare Essentials: ${skincareCount} products`);
    console.log(`   - Makeup Collection: ${makeupCount} products`);
    console.log(`   - Total Products: ${totalCount} products`);
    
    if (newArrivalsCount >= 15 && skincareCount >= 15 && makeupCount >= 15) {
      console.log('\n🎉 SUCCESS! Homepage now has 15+ products per section!');
    } else {
      console.log('\n⚠️ Some sections still need more products');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

addProducts();
