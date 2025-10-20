# Redis Production Setup Guide

## 🚀 Current Status

**Local Development:** ✅ Redis running (localhost:6379)  
**Production:** ⚠️ **Using In-Memory Fallback** (Redis not configured)

Your code is **production-ready** with automatic fallback to in-memory storage when Redis is unavailable. However, for **optimal performance and persistence**, you should configure Redis in production.

---

## 📊 Why Use Redis in Production?

### Without Redis (Current State):
- ⚠️ **In-memory cache** - Lost on server restart
- ⚠️ **No cross-instance sharing** - Each server instance has separate cache
- ⚠️ **Higher database load** - More MongoDB queries
- ✅ **Still works** - Graceful fallback ensures no errors

### With Redis (Recommended):
- ✅ **Persistent cache** - Survives server restarts
- ✅ **Shared across instances** - All servers use same cache
- ✅ **90%+ faster responses** - 130ms → 5-10ms
- ✅ **Lower database costs** - Fewer MongoDB operations
- ✅ **Better user experience** - Instant page loads

---

## 🌐 Redis Options for Production

### Option 1: **Upstash Redis** (Recommended for Vercel/Serverless) ⭐

**Why Upstash:**
- ✅ Serverless-native (perfect for Vercel/Netlify)
- ✅ Pay-per-request pricing (no idle costs)
- ✅ Free tier: 10,000 requests/day
- ✅ Global edge caching
- ✅ REST API + Redis protocol
- ✅ Auto-scaling

**Pricing:**
- **Free:** 10K requests/day, 256MB storage
- **Pro:** $0.2 per 100K requests

**Setup:**

1. **Create Upstash Account:**
   ```
   https://console.upstash.com/
   ```

2. **Create Redis Database:**
   - Click "Create Database"
   - Name: `scarlet-production`
   - Region: Choose closest to your users (e.g., `us-east-1`)
   - Type: Regional (faster) or Global (distributed)
   - Click "Create"

3. **Get Connection String:**
   ```
   Upstash Console → Your Database → Details
   
   Copy: Redis URL
   Example: redis://default:AbC123xyz@us1-mighty-hawk-12345.upstash.io:6379
   ```

4. **Add to Your Deployment:**

   **For Render:**
   ```bash
   # In Render Dashboard → Environment Variables
   REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
   ```

   **For Vercel (Backend API):**
   ```bash
   # Vercel Dashboard → Settings → Environment Variables
   REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
   ```

---

### Option 2: **Redis Cloud** (Managed Redis) 🔴

**Why Redis Cloud:**
- ✅ Official Redis Labs service
- ✅ Traditional Redis (best compatibility)
- ✅ Free tier: 30MB storage
- ✅ Enterprise features
- ✅ Multi-cloud support

**Pricing:**
- **Free:** 30MB, 30 connections
- **Paid:** Starting $5/month

**Setup:**

1. **Create Account:**
   ```
   https://redis.com/try-free/
   ```

2. **Create Subscription & Database:**
   - Choose Cloud: AWS/GCP/Azure
   - Region: Same as your backend
   - Plan: Free (for testing) or Fixed (for production)

3. **Get Connection String:**
   ```
   Format: redis://default:password@endpoint:port
   ```

4. **Configure Same as Upstash Above**

---

### Option 3: **Railway Redis** (Simple & Fast) 🚂

**Why Railway:**
- ✅ One-click Redis deployment
- ✅ Free $5/month credit
- ✅ Simple pricing
- ✅ Great DX

**Pricing:**
- **Free:** $5 credit/month (enough for small Redis)
- **Usage-based:** $0.000231/GB-hour

**Setup:**

1. **Create Project:**
   ```
   https://railway.app/
   ```

2. **Add Redis:**
   - New Project → Add Redis
   - Railway auto-generates connection string

3. **Get Connection String:**
   ```
   Railway Dashboard → Redis → Connect
   Copy: REDIS_URL
   ```

---

### Option 4: **Render Redis** (Same Platform) 🎨

**Why Render Redis:**
- ✅ Same platform as your backend
- ✅ Private networking (faster)
- ✅ Simple setup

**Pricing:**
- **Starter:** $7/month (25MB)
- **Standard:** $15/month (100MB)

**Setup:**

1. **Add Redis to render.yaml:**
   ```yaml
   services:
     - type: redis
       name: scarlet-redis
       plan: starter
       maxmemoryPolicy: allkeys-lru
       ipAllowList: []  # private network only
   ```

2. **Update your backend service:**
   ```yaml
   services:
     - type: web
       name: scarlet-backend
       envVars:
         - key: REDIS_URL
           fromService:
             name: scarlet-redis
             type: redis
             property: connectionString
   ```

3. **Deploy:**
   ```bash
   git add render.yaml
   git commit -m "Add Redis to production"
   git push
   ```

---

## 🔧 Implementation Steps (Choose One Option Above)

### Step 1: Choose Redis Provider
Select one option from above based on:
- **Serverless backend?** → Upstash
- **Traditional deployment?** → Redis Cloud or Railway
- **Using Render?** → Render Redis

### Step 2: Get Connection String
From your chosen provider's dashboard

### Step 3: Configure Environment Variable

**For Render (Current Setup):**
```bash
# Render Dashboard
Settings → Environment → Add Environment Variable

Key: REDIS_URL
Value: redis://default:password@endpoint:port
```

**For Vercel (If deploying to Vercel):**
```bash
# Vercel Dashboard
Settings → Environment Variables → Add

Key: REDIS_URL
Value: redis://default:password@endpoint:port
Environment: Production, Preview, Development
```

### Step 4: Redeploy
Your app will automatically detect Redis and switch from in-memory to Redis caching.

### Step 5: Verify

**Check logs for:**
```
✅ Redis connected successfully
✅ Redis client initialized successfully
```

**Test caching:**
```bash
# First request (cache miss)
curl https://your-backend.com/api/catalog/products/some-slug
# Response time: ~130ms

# Second request (cache hit)
curl https://your-backend.com/api/catalog/products/some-slug
# Response time: ~5-10ms ⚡
```

---

## 📝 Recommended Configuration for Render

### Update `render.yaml`:

```yaml
services:
  - type: redis
    name: scarlet-redis
    plan: starter  # $7/month
    maxmemoryPolicy: allkeys-lru  # Evict least recently used keys
    ipAllowList: []  # Private network only

  - type: web
    name: scarlet-backend
    env: node
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: MONGODB_URI
        fromDatabase:
          name: scarlet-mongodb
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: scarlet-redis
          type: redis
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_EXPIRES_IN
        value: "7d"
      - key: BCRYPT_SALT_ROUNDS
        value: "12"
      - key: CORS_ORIGIN
        value: "https://scarletunlimited.net"
      - key: API_RATE_LIMIT
        value: "100"
      - key: MAX_FILE_SIZE
        value: "5242880"

databases:
  - name: scarlet-mongodb
    databaseName: scarlet_production
    user: scarlet_user
    plan: starter
```

---

## 🎯 My Recommendation

### Best Setup for Your Case:

**For Production (Render):**
1. ✅ Use **Render Redis** ($7/month)
   - Same datacenter = faster
   - Private networking
   - Simple management

**Alternative (Free to Start):**
2. ✅ Use **Upstash** (Free tier)
   - No upfront costs
   - Pay as you grow
   - Great for testing production caching

---

## 💰 Cost Comparison

| Provider | Free Tier | Paid | Best For |
|----------|-----------|------|----------|
| **Upstash** | 10K req/day | Pay-per-use | Serverless, Low traffic |
| **Redis Cloud** | 30MB | $5/month | Traditional apps |
| **Railway** | $5 credit | Usage-based | Simple setup |
| **Render** | None | $7/month | Same platform |

---

## 🔒 Security Best Practices

1. **Never commit Redis credentials to Git**
   ```bash
   # Already in .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use strong passwords**
   ```bash
   # Generate strong password
   openssl rand -base64 32
   ```

3. **Enable SSL/TLS** (Most providers do this by default)
   ```
   rediss:// (note the extra 's')
   ```

4. **Restrict IP access** (if supported)
   ```
   Only allow your backend server's IP
   ```

5. **Set maxmemory-policy**
   ```
   allkeys-lru (recommended for caching)
   ```

---

## 📊 Monitoring Redis in Production

### Upstash Dashboard:
- Requests/second
- Hit rate
- Memory usage
- Response time

### Redis Cloud:
- Operations/sec
- CPU usage
- Memory
- Network I/O

### Railway/Render:
- Memory usage
- Connection count
- Network

---

## 🆘 Troubleshooting

### Issue: "Redis connection failed"
**Solution:**
```bash
# Check Redis URL format
REDIS_URL=redis://default:password@host:port

# Test connection
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

### Issue: "ECONNREFUSED"
**Solution:**
- Check if Redis service is running
- Verify firewall/security groups
- Confirm correct port (usually 6379)

### Issue: "Slow performance"
**Solution:**
- Check Redis is in same region as backend
- Monitor cache hit rate
- Verify TTL settings are appropriate

---

## ✅ Summary

**Current State:**
- ✅ Code is production-ready with Redis support
- ⚠️ Currently using in-memory fallback
- ✅ No errors or issues

**To Enable Redis:**
1. Choose provider (I recommend **Render Redis** or **Upstash**)
2. Create Redis instance
3. Add `REDIS_URL` environment variable
4. Redeploy

**Benefits After Setup:**
- ⚡ 90%+ faster API responses
- 💾 Persistent caching
- 💰 Lower MongoDB costs
- 🚀 Better user experience

---

## 🚀 Quick Start (Fastest Path)

**If using Render (recommended):**
```bash
# 1. Update render.yaml (add Redis service above)
# 2. Commit and push
git add render.yaml
git commit -m "Add Redis to production"
git push

# 3. Wait for Render to deploy (~5 minutes)
# 4. Done! Redis automatically connected
```

**If using Upstash (free to start):**
```bash
# 1. Sign up: https://console.upstash.com/
# 2. Create database
# 3. Copy Redis URL
# 4. Add to Render environment variables
# 5. Manual deploy from Render dashboard
# 6. Done!
```

---

Need help setting this up? Let me know which option you prefer! 🚀

