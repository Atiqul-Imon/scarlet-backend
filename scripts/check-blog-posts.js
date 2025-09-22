import { MongoClient } from 'mongodb'; 
import { config } from 'dotenv';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://imonatikulislam:1LhIjsSyfIWCVlgz@cluster0.08anqce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'scarlet';

async function checkBlogPosts() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db(DB_NAME);
    
    // Check blog_posts collection
    console.log('\n📝 Checking blog_posts collection...');
    const blogPosts = await db.collection('blog_posts').find({}).toArray();
    console.log(`📊 Total blog posts: ${blogPosts.length}`);
    
    if (blogPosts.length > 0) {
      console.log('\n📋 All blog posts:');
      blogPosts.forEach((post, index) => {
        console.log(`\n${index + 1}. ${post.title}`);
        console.log(`   ID: ${post._id}`);
        console.log(`   Slug: ${post.slug}`);
        console.log(`   Status: ${post.status}`);
        console.log(`   Author: ${post.author?.name || 'N/A'}`);
        console.log(`   Featured Image: ${post.featuredImage ? 'Yes' : 'No'}`);
        console.log(`   Created: ${post.createdAt}`);
        console.log(`   Tags: ${post.tags?.join(', ') || 'None'}`);
        console.log(`   Categories: ${post.categories?.length || 0}`);
        if (post.featuredImage) {
          console.log(`   Image URL: ${post.featuredImage}`);
        }
      });
      
      // Show the most recent post in detail
      const latestPost = blogPosts[blogPosts.length - 1];
      console.log('\n🔍 Latest blog post details:');
      console.log(JSON.stringify(latestPost, null, 2));
    } else {
      console.log('❌ No blog posts found in the database');
    }
    
    // Check blog_categories collection
    console.log('\n📂 Checking blog_categories collection...');
    const categories = await db.collection('blog_categories').find({}).toArray();
    console.log(`📊 Total categories: ${categories.length}`);
    
    if (categories.length > 0) {
      console.log('\n📋 All categories:');
      categories.forEach((category, index) => {
        console.log(`${index + 1}. ${category.name} (${category.slug})`);
      });
    }
    
    // List all collections to see what's available
    console.log('\n🗂️ All collections in database:');
    const collections = await db.listCollections().toArray();
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

checkBlogPosts();
