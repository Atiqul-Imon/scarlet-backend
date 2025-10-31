# Phone Number Migration Guide

## 🎯 Purpose

This migration script normalizes all existing user phone numbers in the database to the standard format: `+8801XXXXXXXXX`

## 📋 Why This is Needed

- **Database Standard**: Phones are stored as `+8801XXXXXXXXX` (from `normalizeIdentifier` during registration)
- **Existing Data**: Old accounts might have phones in different formats:
  - `01XXXXXXXXX`
  - `8801XXXXXXXXX`
  - `+8801XXXXXXXXX`
  - Mixed formats with spaces/dashes

## 🚀 How to Run Migration

### Option 1: Local Development

```bash
cd backend
npx tsx scripts/migrate-user-phones.ts
```

### Option 2: On DigitalOcean Server

```bash
# SSH into server
ssh root@139.59.114.43

# Navigate to backend directory
cd /path/to/backend

# Run migration
npx tsx scripts/migrate-user-phones.ts
```

## 📊 What the Script Does

1. ✅ Connects to MongoDB Atlas
2. ✅ Finds all users with phone numbers
3. ✅ Normalizes each phone to `+8801XXXXXXXXX` format
4. ✅ Updates database
5. ✅ Shows summary report

## 🔍 Example Output

```
✅ Connected to MongoDB

📊 Found 150 users with phone numbers

✅ User 507f1f77bcf86cd799439011 (John): 01714918360 → +8801714918360
✅ User 507f1f77bcf86cd799439012 (Jane): 8801714918361 → +8801714918361
✓ User 507f1f77bcf86cd799439013 (Bob): Already normalized - +8801714918362

============================================================
📊 Migration Summary:
============================================================
Total users with phones: 150
✅ Updated: 145
✓ Unchanged (already normalized): 5
❌ Failed: 0
============================================================

✅ Migration completed!
```

## ⚠️ Important Notes

1. **Backup First**: This script modifies data. Consider backing up your database first.
2. **Idempotent**: Safe to run multiple times (won't change already normalized phones)
3. **Non-Destructive**: Only updates phone field, doesn't delete users
4. **Testing**: Test on a development database first if possible

## 🔧 What Gets Normalized

| Input Format | Output Format |
|-------------|---------------|
| `01714918360` | `+8801714918360` |
| `8801714918360` | `+8801714918360` |
| `+8801714918360` | `+8801714918360` (unchanged) |
| `+88 017 149 18360` | `+8801714918360` |
| `8801-7149-1836-0` | `+8801714918360` |

## ✅ After Migration

After running the migration:
- All phone numbers in database will be in `+8801XXXXXXXXX` format
- Password reset OTP will work correctly
- Phone lookups will be consistent

