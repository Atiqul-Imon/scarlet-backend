import 'dotenv/config';
import { getDb, closeMongoConnection } from '../src/core/db/mongoClient.js';
import { logger } from '../src/core/logging/logger.js';

// Categories for organizing products
const categories = [
  {
    name: 'Skincare',
    slug: 'skincare',
    description: 'Complete skincare solutions for all skin types',
    isActive: true,
    showInHomepage: true
  },
  {
    name: 'Makeup',
    slug: 'makeup',
    description: 'Beauty and cosmetic products',
    isActive: true,
    showInHomepage: true
  },
  {
    name: 'Face Care',
    slug: 'face-care',
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
  },
  {
    name: 'Eye Makeup',
    slug: 'eye-makeup',
    description: 'Eyeshadows, liners, and mascaras',
    isActive: true
  }
];

// 12 New Arrivals Products
const newArrivals = [
  {
    title: 'Glow Recipe Watermelon Glow Niacinamide Dew Drops',
    slug: 'glow-recipe-watermelon-glow-niacinamide-dew-drops',
    description: 'A weightless serum that delivers an instant dewy glow while reducing the appearance of hyperpigmentation. Infused with watermelon, niacinamide, and hyaluronic acid for hydrated, glowing skin.',
    shortDescription: 'Instant glow serum with niacinamide and watermelon',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=85',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 3850, originalAmount: 4200, discountPercentage: 8 },
    brand: 'Glow Recipe',
    stock: 45,
    categoryIds: [],
    tags: ['new-arrival', 'serum', 'niacinamide', 'glow', 'hydrating'],
    sku: 'GR-WGD-40',
    weight: 60,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals'
  },
  {
    title: 'Fenty Beauty Pro Filt\'r Soft Matte Foundation',
    slug: 'fenty-beauty-pro-filtr-soft-matte-foundation',
    description: 'A soft matte, buildable, medium to full coverage foundation in 50 shades for all skin tones. Long-wearing formula that resists sweat and humidity while staying comfortable.',
    shortDescription: '50-shade soft matte foundation for all skin tones',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 4250 },
    brand: 'Fenty Beauty',
    stock: 38,
    categoryIds: [],
    tags: ['new-arrival', 'foundation', 'matte', 'inclusive'],
    sku: 'FB-PF-32',
    weight: 55,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals'
  },
  {
    title: 'Rhode Peptide Glazing Fluid',
    slug: 'rhode-peptide-glazing-fluid',
    description: 'A lightweight peptide serum that delivers instant hydration and a glazed, dewy finish. Contains niacinamide, hyaluronic acid, and peptides for plump, healthy skin.',
    shortDescription: 'Glazing peptide serum for instant dewiness',
    images: [
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 3450, originalAmount: 3800, discountPercentage: 9 },
    brand: 'Rhode',
    stock: 52,
    categoryIds: [],
    tags: ['new-arrival', 'peptides', 'hydrating', 'glazed-skin'],
    sku: 'RH-PGF-50',
    weight: 65,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals'
  },
  {
    title: 'Charlotte Tilbury Airbrush Flawless Setting Spray',
    slug: 'charlotte-tilbury-airbrush-flawless-setting-spray',
    description: 'A revolutionary setting spray that locks makeup in place for up to 16 hours. Creates a smooth, airbrushed finish while hydrating and protecting skin.',
    shortDescription: '16-hour makeup setting spray with airbrush finish',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 3650 },
    brand: 'Charlotte Tilbury',
    stock: 41,
    categoryIds: [],
    tags: ['new-arrival', 'setting-spray', 'long-lasting', 'makeup'],
    sku: 'CT-AFS-100',
    weight: 125,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals'
  },
  {
    title: 'Summer Fridays Dream Lip Oil',
    slug: 'summer-fridays-dream-lip-oil',
    description: 'A cushiony lip oil that provides deep hydration with a glossy, non-sticky finish. Infused with vegan collagen and vitamin E for soft, plump lips.',
    shortDescription: 'Hydrating cushiony lip oil with glossy finish',
    images: [
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800',
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=85',
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 2850 },
    brand: 'Summer Fridays',
    stock: 67,
    categoryIds: [],
    tags: ['new-arrival', 'lip-oil', 'hydrating', 'glossy'],
    sku: 'SF-DLO-14',
    weight: 20,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals'
  },
  {
    title: 'Drunk Elephant D-Bronzi Anti-Pollution Sunshine Drops',
    slug: 'drunk-elephant-d-bronzi-sunshine-drops',
    description: 'A concentrated serum with vitamin F blend and peptides that delivers a natural-looking bronzed glow while protecting against pollution. Can be mixed with moisturizer or worn alone.',
    shortDescription: 'Bronzing serum drops with anti-pollution protection',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 4150, originalAmount: 4500, discountPercentage: 8 },
    brand: 'Drunk Elephant',
    stock: 33,
    categoryIds: [],
    tags: ['new-arrival', 'bronzer', 'serum', 'glow'],
    sku: 'DE-DB-30',
    weight: 45,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals'
  },
  {
    title: 'Rare Beauty Soft Pinch Liquid Blush',
    slug: 'rare-beauty-soft-pinch-liquid-blush',
    description: 'A weightless, long-lasting liquid blush with a buildable formula that creates a natural, healthy flush. A little goes a long way for the perfect rosy glow.',
    shortDescription: 'Weightless liquid blush for natural flush',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 2650 },
    brand: 'Rare Beauty',
    stock: 55,
    categoryIds: [],
    tags: ['new-arrival', 'blush', 'liquid', 'long-lasting'],
    sku: 'RB-SPB-15',
    weight: 25,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals'
  },
  {
    title: 'Tower 28 SOS Daily Rescue Facial Spray',
    slug: 'tower-28-sos-daily-rescue-facial-spray',
    description: 'A hypochlorous acid facial spray that calms redness, reduces breakouts, and soothes irritation. Perfect for sensitive skin and can be used throughout the day.',
    shortDescription: 'Soothing facial spray for sensitive skin',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 2450 },
    brand: 'Tower 28',
    stock: 48,
    categoryIds: [],
    tags: ['new-arrival', 'facial-spray', 'sensitive-skin', 'calming'],
    sku: 'T28-SOS-120',
    weight: 135,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals'
  },
  {
    title: 'Patrick Ta Major Headlines Double-Take Crème Blush',
    slug: 'patrick-ta-major-headlines-double-take-creme-blush',
    description: 'A double-ended cream blush with two complementary shades for a natural, sculpted look. Buildable formula blends seamlessly for a lit-from-within glow.',
    shortDescription: 'Double-ended cream blush for sculpted glow',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 3550 },
    brand: 'Patrick Ta',
    stock: 29,
    categoryIds: [],
    tags: ['new-arrival', 'cream-blush', 'sculpting', 'glow'],
    sku: 'PT-MH-10',
    weight: 18,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals'
  },
  {
    title: 'Laneige Cream Skin Toner & Moisturizer',
    slug: 'laneige-cream-skin-toner-moisturizer',
    description: 'A hybrid toner and moisturizer that delivers intense hydration with a milky texture. Infused with white leaf tea water for soft, supple, glowing skin.',
    shortDescription: 'Hybrid toner-moisturizer for intense hydration',
    images: [
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 2950, originalAmount: 3200, discountPercentage: 8 },
    brand: 'Laneige',
    stock: 62,
    categoryIds: [],
    tags: ['new-arrival', 'toner', 'moisturizer', 'k-beauty'],
    sku: 'LG-CS-250',
    weight: 280,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals'
  },
  {
    title: 'Huda Beauty Easy Bake Loose Setting Powder',
    slug: 'huda-beauty-easy-bake-loose-setting-powder',
    description: 'A micro-fine loose powder that sets makeup for a flawless, airbrushed finish. Oil-absorbing formula keeps makeup fresh without flashback.',
    shortDescription: 'Micro-fine setting powder for airbrushed finish',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 3750 },
    brand: 'Huda Beauty',
    stock: 44,
    categoryIds: [],
    tags: ['new-arrival', 'powder', 'setting', 'airbrushed'],
    sku: 'HB-EB-35',
    weight: 50,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals'
  },
  {
    title: 'Ilia Super Serum Skin Tint SPF 40',
    slug: 'ilia-super-serum-skin-tint-spf40',
    description: 'A skin tint that combines skincare benefits with SPF 40 protection. Lightweight coverage with niacinamide and squalane for healthy, glowing skin.',
    shortDescription: 'Skincare-infused tint with SPF 40',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 4850, originalAmount: 5200, discountPercentage: 7 },
    brand: 'Ilia',
    stock: 36,
    categoryIds: [],
    tags: ['new-arrival', 'skin-tint', 'spf', 'skincare-makeup'],
    sku: 'IL-SS-30',
    weight: 45,
    isActive: true,
    isFeatured: true,
    homepageSection: 'new-arrivals'
  }
];

// 12 Skincare Essentials Products
const skincareEssentials = [
  {
    title: 'La Roche-Posay Toleriane Double Repair Face Moisturizer',
    slug: 'la-roche-posay-toleriane-double-repair-moisturizer',
    description: 'A lightweight daily moisturizer with ceramides and niacinamide that repairs the skin barrier. Provides 48-hour hydration for sensitive skin.',
    shortDescription: '48-hour hydration with ceramides and niacinamide',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 1950 },
    brand: 'La Roche-Posay',
    stock: 58,
    categoryIds: [],
    tags: ['skincare-essential', 'moisturizer', 'ceramides', 'sensitive-skin'],
    sku: 'LRP-TD-75',
    weight: 90,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials'
  },
  {
    title: 'CeraVe Hydrating Facial Cleanser',
    slug: 'cerave-hydrating-facial-cleanser',
    description: 'A gentle, non-foaming cleanser with ceramides and hyaluronic acid. Cleanses without stripping moisture, perfect for normal to dry skin types.',
    shortDescription: 'Gentle hydrating cleanser with ceramides',
    images: [
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=85',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 1250, originalAmount: 1450, discountPercentage: 14 },
    brand: 'CeraVe',
    stock: 72,
    categoryIds: [],
    tags: ['skincare-essential', 'cleanser', 'hydrating', 'gentle'],
    sku: 'CV-HC-236',
    weight: 260,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials'
  },
  {
    title: 'The Ordinary Niacinamide 10% + Zinc 1%',
    slug: 'the-ordinary-niacinamide-10-zinc-1',
    description: 'A high-strength vitamin and mineral serum that reduces the appearance of blemishes and congestion. Balances visible sebum production for clearer skin.',
    shortDescription: 'High-strength serum for blemish-prone skin',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 750 },
    brand: 'The Ordinary',
    stock: 95,
    categoryIds: [],
    tags: ['skincare-essential', 'serum', 'niacinamide', 'blemish'],
    sku: 'TO-NZ-30',
    weight: 45,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials'
  },
  {
    title: 'Neutrogena Hydro Boost Water Gel',
    slug: 'neutrogena-hydro-boost-water-gel',
    description: 'An oil-free gel moisturizer with hyaluronic acid that delivers intense hydration. Absorbs quickly for supple, smooth skin that lasts all day.',
    shortDescription: 'Oil-free water gel with hyaluronic acid',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 1350, originalAmount: 1550, discountPercentage: 13 },
    brand: 'Neutrogena',
    stock: 63,
    categoryIds: [],
    tags: ['skincare-essential', 'moisturizer', 'oil-free', 'hydrating'],
    sku: 'NG-HB-50',
    weight: 65,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials'
  },
  {
    title: 'COSRX Snail Mucin 96% Power Essence',
    slug: 'cosrx-snail-mucin-96-power-essence',
    description: 'A lightweight essence with 96% snail secretion filtrate that repairs and rejuvenates skin. Improves hydration, healing, and overall skin texture.',
    shortDescription: 'Repairing essence with 96% snail mucin',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=85',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 1650 },
    brand: 'COSRX',
    stock: 48,
    categoryIds: [],
    tags: ['skincare-essential', 'essence', 'snail-mucin', 'k-beauty'],
    sku: 'CX-SM-100',
    weight: 125,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials'
  },
  {
    title: 'Paula\'s Choice Skin Perfecting 2% BHA Liquid Exfoliant',
    slug: 'paulas-choice-2-bha-liquid-exfoliant',
    description: 'A gentle liquid exfoliant with 2% salicylic acid that unclogs pores and reduces blackheads. Improves skin texture for clearer, smoother complexion.',
    shortDescription: 'Gentle liquid exfoliant with salicylic acid',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 2850 },
    brand: 'Paula\'s Choice',
    stock: 34,
    categoryIds: [],
    tags: ['skincare-essential', 'exfoliant', 'bha', 'acne'],
    sku: 'PC-BHA-118',
    weight: 135,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials'
  },
  {
    title: 'Cetaphil Gentle Skin Cleanser',
    slug: 'cetaphil-gentle-skin-cleanser',
    description: 'A dermatologist-recommended cleanser that gently removes dirt and impurities without irritating skin. Ideal for sensitive and dry skin types.',
    shortDescription: 'Dermatologist-recommended gentle cleanser',
    images: [
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 1150 },
    brand: 'Cetaphil',
    stock: 87,
    categoryIds: [],
    tags: ['skincare-essential', 'cleanser', 'gentle', 'sensitive-skin'],
    sku: 'CP-GS-236',
    weight: 255,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials'
  },
  {
    title: 'Biossance Squalane + Vitamin C Rose Oil',
    slug: 'biossance-squalane-vitamin-c-rose-oil',
    description: 'A luxurious facial oil that brightens and hydrates with vitamin C and squalane. Delivers instant radiance while improving skin tone and texture.',
    shortDescription: 'Brightening facial oil with vitamin C',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 4250, originalAmount: 4650, discountPercentage: 9 },
    brand: 'Biossance',
    stock: 27,
    categoryIds: [],
    tags: ['skincare-essential', 'facial-oil', 'vitamin-c', 'brightening'],
    sku: 'BS-SC-30',
    weight: 45,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials'
  },
  {
    title: 'Kiehl\'s Ultra Facial Cream',
    slug: 'kiehls-ultra-facial-cream',
    description: 'A 24-hour daily face moisturizer with glacial glycoprotein and desert plant extracts. Provides continuous moisture without feeling heavy or greasy.',
    shortDescription: '24-hour moisturizer with glacial glycoprotein',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=85',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 2950 },
    brand: 'Kiehl\'s',
    stock: 41,
    categoryIds: [],
    tags: ['skincare-essential', 'moisturizer', '24-hour', 'hydrating'],
    sku: 'KH-UF-50',
    weight: 70,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials'
  },
  {
    title: 'Innisfree Green Tea Seed Serum',
    slug: 'innisfree-green-tea-seed-serum',
    description: 'A hydrating serum with fresh Jeju green tea and green tea seeds. Provides deep moisture and strengthens skin\'s moisture barrier for healthy, glowing skin.',
    shortDescription: 'Hydrating green tea serum from Jeju',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 1850, originalAmount: 2100, discountPercentage: 12 },
    brand: 'Innisfree',
    stock: 55,
    categoryIds: [],
    tags: ['skincare-essential', 'serum', 'green-tea', 'k-beauty'],
    sku: 'IF-GT-80',
    weight: 95,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials'
  },
  {
    title: 'First Aid Beauty Ultra Repair Cream',
    slug: 'first-aid-beauty-ultra-repair-cream',
    description: 'An intensive moisturizer with colloidal oatmeal and shea butter. Instantly relieves dry, distressed skin and strengthens the skin barrier.',
    shortDescription: 'Intensive repair cream for dry skin',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 2550 },
    brand: 'First Aid Beauty',
    stock: 46,
    categoryIds: [],
    tags: ['skincare-essential', 'moisturizer', 'repair', 'dry-skin'],
    sku: 'FAB-UR-170',
    weight: 190,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials'
  },
  {
    title: 'Supergoop! Unseen Sunscreen SPF 40',
    slug: 'supergoop-unseen-sunscreen-spf40',
    description: 'An invisible, weightless sunscreen with SPF 40 that acts as a makeup gripping primer. Oil-free formula leaves a velvety finish without white cast.',
    shortDescription: 'Invisible SPF 40 sunscreen primer',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 3750, originalAmount: 4100, discountPercentage: 9 },
    brand: 'Supergoop!',
    stock: 39,
    categoryIds: [],
    tags: ['skincare-essential', 'sunscreen', 'spf40', 'primer'],
    sku: 'SG-US-50',
    weight: 65,
    isActive: true,
    isFeatured: true,
    homepageSection: 'skincare-essentials'
  }
];

// 12 Makeup Collection Products
const makeupCollection = [
  {
    title: 'MAC Studio Fix Fluid Foundation SPF 15',
    slug: 'mac-studio-fix-fluid-foundation-spf15',
    description: 'A medium-to-full coverage foundation with SPF 15 that provides a natural matte finish. Controls shine and minimizes the appearance of pores.',
    shortDescription: 'Medium coverage foundation with SPF 15',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 3850 },
    brand: 'MAC',
    stock: 52,
    categoryIds: [],
    tags: ['makeup-collection', 'foundation', 'spf', 'matte'],
    sku: 'MAC-SF-30',
    weight: 45,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection'
  },
  {
    title: 'NARS Radiant Creamy Concealer',
    slug: 'nars-radiant-creamy-concealer',
    description: 'A multi-action concealer that instantly brightens and perfects. Lightweight, creamy formula provides buildable coverage with a natural, luminous finish.',
    shortDescription: 'Radiant concealer with buildable coverage',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 3250 },
    brand: 'NARS',
    stock: 47,
    categoryIds: [],
    tags: ['makeup-collection', 'concealer', 'radiant', 'buildable'],
    sku: 'NARS-RC-6',
    weight: 15,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection'
  },
  {
    title: 'Urban Decay Naked3 Eyeshadow Palette',
    slug: 'urban-decay-naked3-eyeshadow-palette',
    description: 'A 12-shade rosy-neutral eyeshadow palette with a mix of matte and shimmer finishes. From soft pink to deep burgundy for endless eye looks.',
    shortDescription: '12-shade rosy-neutral eyeshadow palette',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 5850, originalAmount: 6400, discountPercentage: 9 },
    brand: 'Urban Decay',
    stock: 28,
    categoryIds: [],
    tags: ['makeup-collection', 'eyeshadow', 'palette', 'neutral'],
    sku: 'UD-N3-12',
    weight: 85,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection'
  },
  {
    title: 'Benefit Cosmetics Hoola Matte Bronzer',
    slug: 'benefit-cosmetics-hoola-matte-bronzer',
    description: 'A natural-looking matte bronzer that\'s buildable and foolproof. Perfect for contouring and adding warmth to the complexion.',
    shortDescription: 'Natural matte bronzer for contouring',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 3450 },
    brand: 'Benefit',
    stock: 41,
    categoryIds: [],
    tags: ['makeup-collection', 'bronzer', 'matte', 'contouring'],
    sku: 'BEN-HL-8',
    weight: 22,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection'
  },
  {
    title: 'Anastasia Beverly Hills Dipbrow Pomade',
    slug: 'anastasia-beverly-hills-dipbrow-pomade',
    description: 'A waterproof, smudge-proof brow pomade that creates natural-looking, defined brows. Long-wearing formula that doesn\'t fade throughout the day.',
    shortDescription: 'Waterproof brow pomade for defined brows',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 2650 },
    brand: 'Anastasia Beverly Hills',
    stock: 56,
    categoryIds: [],
    tags: ['makeup-collection', 'brow', 'pomade', 'waterproof'],
    sku: 'ABH-DP-4',
    weight: 8,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection'
  },
  {
    title: 'Too Faced Better Than Sex Mascara',
    slug: 'too-faced-better-than-sex-mascara',
    description: 'An iconic volumizing mascara that delivers dramatic volume and length. Hourglass-shaped brush coats every lash for intense black color.',
    shortDescription: 'Volumizing mascara for dramatic lashes',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 2950 },
    brand: 'Too Faced',
    stock: 63,
    categoryIds: [],
    tags: ['makeup-collection', 'mascara', 'volumizing', 'lengthening'],
    sku: 'TF-BTS-8',
    weight: 12,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection'
  },
  {
    title: 'Maybelline SuperStay Matte Ink Liquid Lipstick',
    slug: 'maybelline-superstay-matte-ink-liquid-lipstick',
    description: 'A long-lasting liquid lipstick with up to 16-hour wear. Intense matte color that doesn\'t budge, feather, or dry out lips.',
    shortDescription: '16-hour wear liquid matte lipstick',
    images: [
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800',
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 950, originalAmount: 1100, discountPercentage: 14 },
    brand: 'Maybelline',
    stock: 78,
    categoryIds: [],
    tags: ['makeup-collection', 'lipstick', 'liquid', 'matte', 'long-lasting'],
    sku: 'MB-SM-5',
    weight: 10,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection'
  },
  {
    title: 'Stila Stay All Day Waterproof Liquid Eyeliner',
    slug: 'stila-stay-all-day-waterproof-liquid-eyeliner',
    description: 'A long-wearing, waterproof liquid eyeliner with an ultra-fine tip. Creates precise lines that last all day without smudging or running.',
    shortDescription: 'Waterproof liquid eyeliner with precision tip',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 2450 },
    brand: 'Stila',
    stock: 44,
    categoryIds: [],
    tags: ['makeup-collection', 'eyeliner', 'waterproof', 'liquid'],
    sku: 'ST-SAD-0.5',
    weight: 6,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection'
  },
  {
    title: 'Tarte Shape Tape Contour Concealer',
    slug: 'tarte-shape-tape-contour-concealer',
    description: 'A full-coverage concealer that contours, highlights, and perfects. Long-wearing formula with hydrating ingredients for comfortable all-day wear.',
    shortDescription: 'Full-coverage contouring concealer',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 3150 },
    brand: 'Tarte',
    stock: 51,
    categoryIds: [],
    tags: ['makeup-collection', 'concealer', 'full-coverage', 'contouring'],
    sku: 'TAR-ST-10',
    weight: 15,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection'
  },
  {
    title: 'NYX Professional Makeup Setting Spray',
    slug: 'nyx-professional-makeup-setting-spray',
    description: 'A lightweight setting spray that keeps makeup in place for up to 16 hours. Matte finish formula controls shine without feeling heavy.',
    shortDescription: '16-hour makeup setting spray',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 850 },
    brand: 'NYX',
    stock: 82,
    categoryIds: [],
    tags: ['makeup-collection', 'setting-spray', 'long-lasting', 'matte'],
    sku: 'NYX-MS-60',
    weight: 75,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection'
  },
  {
    title: 'Morphe 35O Nature Glow Eyeshadow Palette',
    slug: 'morphe-35o-nature-glow-eyeshadow-palette',
    description: 'A 35-shade eyeshadow palette with warm, earthy tones. Mix of matte and shimmer finishes perfect for everyday and dramatic looks.',
    shortDescription: '35-shade warm tone eyeshadow palette',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=90'
    ],
    price: { currency: 'BDT', amount: 3250, originalAmount: 3650, discountPercentage: 11 },
    brand: 'Morphe',
    stock: 35,
    categoryIds: [],
    tags: ['makeup-collection', 'eyeshadow', 'palette', 'warm-tones'],
    sku: 'MOR-35O-35',
    weight: 95,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection'
  },
  {
    title: 'e.l.f. Poreless Putty Primer',
    slug: 'elf-poreless-putty-primer',
    description: 'A velvety face primer that smooths skin and minimizes the appearance of pores. Grips makeup for long-lasting wear with a flawless finish.',
    shortDescription: 'Poreless putty primer for smooth skin',
    images: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=85'
    ],
    price: { currency: 'BDT', amount: 650 },
    brand: 'e.l.f.',
    stock: 91,
    categoryIds: [],
    tags: ['makeup-collection', 'primer', 'pore-minimizing', 'affordable'],
    sku: 'ELF-PP-21',
    weight: 28,
    isActive: true,
    isFeatured: true,
    homepageSection: 'makeup-collection'
  }
];

async function seedDatabase() {
  try {
    logger.info('🌱 Starting homepage products seeding...');
    
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
    const categoryMap: Record<string, any> = {};
    const insertedCategories = await db.collection('categories').find({}).toArray();
    insertedCategories.forEach(cat => {
      categoryMap[cat.slug] = cat._id;
    });
    
    // Function to assign categories to products based on their section
    const assignCategories = (product: any, section: string) => {
      const categoryIds = [];
      
      if (section === 'skincare-essentials' || product.tags.includes('skincare-essential')) {
        categoryIds.push(categoryMap['skincare']);
        if (product.tags.includes('cleanser')) categoryIds.push(categoryMap['cleansers']);
        if (product.tags.includes('moisturizer')) categoryIds.push(categoryMap['moisturizers']);
        if (product.tags.includes('serum') || product.tags.includes('essence')) categoryIds.push(categoryMap['serums']);
        if (product.tags.includes('sunscreen')) categoryIds.push(categoryMap['sunscreen']);
      }
      
      if (section === 'makeup-collection' || product.tags.includes('makeup-collection')) {
        categoryIds.push(categoryMap['makeup']);
        if (product.tags.includes('foundation')) categoryIds.push(categoryMap['foundation']);
        if (product.tags.includes('lipstick')) categoryIds.push(categoryMap['lipstick']);
        if (product.tags.includes('eyeshadow')) categoryIds.push(categoryMap['eye-makeup']);
      }
      
      if (section === 'new-arrivals') {
        // New arrivals can be in any category
        if (product.tags.some((t: string) => ['serum', 'moisturizer', 'cleanser', 'skincare-essential'].includes(t))) {
          categoryIds.push(categoryMap['skincare']);
        }
        if (product.tags.some((t: string) => ['foundation', 'lipstick', 'makeup', 'blush'].includes(t))) {
          categoryIds.push(categoryMap['makeup']);
        }
      }
      
      return categoryIds.filter(Boolean);
    };
    
    // Combine all products and assign categories
    const allProducts = [
      ...newArrivals.map(p => ({ ...p, categoryIds: assignCategories(p, 'new-arrivals') })),
      ...skincareEssentials.map(p => ({ ...p, categoryIds: assignCategories(p, 'skincare-essentials') })),
      ...makeupCollection.map(p => ({ ...p, categoryIds: assignCategories(p, 'makeup-collection') }))
    ];
    
    // Add timestamps to all products
    const productsWithTimestamps = allProducts.map(product => ({
      ...product,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    // Insert products
    logger.info('🛍️ Inserting products...');
    const productResult = await db.collection('products').insertMany(productsWithTimestamps);
    
    logger.info(`✅ Inserted ${Object.keys(productResult.insertedIds).length} products`);
    
    // Create indexes for better performance
    logger.info('📊 Creating database indexes...');
    await db.collection('products').createIndex({ slug: 1 }, { unique: true });
    await db.collection('products').createIndex({ title: 'text', description: 'text', brand: 'text' });
    await db.collection('products').createIndex({ categoryIds: 1 });
    await db.collection('products').createIndex({ isActive: 1 });
    await db.collection('products').createIndex({ isFeatured: 1 });
    await db.collection('products').createIndex({ homepageSection: 1 });
    await db.collection('products').createIndex({ 'price.amount': 1 });
    await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
    
    logger.info('✅ Database indexes created');
    
    // Summary
    logger.info('🎉 Database seeding completed successfully!');
    logger.info(`📊 Summary:`);
    logger.info(`   - Categories: ${categoryIds.length}`);
    logger.info(`   - Total Products: ${Object.keys(productResult.insertedIds).length}`);
    logger.info(`   - New Arrivals: ${newArrivals.length}`);
    logger.info(`   - Skincare Essentials: ${skincareEssentials.length}`);
    logger.info(`   - Makeup Collection: ${makeupCollection.length}`);
    logger.info(`   - Brands: ${[...new Set(allProducts.map(p => p.brand))].length}`);
    logger.info(`   - Featured Products: ${allProducts.filter(p => p.isFeatured).length}`);
    
    const totalValue = allProducts.reduce((sum, p) => sum + p.price.amount, 0);
    logger.info(`   - Total Catalog Value: ৳${totalValue.toLocaleString('en-BD')}`);
    
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

