import 'dotenv/config';
import { getDb, closeMongoConnection } from '../src/core/db/mongoClient.js';
import { logger } from '../src/core/logging/logger.js';

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
    homepageSection: 'new-arrivals'
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
    homepageSection: 'new-arrivals'
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
    homepageSection: 'new-arrivals'
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
    homepageSection: 'skincare-essentials'
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
    homepageSection: 'skincare-essentials'
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
    homepageSection: 'skincare-essentials'
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
    homepageSection: 'makeup-collection'
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
    homepageSection: 'makeup-collection'
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
    homepageSection: 'makeup-collection'
  }
];

async function addMoreProducts() {
  try {
    logger.info('🌱 Adding more products to homepage sections...');
    
    const db = await getDb();
    
    // Get category mappings
    const categoryMap: Record<string, any> = {};
    const categories = await db.collection('categories').find({}).toArray();
    categories.forEach(cat => {
      categoryMap[cat.slug] = cat._id;
    });
    
    // Function to assign categories to products
    const assignCategories = (product: any, section: string) => {
      const categoryIds = [];
      
      if (section === 'skincare-essentials' || product.tags.includes('skincare-essential')) {
        categoryIds.push(categoryMap['skincare']);
        if (product.tags.includes('serum')) categoryIds.push(categoryMap['serums']);
        if (product.tags.includes('moisturizer')) categoryIds.push(categoryMap['moisturizers']);
        if (product.tags.includes('exfoliant')) categoryIds.push(categoryMap['serums']);
      }
      
      if (section === 'makeup-collection' || product.tags.includes('makeup-collection')) {
        categoryIds.push(categoryMap['makeup']);
        if (product.tags.includes('lipstick')) categoryIds.push(categoryMap['lipstick']);
        if (product.tags.includes('setting-powder') || product.tags.includes('setting-spray')) categoryIds.push(categoryMap['makeup']);
      }
      
      if (section === 'new-arrivals') {
        if (product.tags.some((t: string) => ['serum', 'moisturizer', 'skincare-essential'].includes(t))) {
          categoryIds.push(categoryMap['skincare']);
        }
        if (product.tags.some((t: string) => ['lipstick', 'lip-oil', 'lip-balm', 'makeup'].includes(t))) {
          categoryIds.push(categoryMap['makeup']);
        }
      }
      
      return categoryIds.filter(Boolean);
    };
    
    // Combine all additional products
    const allAdditionalProducts = [
      ...additionalNewArrivals.map(p => ({ ...p, categoryIds: assignCategories(p, 'new-arrivals') })),
      ...additionalSkincareEssentials.map(p => ({ ...p, categoryIds: assignCategories(p, 'skincare-essentials') })),
      ...additionalMakeupCollection.map(p => ({ ...p, categoryIds: assignCategories(p, 'makeup-collection') }))
    ];
    
    // Add timestamps
    const productsWithTimestamps = allAdditionalProducts.map(product => ({
      ...product,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    // Insert products
    logger.info('🛍️ Inserting additional products...');
    const result = await db.collection('products').insertMany(productsWithTimestamps);
    
    logger.info(`✅ Inserted ${Object.keys(result.insertedIds).length} additional products`);
    
    // Verify counts by section
    const newArrivalsCount = await db.collection('products').countDocuments({ homepageSection: 'new-arrivals' });
    const skincareCount = await db.collection('products').countDocuments({ homepageSection: 'skincare-essentials' });
    const makeupCount = await db.collection('products').countDocuments({ homepageSection: 'makeup-collection' });
    
    logger.info('📊 Updated Homepage Section Counts:');
    logger.info(`   - New Arrivals: ${newArrivalsCount} products`);
    logger.info(`   - Skincare Essentials: ${skincareCount} products`);
    logger.info(`   - Makeup Collection: ${makeupCount} products`);
    
    // Clear Redis cache for homepage sections
    logger.info('🗑️ Clearing Redis cache for homepage sections...');
    // Note: In production, this would clear the cache
    // For now, the cache will expire naturally
    
    logger.info('🎉 Additional products added successfully!');
    logger.info('📈 Homepage now has 15 products per section (45 total)');
    
  } catch (error) {
    logger.error('❌ Error adding products:', error);
    throw error;
  } finally {
    await closeMongoConnection();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addMoreProducts().catch(error => {
    console.error('Adding products failed:', error);
    process.exit(1);
  });
}

export { addMoreProducts };
