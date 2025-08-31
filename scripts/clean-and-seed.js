import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is not set');
  process.exit(1);
}

// Enhanced Categories - Following Herlan's structure
const categories = [
  {
    name: 'Skincare',
    slug: 'skincare',
    description: 'Complete skincare solutions for healthy, glowing skin',
    isActive: true,
    showInHomepage: true,
    sortOrder: 1,
    icon: '🌿'
  },
  {
    name: 'Makeup',
    slug: 'makeup',
    description: 'Premium makeup and cosmetic products',
    isActive: true,
    showInHomepage: true,
    sortOrder: 2,
    icon: '💄'
  },
  {
    name: 'Hair Care',
    slug: 'hair-care',
    description: 'Professional hair care and styling products',
    isActive: true,
    showInHomepage: true,
    sortOrder: 3,
    icon: '💇‍♀️'
  },
  {
    name: 'Body Care',
    slug: 'body-care',
    description: 'Luxurious body care and bath products',
    isActive: true,
    showInHomepage: true,
    sortOrder: 4,
    icon: '🧴'
  },
  {
    name: 'Cleansers',
    slug: 'cleansers',
    description: 'Face washes, cleansing oils, and makeup removers',
    isActive: true,
    showInHomepage: true,
    parentCategory: 'skincare',
    sortOrder: 5,
    icon: '🧼'
  },
  {
    name: 'Moisturizers',
    slug: 'moisturizers',
    description: 'Hydrating creams, lotions, and serums',
    isActive: true,
    showInHomepage: false,
    parentCategory: 'skincare',
    sortOrder: 6,
    icon: '💧'
  },
  {
    name: 'Serums & Treatments',
    slug: 'serums',
    description: 'Concentrated treatments for specific skin concerns',
    isActive: true,
    showInHomepage: true,
    parentCategory: 'skincare',
    sortOrder: 7,
    icon: '✨'
  },
  {
    name: 'Sunscreen',
    slug: 'sunscreen',
    description: 'UV protection for daily skincare routine',
    isActive: true,
    showInHomepage: true,
    parentCategory: 'skincare',
    sortOrder: 8,
    icon: '☀️'
  },
  {
    name: 'Foundation',
    slug: 'foundation',
    description: 'Base makeup for flawless coverage',
    isActive: true,
    showInHomepage: true,
    parentCategory: 'makeup',
    sortOrder: 9,
    icon: '🎨'
  },
  {
    name: 'Lipstick',
    slug: 'lipstick',
    description: 'Lip colors and treatments',
    isActive: true,
    showInHomepage: true,
    parentCategory: 'makeup',
    sortOrder: 10,
    icon: '💋'
  },
  {
    name: 'Eye Makeup',
    slug: 'eye-makeup',
    description: 'Eyeshadows, mascara, eyeliners',
    isActive: true,
    showInHomepage: false,
    parentCategory: 'makeup',
    sortOrder: 11,
    icon: '👁️'
  },
  {
    name: 'Shampoo',
    slug: 'shampoo',
    description: 'Hair cleansing products',
    isActive: true,
    showInHomepage: false,
    parentCategory: 'hair-care',
    sortOrder: 12,
    icon: '🧴'
  }
];

// Enhanced Products - More realistic beauty products
const products = [
  // SKINCARE PRODUCTS
  {
    title: 'CeraVe Foaming Facial Cleanser',
    slug: 'cerave-foaming-facial-cleanser',
    description: 'A gentle yet effective foaming cleanser that removes makeup, dirt, and excess oil while maintaining the skin\'s natural barrier. Formulated with ceramides and hyaluronic acid for all skin types. Developed with dermatologists, this cleanser is fragrance-free and non-comedogenic.',
    shortDescription: 'Gentle foaming cleanser with ceramides for all skin types',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80'
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
      crueltyFree: true,
      fragrance: 'Fragrance-free'
    },
    tags: ['cleanser', 'foaming', 'ceramides', 'gentle', 'daily-use', 'bestseller'],
    sku: 'CV-FC-236',
    weight: 250,
    dimensions: { length: 6, width: 6, height: 18, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    seoTitle: 'CeraVe Foaming Facial Cleanser - Gentle Daily Cleanser',
    seoDescription: 'Shop CeraVe Foaming Facial Cleanser in Bangladesh. Gentle, effective cleansing with ceramides for healthy skin barrier.',
    rating: { average: 4.5, count: 128 }
  },
  {
    title: 'The Ordinary Hyaluronic Acid 2% + B5',
    slug: 'the-ordinary-hyaluronic-acid-2-b5',
    description: 'A powerful hydrating serum that holds up to 1000 times its weight in water. Features multiple molecular weights of hyaluronic acid for multi-depth hydration. Best applied to damp skin and followed with a moisturizer.',
    shortDescription: 'Intense hydration serum with multiple molecular weights of HA',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80'
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
      crueltyFree: true,
      texture: 'Lightweight gel'
    },
    tags: ['serum', 'hyaluronic-acid', 'hydrating', 'the-ordinary', 'affordable'],
    sku: 'TO-HA-30',
    weight: 50,
    dimensions: { length: 3, width: 3, height: 10, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    rating: { average: 4.7, count: 245 }
  },
  {
    title: 'Paula\'s Choice 2% BHA Liquid Exfoliant',
    slug: 'paulas-choice-2-bha-liquid-exfoliant',
    description: 'A gentle yet effective liquid exfoliant with 2% salicylic acid. Unclogs pores, reduces blackheads, and improves skin texture for clearer, smoother skin. Perfect for acne-prone and oily skin types.',
    shortDescription: 'Gentle liquid exfoliant with 2% salicylic acid',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80'
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
      nonComedogenic: true,
      texture: 'Lightweight liquid'
    },
    tags: ['exfoliant', 'bha', 'salicylic-acid', 'acne', 'pores', 'professional'],
    sku: 'PC-BHA-118',
    weight: 130,
    dimensions: { length: 4, width: 4, height: 15, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: false,
    rating: { average: 4.6, count: 312 }
  },
  {
    title: 'La Roche-Posay Anthelios Ultra Light SPF 60',
    slug: 'la-roche-posay-anthelios-ultra-light-spf60',
    description: 'Broad-spectrum SPF 60 sunscreen with Cell-Ox Shield technology. Ultra-light, non-greasy formula perfect for daily use under makeup or alone. Water-resistant and suitable for sensitive skin.',
    shortDescription: 'Ultra-light broad-spectrum SPF 60 sunscreen',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80'
    ],
    price: {
      currency: 'BDT',
      amount: 1850,
      originalAmount: 2100,
      discountPercentage: 12
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
      madeIn: 'France',
      texture: 'Ultra-light fluid'
    },
    tags: ['sunscreen', 'spf60', 'broad-spectrum', 'daily-use', 'lightweight'],
    sku: 'LRP-AU-60',
    weight: 80,
    dimensions: { length: 4, width: 4, height: 12, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    rating: { average: 4.5, count: 187 }
  },
  {
    title: 'COSRX Advanced Snail 96 Mucin Power Essence',
    slug: 'cosrx-advanced-snail-96-mucin-power-essence',
    description: 'A lightweight essence with 96% snail secretion filtrate that repairs and rejuvenates skin. Helps with hydration, healing, and improving skin texture. Perfect for damaged or irritated skin.',
    shortDescription: 'Repairing essence with 96% snail mucin',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80'
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
      crueltyFree: true,
      texture: 'Lightweight essence'
    },
    tags: ['essence', 'snail-mucin', 'k-beauty', 'repairing', 'hydrating', 'healing'],
    sku: 'CX-SM-100',
    weight: 120,
    dimensions: { length: 5, width: 5, height: 12, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: false,
    rating: { average: 4.6, count: 289 }
  },
  {
    title: 'Innisfree Green Tea Seed Serum',
    slug: 'innisfree-green-tea-seed-serum',
    description: 'Antioxidant-rich serum with green tea from Jeju Island. Provides moisture and creates a protective barrier for fresh, healthy-looking skin. Perfect for daily use.',
    shortDescription: 'Antioxidant green tea serum for fresh skin',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80'
    ],
    price: {
      currency: 'BDT',
      amount: 1450
    },
    brand: 'Innisfree',
    stock: 22,
    categoryIds: [],
    attributes: {
      skinType: 'All skin types',
      volume: '80ml',
      keyIngredients: 'Green Tea Extract, Green Tea Seed Oil',
      madeIn: 'South Korea',
      kBeauty: true,
      natural: true,
      texture: 'Lightweight serum'
    },
    tags: ['serum', 'green-tea', 'k-beauty', 'antioxidant', 'natural', 'new-arrival'],
    sku: 'IF-GTS-80',
    weight: 90,
    dimensions: { length: 4, width: 4, height: 11, unit: 'cm' },
    isActive: true,
    isFeatured: false,
    isNewArrival: true,
    isBestSeller: false,
    rating: { average: 4.4, count: 156 }
  },

  // MAKEUP PRODUCTS
  {
    title: 'MAC Ruby Woo Lipstick',
    slug: 'mac-ruby-woo-lipstick',
    description: 'An iconic blue-red lipstick with a matte finish. This cult-favorite shade complements all skin tones and provides long-lasting, comfortable wear. The perfect red for any occasion.',
    shortDescription: 'Iconic blue-red matte lipstick',
    images: [
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&q=80',
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&q=80'
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
      madeIn: 'Canada',
      collection: 'Classic'
    },
    tags: ['lipstick', 'matte', 'red', 'classic', 'long-lasting', 'iconic'],
    sku: 'MAC-RW-3',
    weight: 25,
    dimensions: { length: 2, width: 2, height: 9, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    rating: { average: 4.8, count: 156 }
  },
  {
    title: 'Maybelline Fit Me Foundation 120 Classic Ivory',
    slug: 'maybelline-fit-me-foundation-120-classic-ivory',
    description: 'Medium to full coverage foundation that matches your skin tone and texture. Oil-free formula with SPF 18 protection. Perfect for normal to oily skin types.',
    shortDescription: 'Medium to full coverage foundation with SPF 18',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80'
    ],
    price: {
      currency: 'BDT',
      amount: 750,
      originalAmount: 850,
      discountPercentage: 12
    },
    brand: 'Maybelline',
    stock: 56,
    categoryIds: [],
    attributes: {
      skinType: 'Normal to Oily',
      volume: '30ml',
      shade: '120 Classic Ivory',
      coverage: 'Medium to Full',
      spf: '18',
      finish: 'Natural',
      madeIn: 'USA'
    },
    tags: ['foundation', 'medium-coverage', 'spf', 'oil-free', 'affordable', 'drugstore'],
    sku: 'MAY-FM-120',
    weight: 45,
    dimensions: { length: 3, width: 3, height: 12, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    rating: { average: 4.3, count: 203 }
  },
  {
    title: 'Urban Decay Naked3 Eyeshadow Palette',
    slug: 'urban-decay-naked3-eyeshadow-palette',
    description: 'A palette of 12 rose-hued neutral eyeshadows. From shimmery pink champagne to rich mahogany matte, create endless eye looks with this versatile palette.',
    shortDescription: '12 rose-hued neutral eyeshadows in one palette',
    images: [
      'https://images.unsplash.com/photo-1583241475880-6b3b48c4ea83?w=500&q=80',
      'https://images.unsplash.com/photo-1583241475880-6b3b48c4ea83?w=500&q=80'
    ],
    price: {
      currency: 'BDT',
      amount: 4500
    },
    brand: 'Urban Decay',
    stock: 15,
    categoryIds: [],
    attributes: {
      skinType: 'All skin types',
      shadeCount: '12',
      collection: 'Naked3',
      finish: 'Matte & Shimmer',
      palette: 'Rose-toned neutrals',
      madeIn: 'USA',
      crueltyFree: true
    },
    tags: ['eyeshadow', 'palette', 'neutral', 'rose', 'shimmer', 'matte', 'professional'],
    sku: 'UD-N3-12',
    weight: 150,
    dimensions: { length: 15, width: 10, height: 2, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: false,
    rating: { average: 4.7, count: 89 }
  },

  // HAIR CARE PRODUCTS
  {
    title: 'Olaplex No.3 Hair Perfector',
    slug: 'olaplex-no3-hair-perfector',
    description: 'A weekly take-home treatment that reduces breakage and visibly strengthens hair. Works on all hair types to improve shine, manageability, and overall hair health.',
    shortDescription: 'Weekly strengthening treatment for all hair types',
    images: [
      'https://images.unsplash.com/photo-1629142562542-17c05e6bc4d5?w=500&q=80',
      'https://images.unsplash.com/photo-1629142562542-17c05e6bc4d5?w=500&q=80'
    ],
    price: {
      currency: 'BDT',
      amount: 3200
    },
    brand: 'Olaplex',
    stock: 18,
    categoryIds: [],
    attributes: {
      hairType: 'All hair types',
      volume: '100ml',
      keyIngredients: 'Bis-Aminopropyl Diglycol Dimaleate',
      madeIn: 'USA',
      professional: true,
      sulfateFree: true,
      treatment: 'Weekly'
    },
    tags: ['hair-treatment', 'strengthening', 'professional', 'all-hair-types', 'weekly'],
    sku: 'OLX-3-100',
    weight: 120,
    dimensions: { length: 5, width: 5, height: 12, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: false,
    rating: { average: 4.6, count: 134 }
  },
  {
    title: 'Moroccan Oil Treatment',
    slug: 'moroccan-oil-treatment',
    description: 'The original foundation for hairstyling. This versatile, nourishing hair treatment for all hair types can be used as a conditioning, styling and finishing tool.',
    shortDescription: 'Versatile argan oil hair treatment',
    images: [
      'https://images.unsplash.com/photo-1629142562542-17c05e6bc4d5?w=500&q=80',
      'https://images.unsplash.com/photo-1629142562542-17c05e6bc4d5?w=500&q=80'
    ],
    price: {
      currency: 'BDT',
      amount: 2850
    },
    brand: 'Moroccanoil',
    stock: 25,
    categoryIds: [],
    attributes: {
      hairType: 'All hair types',
      volume: '100ml',
      keyIngredients: 'Argan Oil, Vitamin E',
      madeIn: 'Israel',
      sulfateFree: true,
      parabentFree: true,
      versatile: true
    },
    tags: ['hair-oil', 'argan', 'conditioning', 'styling', 'nourishing', 'bestseller'],
    sku: 'MOR-T-100',
    weight: 130,
    dimensions: { length: 4, width: 4, height: 13, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    rating: { average: 4.5, count: 198 }
  },

  // BODY CARE PRODUCTS
  {
    title: 'Bath & Body Works Japanese Cherry Blossom Body Lotion',
    slug: 'bath-body-works-japanese-cherry-blossom-lotion',
    description: 'A luxurious body lotion with the delicate scent of Japanese cherry blossom. Infused with shea butter and vitamin E for 24-hour moisture.',
    shortDescription: 'Luxurious cherry blossom scented body lotion',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80'
    ],
    price: {
      currency: 'BDT',
      amount: 1150,
      originalAmount: 1350,
      discountPercentage: 15
    },
    brand: 'Bath & Body Works',
    stock: 42,
    categoryIds: [],
    attributes: {
      skinType: 'All skin types',
      volume: '236ml',
      scent: 'Japanese Cherry Blossom',
      keyIngredients: 'Shea Butter, Vitamin E',
      madeIn: 'USA',
      paraben_free: true,
      moisture: '24-hour'
    },
    tags: ['body-lotion', 'cherry-blossom', 'shea-butter', 'moisturizing', 'scented'],
    sku: 'BBW-JCB-236',
    weight: 280,
    dimensions: { length: 6, width: 6, height: 20, unit: 'cm' },
    isActive: true,
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: true,
    rating: { average: 4.4, count: 167 }
  }
];

async function cleanAndSeedDatabase() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log('🌱 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db('scarlet');
    
    // Drop collections completely to avoid index conflicts
    console.log('🗑️ Dropping existing collections...');
    try {
      await db.collection('products').drop();
    } catch (e) {
      console.log('   Products collection didn\'t exist, skipping...');
    }
    try {
      await db.collection('categories').drop();
    } catch (e) {
      console.log('   Categories collection didn\'t exist, skipping...');
    }
    
    // Insert categories with timestamps
    console.log('📁 Creating categories collection and inserting data...');
    const categoriesWithTimestamps = categories.map(cat => ({
      ...cat,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    const categoryResult = await db.collection('categories').insertMany(categoriesWithTimestamps);
    const insertedCategories = await db.collection('categories').find({}).toArray();
    
    // Create category mapping
    const categoryMap = {};
    insertedCategories.forEach(cat => {
      categoryMap[cat.slug] = cat._id;
    });
    
    // Assign categories to products based on their content and tags
    const productsWithCategories = products.map(product => {
      const categoryIds = [];
      
      // Smart category assignment based on brand, tags, and product type
      if (product.tags.includes('cleanser')) {
        categoryIds.push(categoryMap['cleansers'], categoryMap['skincare']);
      }
      if (product.tags.includes('serum') || product.tags.includes('essence')) {
        categoryIds.push(categoryMap['serums'], categoryMap['skincare']);
      }
      if (product.tags.includes('sunscreen')) {
        categoryIds.push(categoryMap['sunscreen'], categoryMap['skincare']);
      }
      if (product.tags.includes('lipstick')) {
        categoryIds.push(categoryMap['lipstick'], categoryMap['makeup']);
      }
      if (product.tags.includes('foundation')) {
        categoryIds.push(categoryMap['foundation'], categoryMap['makeup']);
      }
      if (product.tags.includes('eyeshadow')) {
        categoryIds.push(categoryMap['eye-makeup'], categoryMap['makeup']);
      }
      if (product.tags.includes('exfoliant')) {
        categoryIds.push(categoryMap['serums'], categoryMap['skincare']);
      }
      if (product.tags.includes('hair-treatment') || product.tags.includes('hair-oil')) {
        categoryIds.push(categoryMap['hair-care']);
      }
      if (product.tags.includes('body-lotion')) {
        categoryIds.push(categoryMap['body-care']);
      }
      if (product.tags.includes('hydrating') || product.tags.includes('moisturizing')) {
        categoryIds.push(categoryMap['moisturizers'], categoryMap['skincare']);
      }
      
      // Default fallback based on general category
      if (categoryIds.length === 0) {
        if (product.brand && ['CeraVe', 'The Ordinary', 'Paula\'s Choice', 'La Roche-Posay', 'COSRX', 'Innisfree'].includes(product.brand)) {
          categoryIds.push(categoryMap['skincare']);
        } else if (product.brand && ['MAC', 'Maybelline', 'Urban Decay'].includes(product.brand)) {
          categoryIds.push(categoryMap['makeup']);
        } else if (product.brand && ['Olaplex', 'Moroccanoil'].includes(product.brand)) {
          categoryIds.push(categoryMap['hair-care']);
        } else if (product.brand && ['Bath & Body Works'].includes(product.brand)) {
          categoryIds.push(categoryMap['body-care']);
        } else {
          categoryIds.push(categoryMap['skincare']); // Default to skincare
        }
      }
      
      return {
        ...product,
        categoryIds: categoryIds.filter(Boolean), // Remove null/undefined values
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewCount: Math.floor(Math.random() * 1000), // Random view count for demo
        soldCount: Math.floor(Math.random() * 100) // Random sold count for demo
      };
    });
    
    // Insert products
    console.log('🛍️ Creating products collection and inserting data...');
    const productResult = await db.collection('products').insertMany(productsWithCategories);
    
    // Create fresh indexes
    console.log('📊 Creating fresh indexes...');
    
    // Products indexes
    await db.collection('products').createIndex({ slug: 1 }, { unique: true });
    await db.collection('products').createIndex({ title: 'text', description: 'text', brand: 'text' });
    await db.collection('products').createIndex({ categoryIds: 1 });
    await db.collection('products').createIndex({ isActive: 1 });
    await db.collection('products').createIndex({ isFeatured: 1 });
    await db.collection('products').createIndex({ isNewArrival: 1 });
    await db.collection('products').createIndex({ isBestSeller: 1 });
    await db.collection('products').createIndex({ brand: 1 });
    await db.collection('products').createIndex({ 'price.amount': 1 });
    await db.collection('products').createIndex({ stock: 1 });
    await db.collection('products').createIndex({ createdAt: -1 });
    
    // Categories indexes
    await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
    await db.collection('categories').createIndex({ isActive: 1 });
    await db.collection('categories').createIndex({ sortOrder: 1 });
    
    // Generate summary statistics
    const brands = [...new Set(products.map(p => p.brand))];
    const totalValue = products.reduce((sum, p) => sum + p.price.amount, 0);
    const avgPrice = Math.round(totalValue / products.length);
    const featuredCount = products.filter(p => p.isFeatured).length;
    const newArrivalsCount = products.filter(p => p.isNewArrival).length;
    const bestSellersCount = products.filter(p => p.isBestSeller).length;
    
    // Success summary
    console.log('🎉 Database seeding completed successfully!');
    console.log('=' .repeat(50));
    console.log('📊 SEEDING SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`📂 Categories: ${Object.keys(categoryResult.insertedIds).length}`);
    console.log(`🛍️  Products: ${Object.keys(productResult.insertedIds).length}`);
    console.log(`🏷️  Brands: ${brands.length} (${brands.join(', ')})`);
    console.log(`💰 Total Catalog Value: ৳${totalValue.toLocaleString('en-BD')}`);
    console.log(`📊 Average Price: ৳${avgPrice.toLocaleString('en-BD')}`);
    console.log(`⭐ Featured Products: ${featuredCount}`);
    console.log(`🆕 New Arrivals: ${newArrivalsCount}`);
    console.log(`🔥 Best Sellers: ${bestSellersCount}`);
    console.log('=' .repeat(50));
    console.log('✅ Database is ready for production use!');
    console.log('🚀 You can now start the frontend and backend servers.');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Execute the seeding
cleanAndSeedDatabase().catch(error => {
  console.error('💥 Fatal error during seeding:', error);
  process.exit(1);
});
