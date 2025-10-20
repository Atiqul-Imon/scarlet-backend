# Homepage Section Limit Update

## 📊 Change Summary

Updated the maximum number of products displayed per homepage section.

### Before:
- **Limit:** 20 products per section
- **Current products:** 15 per section

### After:
- **Limit:** 30 products per section
- **Current products:** 15 per section
- **Room to grow:** Can add 15 more products per section

## 📝 Files Changed

### `backend/src/modules/catalog/repository.ts`
**Line 108:** Changed `.limit(20)` → `.limit(30)`

```typescript
export async function getProductsByHomepageSection(homepageSection: string): Promise<Product[]> {
  // ... cache check ...
  
  const products = await db.collection<Product>('products')
    .find({ 
      homepageSection: homepageSection as any,
      isActive: { $ne: false } 
    })
    .limit(30)  // ✅ Updated from 20 to 30
    .toArray();
  
  // ... cache and return ...
}
```

## 🎯 Impact

### Current State:
- **New Arrivals:** 15 products (can add 15 more)
- **Skincare Essentials:** 15 products (can add 15 more)
- **Makeup Collection:** 15 products (can add 15 more)

### API Response:
```bash
# Each endpoint will now return up to 30 products
GET /api/catalog/products/homepage/new-arrivals       # Max 30
GET /api/catalog/products/homepage/skincare-essentials # Max 30
GET /api/catalog/products/homepage/makeup-collection   # Max 30
```

## 🚀 Deployment

### Steps:
1. ✅ Code updated
2. ✅ TypeScript compiled
3. ⏳ Needs deployment to production

### After Deployment:
```bash
# Test the endpoints
curl https://api.scarletunlimited.net/api/catalog/products/homepage/new-arrivals | jq '. | length'
# Should return: 15 (current) or up to 30 (if more products added)
```

## 📈 Future Growth

You can now add up to **15 more products** to each section without code changes:
- New Arrivals: 15 → 30 max
- Skincare Essentials: 15 → 30 max
- Makeup Collection: 15 → 30 max

Total capacity: **90 products** across all homepage sections

## 🔄 Cache Behavior

- **Cache invalidation:** Works automatically when products are added/updated
- **Cache TTL:** 5 minutes for product lists
- **New products:** Will appear after cache expires or is invalidated

## ✅ Status

- **Updated:** October 20, 2025
- **Build:** ✅ Successful
- **Linter:** ✅ No errors
- **Ready for:** Production deployment

