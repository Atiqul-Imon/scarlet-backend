import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/scarlet';

const brands = [
  {
    name: "L'Oréal Paris",
    slug: "loreal-paris",
    description: "Leading beauty brand offering innovative cosmetics and skincare products for all skin types",
    shortDescription: "Innovative beauty solutions",
    category: "Makeup",
    establishedYear: 1909,
    origin: "France",
    specialties: ["Foundation", "Lipstick", "Eyeshadow", "Skincare"],
    about: "L'Oréal Paris is a global beauty leader, committed to empowering women through beauty innovation and scientific excellence.",
    isActive: true,
    isFeatured: true,
    sortOrder: 1,
    productCount: 0,
    seoTitle: "L'Oréal Paris Beauty Products",
    seoDescription: "Discover L'Oréal Paris makeup and skincare products for all your beauty needs",
    seoKeywords: ["loreal", "paris", "makeup", "skincare", "beauty"],
    socialLinks: {
      instagram: "https://instagram.com/lorealparis",
      facebook: "https://facebook.com/lorealparis",
      youtube: "https://youtube.com/lorealparis"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId("000000000000000000000001"),
    updatedBy: new ObjectId("000000000000000000000001")
  },
  {
    name: "Maybelline New York",
    slug: "maybelline-new-york",
    description: "Affordable, high-quality makeup products for every beauty enthusiast",
    shortDescription: "Make it happen with Maybelline",
    category: "Makeup",
    establishedYear: 1915,
    origin: "USA",
    specialties: ["Mascara", "Foundation", "Lipstick", "Eyeshadow"],
    about: "Maybelline New York makes it easy for every woman to express her individual beauty with our innovative, accessible, and on-trend products.",
    isActive: true,
    isFeatured: true,
    sortOrder: 2,
    productCount: 0,
    seoTitle: "Maybelline New York Makeup",
    seoDescription: "Shop Maybelline New York makeup products for eyes, lips, and face",
    seoKeywords: ["maybelline", "makeup", "new york", "beauty", "cosmetics"],
    socialLinks: {
      instagram: "https://instagram.com/maybelline",
      facebook: "https://facebook.com/maybelline",
      youtube: "https://youtube.com/maybelline"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId("000000000000000000000001"),
    updatedBy: new ObjectId("000000000000000000000001")
  },
  {
    name: "Neutrogena",
    slug: "neutrogena",
    description: "Dermatologist-recommended skincare products for healthy, beautiful skin",
    shortDescription: "Dermatologist-recommended skincare",
    category: "Skincare",
    establishedYear: 1930,
    origin: "USA",
    specialties: ["Acne Treatment", "Anti-Aging", "Sun Protection", "Cleansing"],
    about: "Neutrogena is a dermatologist-recommended brand that creates gentle, effective skincare products for all skin types.",
    isActive: true,
    isFeatured: true,
    sortOrder: 3,
    productCount: 0,
    seoTitle: "Neutrogena Skincare Products",
    seoDescription: "Discover Neutrogena's dermatologist-recommended skincare solutions",
    seoKeywords: ["neutrogena", "skincare", "dermatologist", "acne", "anti-aging"],
    socialLinks: {
      instagram: "https://instagram.com/neutrogena",
      facebook: "https://facebook.com/neutrogena",
      youtube: "https://youtube.com/neutrogena"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId("000000000000000000000001"),
    updatedBy: new ObjectId("000000000000000000000001")
  },
  {
    name: "Olay",
    slug: "olay",
    description: "Advanced skincare solutions for ageless beauty",
    shortDescription: "Love the skin you're in",
    category: "Skincare",
    establishedYear: 1952,
    origin: "USA",
    specialties: ["Anti-Aging", "Moisturizing", "Cleansing", "Sun Protection"],
    about: "Olay is committed to helping women look and feel their best with advanced skincare technology and proven results.",
    isActive: true,
    isFeatured: true,
    sortOrder: 4,
    productCount: 0,
    seoTitle: "Olay Skincare Products",
    seoDescription: "Transform your skin with Olay's advanced skincare technology",
    seoKeywords: ["olay", "skincare", "anti-aging", "moisturizer", "beauty"],
    socialLinks: {
      instagram: "https://instagram.com/olay",
      facebook: "https://facebook.com/olay",
      youtube: "https://youtube.com/olay"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId("000000000000000000000001"),
    updatedBy: new ObjectId("000000000000000000000001")
  },
  {
    name: "Pantene",
    slug: "pantene",
    description: "Professional hair care products for strong, beautiful hair",
    shortDescription: "Hair so healthy it shines",
    category: "Hair Care",
    establishedYear: 1945,
    origin: "Switzerland",
    specialties: ["Shampoo", "Conditioner", "Hair Treatment", "Color Protection"],
    about: "Pantene provides professional-quality hair care products that help you achieve strong, beautiful, and healthy hair.",
    isActive: true,
    isFeatured: true,
    sortOrder: 5,
    productCount: 0,
    seoTitle: "Pantene Hair Care Products",
    seoDescription: "Get strong, beautiful hair with Pantene's professional hair care",
    seoKeywords: ["pantene", "hair care", "shampoo", "conditioner", "hair treatment"],
    socialLinks: {
      instagram: "https://instagram.com/pantene",
      facebook: "https://facebook.com/pantene",
      youtube: "https://youtube.com/pantene"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId("000000000000000000000001"),
    updatedBy: new ObjectId("000000000000000000000001")
  },
  {
    name: "Head & Shoulders",
    slug: "head-shoulders",
    description: "Anti-dandruff shampoo and hair care solutions",
    shortDescription: "Dandruff-free hair, naturally",
    category: "Hair Care",
    establishedYear: 1961,
    origin: "USA",
    specialties: ["Anti-Dandruff", "Shampoo", "Hair Treatment", "Scalp Care"],
    about: "Head & Shoulders is the world's #1 anti-dandruff shampoo brand, providing effective solutions for healthy scalp and beautiful hair.",
    isActive: true,
    isFeatured: false,
    sortOrder: 6,
    productCount: 0,
    seoTitle: "Head & Shoulders Anti-Dandruff Shampoo",
    seoDescription: "Get rid of dandruff with Head & Shoulders anti-dandruff shampoo",
    seoKeywords: ["head and shoulders", "anti-dandruff", "shampoo", "hair care", "dandruff"],
    socialLinks: {
      instagram: "https://instagram.com/headandshoulders",
      facebook: "https://facebook.com/headandshoulders",
      youtube: "https://youtube.com/headandshoulders"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId("000000000000000000000001"),
    updatedBy: new ObjectId("000000000000000000000001")
  },
  {
    name: "Johnson's Baby",
    slug: "johnsons-baby",
    description: "Gentle baby care products for your little one's delicate skin",
    shortDescription: "Gentle care for baby's skin",
    category: "Baby Care",
    establishedYear: 1893,
    origin: "USA",
    specialties: ["Baby Shampoo", "Baby Lotion", "Baby Oil", "Gentle Formulas"],
    about: "Johnson's Baby has been trusted by parents for over 125 years to provide gentle, safe, and effective baby care products.",
    isActive: true,
    isFeatured: true,
    sortOrder: 7,
    productCount: 0,
    seoTitle: "Johnson's Baby Care Products",
    seoDescription: "Gentle baby care products for your little one's delicate skin",
    seoKeywords: ["johnsons baby", "baby care", "baby shampoo", "baby lotion", "gentle"],
    socialLinks: {
      instagram: "https://instagram.com/johnsonsbaby",
      facebook: "https://facebook.com/johnsonsbaby",
      youtube: "https://youtube.com/johnsonsbaby"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId("000000000000000000000001"),
    updatedBy: new ObjectId("000000000000000000000001")
  },
  {
    name: "Revlon",
    slug: "revlon",
    description: "Iconic beauty brand offering bold, beautiful makeup and skincare",
    shortDescription: "Live boldly with Revlon",
    category: "Makeup",
    establishedYear: 1932,
    origin: "USA",
    specialties: ["Lipstick", "Foundation", "Nail Polish", "Eyeshadow"],
    about: "Revlon is an iconic beauty brand that empowers women to express their individuality through bold, beautiful makeup and skincare.",
    isActive: true,
    isFeatured: true,
    sortOrder: 8,
    productCount: 0,
    seoTitle: "Revlon Makeup and Beauty Products",
    seoDescription: "Express your individuality with Revlon's bold makeup and beauty products",
    seoKeywords: ["revlon", "makeup", "lipstick", "nail polish", "beauty"],
    socialLinks: {
      instagram: "https://instagram.com/revlon",
      facebook: "https://facebook.com/revlon",
      youtube: "https://youtube.com/revlon"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId("000000000000000000000001"),
    updatedBy: new ObjectId("000000000000000000000001")
  },
  {
    name: "Nivea",
    slug: "nivea",
    description: "Trusted skincare brand for all skin types and ages",
    shortDescription: "Care for your skin",
    category: "Skincare",
    establishedYear: 1911,
    origin: "Germany",
    specialties: ["Moisturizing", "Anti-Aging", "Sun Protection", "Body Care"],
    about: "Nivea is a trusted skincare brand that has been caring for skin for over 100 years with gentle, effective products.",
    isActive: true,
    isFeatured: true,
    sortOrder: 9,
    productCount: 0,
    seoTitle: "Nivea Skincare Products",
    seoDescription: "Care for your skin with Nivea's trusted skincare solutions",
    seoKeywords: ["nivea", "skincare", "moisturizer", "body care", "beauty"],
    socialLinks: {
      instagram: "https://instagram.com/nivea",
      facebook: "https://facebook.com/nivea",
      youtube: "https://youtube.com/nivea"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId("000000000000000000000001"),
    updatedBy: new ObjectId("000000000000000000000001")
  },
  {
    name: "Garnier",
    slug: "garnier",
    description: "Natural beauty solutions for hair and skin care",
    shortDescription: "Beauty that's worth it",
    category: "Hair Care",
    establishedYear: 1904,
    origin: "France",
    specialties: ["Hair Color", "Hair Care", "Skincare", "Natural Ingredients"],
    about: "Garnier combines natural ingredients with innovative technology to create effective beauty solutions for hair and skin.",
    isActive: true,
    isFeatured: true,
    sortOrder: 10,
    productCount: 0,
    seoTitle: "Garnier Hair and Skincare Products",
    seoDescription: "Natural beauty solutions for hair and skin with Garnier",
    seoKeywords: ["garnier", "hair care", "hair color", "skincare", "natural"],
    socialLinks: {
      instagram: "https://instagram.com/garnier",
      facebook: "https://facebook.com/garnier",
      youtube: "https://youtube.com/garnier"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new ObjectId("000000000000000000000001"),
    updatedBy: new ObjectId("000000000000000000000001")
  }
];

async function populateBrands() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('scarlet');
    const brandsCollection = db.collection('brands');
    
    // Clear existing brands
    console.log('Clearing existing brands...');
    await brandsCollection.deleteMany({});
    
    // Insert new brands
    console.log('Inserting brands...');
    const result = await brandsCollection.insertMany(brands);
    console.log(`Successfully inserted ${result.insertedCount} brands`);
    
    // Create indexes
    console.log('Creating indexes...');
    await brandsCollection.createIndex({ slug: 1 }, { unique: true });
    await brandsCollection.createIndex({ name: 1 });
    await brandsCollection.createIndex({ category: 1 });
    await brandsCollection.createIndex({ isActive: 1 });
    await brandsCollection.createIndex({ isFeatured: 1 });
    await brandsCollection.createIndex({ sortOrder: 1 });
    console.log('Indexes created successfully');
    
  } catch (error) {
    console.error('Error populating brands:', error);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

populateBrands();
