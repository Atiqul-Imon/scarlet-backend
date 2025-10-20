#!/bin/bash

# This script removes all hardcoded MongoDB URI fallbacks from scripts
# Only MONGO_URI from .env should be used

echo "🔧 Fixing all MongoDB URI references in scripts..."
echo ""

# Pattern 1: Replace MONGODB_URI || fallback with just MONGO_URI and error check
# Pattern 2: Replace multiple fallbacks with just MONGO_URI and error check
# Pattern 3: Remove hardcoded URIs

files_to_fix=(
  "add-9-products.js"
  "add-products-final.cjs"
  "add-3-more-per-section.cjs"
  "create-custom-admin.js"
  "populate-brands.js"
  "check-blog-posts.js"
  "update-user-role.js"
  "create-test-order.js"
  "create-admin.js"
  "debug-login.js"
  "verify-admin.js"
  "test-payment-system.js"
  "direct-login-test.js"
  "simple-login-test.js"
  "recreate-admin.js"
  "populate-inventory.js"
  "check-database.js"
)

for file in "${files_to_fix[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Fixing: $file"
    
    # Backup first
    cp "$file" "$file.backup"
    
    # Replace patterns
    sed -i 's/process\.env\.MONGO_URI || process\.env\.MONGODB_URI || .*/process.env.MONGO_URI;/g' "$file"
    sed -i 's/process\.env\.MONGODB_URI || process\.env\.MONGO_URI || .*/process.env.MONGO_URI;/g' "$file"
    sed -i 's/process\.env\.MONGODB_URI || .*/process.env.MONGO_URI;/g' "$file"
    sed -i "s/process\.env\.MONGO_URI || 'mongodb.*/process.env.MONGO_URI;/g" "$file"
    
    echo "   ✅ Fixed"
  fi
done

echo ""
echo "🎉 All scripts fixed!"
echo "⚠️  Backups created with .backup extension"
echo ""
echo "📝 Remember to add error checking in scripts:"
echo "   if (!mongoUri) {"
echo "     console.error('❌ MONGO_URI not found in .env');"
echo "     process.exit(1);"
echo "   }"

