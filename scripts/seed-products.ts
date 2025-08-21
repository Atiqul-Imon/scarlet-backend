import 'dotenv/config';
import { getDb, closeMongoConnection } from '../src/core/db/mongoClient.js';
import { logger } from '../src/core/logging/logger.js';

const categories = [
  {
    name: 'Skincare',
    slug: 'skincare',
    description: 'Complete skincare solutions for all skin types',
    isActive: true
  },
  {
    name: 'Face Care',
    slug: 'face-care',
    parentId: null, // Will be updated after skincare is inserted
    description: 'Facial cleansers, moisturizers, and treatments',
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
    name: 'Lipstick',
    slug: 'lipstick',
    description: 'Lip colors and treatments',
    isActive: true
  },
  {
    name: 'Foundation',
    slug: 'foundation',
    description: 'Base makeup for flawless coverage',
    isActive: true
  }
];

const products = [
  // Cleansers
  {
    title: 'CeraVe Foaming Facial Cleanser',
    slug: 'cerave-foaming-facial-cleanser',
    description: 'A gentle yet effective foaming cleanser that removes makeup, dirt, and excess oil while maintaining the skin\'s natural barrier. Formulated with ceramides and hyaluronic acid for all skin types.',
    shortDescription: 'Gentle foaming cleanser with ceramides for all skin types',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500',
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
    categoryIds: [], // Will be populated after categories are inserted
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
    title: 'Neutrogena Ultra Gentle Daily Cleanser',
    slug: 'neutrogena-ultra-gentle-daily-cleanser',
    description: 'A soap-free, hypoallergenic cleanser that effectively removes dirt, oil, and makeup without over-drying. Perfect for sensitive skin with a non-comedogenic formula.',
    shortDescription: 'Ultra-gentle cleanser perfect for sensitive skin',
    images: [
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500'
    ],
    price: {
      currency: 'BDT',
      amount: 950
    },
    brand: 'Neutrogena',
    stock: 32,
    categoryIds: [],
    attributes: {
      skinType: 'Sensitive skin',
      volume: '200ml',
      keyIngredients: 'Glycerin, No harsh sulfates',
      madeIn: 'USA',
      hypoallergenic: true
    },
    tags: ['cleanser', 'sensitive-skin', 'gentle', 'soap-free'],
    sku: 'NG-UG-200',
    weight: 220,
    dimensions: { length: 5, width: 5, height: 16, unit: 'cm' },
    isActive: true,
    isFeatured: false,
    rating: { average: 4.2, count: 89 }
  },

  // Moisturizers
  {
    title: 'The Ordinary Hyaluronic Acid 2% + B5',
    slug: 'the-ordinary-hyaluronic-acid-2-b5',
    description: 'A powerful hydrating serum that holds up to 1000 times its weight in water. Features multiple molecular weights of hyaluronic acid for multi-depth hydration.',
    shortDescription: 'Intense hydration serum with multiple molecular weights of HA',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
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
    title: 'Olay Regenerist Micro-Sculpting Cream',
    slug: 'olay-regenerist-micro-sculpting-cream',
    description: 'An advanced anti-aging moisturizer with amino-peptides and firming ingredients. Smooths fine lines and improves skin texture for younger-looking skin.',
    shortDescription: 'Anti-aging moisturizer with amino-peptides',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500'
    ],
    price: {
      currency: 'BDT',
      amount: 2150,
      originalAmount: 2500,
      discountPercentage: 14
    },
    brand: 'Olay',
    stock: 23,
    categoryIds: [],
    attributes: {
      skinType: 'Mature skin',
      volume: '50g',
      keyIngredients: 'Amino-Peptides, Glycerin, Dimethicone',
      madeIn: 'USA',
      antiAging: true
    },
    tags: ['moisturizer', 'anti-aging', 'peptides', 'firming'],
    sku: 'OL-RM-50',
    weight: 75,
    dimensions: { length: 7, width: 7, height: 5, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    rating: { average: 4.3, count: 156 }
  },

  // Serums
  {
    title: 'The INKEY List Vitamin C Serum',
    slug: 'inkey-list-vitamin-c-serum',
    description: 'A potent 30% vitamin C serum that brightens skin and reduces signs of aging. Contains magnesium ascorbyl phosphate for stable, effective vitamin C delivery.',
    shortDescription: 'Brightening vitamin C serum with 30% concentration',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500'
    ],
    price: {
      currency: 'BDT',
      amount: 1150
    },
    brand: 'The INKEY List',
    stock: 38,
    categoryIds: [],
    attributes: {
      skinType: 'All skin types',
      volume: '30ml',
      keyIngredients: 'Vitamin C 30%, Magnesium Ascorbyl Phosphate',
      madeIn: 'UK',
      vegan: true,
      crueltyFree: true
    },
    tags: ['serum', 'vitamin-c', 'brightening', 'antioxidant'],
    sku: 'IL-VC-30',
    weight: 45,
    dimensions: { length: 3, width: 3, height: 9, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    rating: { average: 4.4, count: 203 }
  },
  {
    title: 'Paula\'s Choice 2% BHA Liquid Exfoliant',
    slug: 'paulas-choice-2-bha-liquid-exfoliant',
    description: 'A gentle yet effective liquid exfoliant with 2% salicylic acid. Unclogs pores, reduces blackheads, and improves skin texture for clearer, smoother skin.',
    shortDescription: 'Gentle liquid exfoliant with 2% salicylic acid',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
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

  // Sunscreens
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

  // Makeup Products
  {
    title: 'Maybelline Fit Me Matte Foundation',
    slug: 'maybelline-fit-me-matte-foundation',
    description: 'A lightweight, buildable foundation that provides natural coverage with a matte finish. Available in multiple shades to match Bangladeshi skin tones.',
    shortDescription: 'Lightweight matte foundation with natural coverage',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500'
    ],
    price: {
      currency: 'BDT',
      amount: 650,
      originalAmount: 750,
      discountPercentage: 13
    },
    brand: 'Maybelline',
    stock: 56,
    categoryIds: [],
    attributes: {
      skinType: 'Oily, Combination',
      volume: '30ml',
      coverage: 'Medium',
      finish: 'Matte',
      shadeRange: '40 shades',
      madeIn: 'USA'
    },
    tags: ['foundation', 'matte', 'medium-coverage', 'affordable'],
    sku: 'MB-FM-30',
    weight: 55,
    dimensions: { length: 3, width: 3, height: 10, unit: 'cm' },
    isActive: true,
    isFeatured: false,
    rating: { average: 4.1, count: 94 }
  },
  {
    title: 'MAC Ruby Woo Lipstick',
    slug: 'mac-ruby-woo-lipstick',
    description: 'An iconic blue-red lipstick with a matte finish. This cult-favorite shade complements all skin tones and provides long-lasting, comfortable wear.',
    shortDescription: 'Iconic blue-red matte lipstick',
    images: [
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500',
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

  // K-Beauty Products
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
  },
  {
    title: 'Some By Mi Retinol Intense Advanced Triple Action Serum',
    slug: 'some-by-mi-retinol-intense-advanced-triple-action-serum',
    description: 'A powerful anti-aging serum with retinol, retinal, and retinyl palmitate. Reduces fine lines, improves skin texture, and promotes cell turnover for youthful skin.',
    shortDescription: 'Triple-action retinol serum for anti-aging',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500'
    ],
    price: {
      currency: 'BDT',
      amount: 2150,
      originalAmount: 2400,
      discountPercentage: 10
    },
    brand: 'Some By Mi',
    stock: 22,
    categoryIds: [],
    attributes: {
      skinType: 'All skin types (start slowly)',
      volume: '30ml',
      keyIngredients: 'Retinol, Retinal, Retinyl Palmitate, Squalane',
      madeIn: 'South Korea',
      kBeauty: true,
      antiAging: true
    },
    tags: ['serum', 'retinol', 'anti-aging', 'k-beauty', 'triple-action'],
    sku: 'SBM-RI-30',
    weight: 50,
    dimensions: { length: 3, width: 3, height: 10, unit: 'cm' },
    isActive: true,
    isFeatured: true,
    rating: { average: 4.4, count: 167 }
  }
];

async function seedDatabase() {
  try {
    logger.info('🌱 Starting database seeding...');
    
    const db = await getDb();
    
    // Clear existing data
    logger.info('🗑️ Clearing existing products and categories...');
    await db.collection('products').deleteMany({});
    await db.collection('categories').deleteMany({});
    
    // Insert categories
    logger.info('📁 Inserting categories...');
    const categoryResult = await db.collection('categories').insertMany(categories);
    const categoryIds = Object.values(categoryResult.insertedIds);
    
    logger.info(`✅ Inserted ${categoryIds.length} categories`);
    
    // Get category mappings for products
    const categoryMap = {};
    const insertedCategories = await db.collection('categories').find({}).toArray();
    insertedCategories.forEach(cat => {
      categoryMap[cat.slug] = cat._id;
    });
    
    // Assign category IDs to products
    const productsWithCategories = products.map(product => {
      const categoryIds = [];
      
      // Assign categories based on product type
      if (product.tags.includes('cleanser')) {
        categoryIds.push(categoryMap['cleansers'], categoryMap['skincare'], categoryMap['face-care']);
      }
      if (product.tags.includes('moisturizer') || product.tags.includes('serum') || product.tags.includes('essence')) {
        categoryIds.push(categoryMap['moisturizers'], categoryMap['serums'], categoryMap['skincare'], categoryMap['face-care']);
      }
      if (product.tags.includes('sunscreen')) {
        categoryIds.push(categoryMap['sunscreen'], categoryMap['skincare']);
      }
      if (product.tags.includes('foundation')) {
        categoryIds.push(categoryMap['foundation'], categoryMap['makeup']);
      }
      if (product.tags.includes('lipstick')) {
        categoryIds.push(categoryMap['lipstick'], categoryMap['makeup']);
      }
      
      // Default to skincare if no specific category
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
    logger.info('🛍️ Inserting products...');
    const productResult = await db.collection('products').insertMany(productsWithCategories);
    
    logger.info(`✅ Inserted ${Object.keys(productResult.insertedIds).length} products`);
    
    // Create indexes for better performance
    logger.info('📊 Creating database indexes...');
    await db.collection('products').createIndex({ slug: 1 }, { unique: true });
    await db.collection('products').createIndex({ title: 'text', description: 'text', brand: 'text' });
    await db.collection('products').createIndex({ categoryIds: 1 });
    await db.collection('products').createIndex({ isActive: 1 });
    await db.collection('products').createIndex({ isFeatured: 1 });
    await db.collection('products').createIndex({ 'price.amount': 1 });
    await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
    
    logger.info('✅ Database indexes created');
    
    // Summary
    logger.info('🎉 Database seeding completed successfully!');
    logger.info(`📊 Summary:`);
    logger.info(`   - Categories: ${categoryIds.length}`);
    logger.info(`   - Products: ${Object.keys(productResult.insertedIds).length}`);
    logger.info(`   - Brands: ${[...new Set(products.map(p => p.brand))].length}`);
    logger.info(`   - Featured Products: ${products.filter(p => p.isFeatured).length}`);
    
    const totalValue = products.reduce((sum, p) => sum + p.price.amount, 0);
    logger.info(`   - Total Catalog Value: ৳${totalValue.toLocaleString('bn-BD')}`);
    
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await closeMongoConnection();
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().catch(error => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}

export { seedDatabase };
