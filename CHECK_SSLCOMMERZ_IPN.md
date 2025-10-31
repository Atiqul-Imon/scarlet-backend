# SSLCommerz IPN Diagnostic Guide

## Quick Check Commands

### 1. Check Recent IPN Logs on Server
```bash
pm2 logs backend --lines 200 | grep -i "IPN"
```

### 2. Check for IPN Reception Errors
```bash
pm2 logs backend --lines 200 | grep -i "SSLCommerz IPN\|IPN.*error\|IPN.*fail"
```

### 3. Run Diagnostic Script (Local)
```bash
cd backend
npx ts-node scripts/check-sslcommerz-ipn.ts
```

### 4. Check IPN Endpoint Configuration
```bash
# Check environment variable
echo $SSLCOMMERZ_IPN_URL

# Expected: https://api.scarletunlimited.net/api/payments/webhook/sslcommerz
```

## IPN Endpoint Details

- **URL**: `https://api.scarletunlimited.net/api/payments/webhook/sslcommerz`
- **Method**: POST
- **Content-Type**: application/x-www-form-urlencoded or application/json
- **Access**: Public (no authentication required)

## How to Verify IPN is Working

### Method 1: Check Recent Orders
1. Look for SSLCommerz orders in admin panel
2. Orders should have payment status "completed" if IPN worked
3. If orders show as "pending", IPN likely didn't reach the server

### Method 2: Check Server Logs
```bash
# On DigitalOcean server
pm2 logs backend --lines 500 | grep "SSLCommerz IPN"
```

Look for:
- `=== SSLCommerz IPN Received ===` - IPN was received
- `✅ IPN processed successfully` - IPN was processed
- `❌ IPN processing failed` - IPN had an error

### Method 3: Check Order Updates
Orders updated recently (within minutes of payment) suggest IPN is working.

### Method 4: Manual Verification
Use the manual verification endpoint:
```bash
curl -X POST https://api.scarletunlimited.net/api/payments/verify-manual \
  -H "Content-Type: application/json" \
  -d '{"orderNumber": "SC-123456"}'
```

## Common Issues

### Issue 1: IPN Not Received
**Symptoms**: Orders stay as "pending" even after successful payment

**Possible Causes**:
- IPN URL not configured in SSLCommerz merchant panel
- IPN endpoint not accessible from internet
- Firewall blocking SSLCommerz IPs
- Wrong IPN URL in environment variables

**Solution**:
1. Verify IPN URL in SSLCommerz merchant panel:
   - Login to https://merchant.sslcommerz.com/
   - Go to My Store > IPN Settings
   - Set IPN URL: `https://api.scarletunlimited.net/api/payments/webhook/sslcommerz`
2. Test IPN endpoint accessibility
3. Check Nginx/server configuration allows POST to IPN endpoint

### Issue 2: IPN Received But Processing Fails
**Symptoms**: Logs show "IPN Received" but "IPN processing failed"

**Possible Causes**:
- Order not found by order number
- Database connection issues
- Invalid IPN data format

**Solution**:
1. Check logs for specific error messages
2. Verify order numbers match between SSLCommerz and database
3. Check database connectivity

### Issue 3: IPN Signature Verification Fails
**Symptoms**: Logs show "IPN signature verification failed"

**Possible Causes**:
- Store password mismatch
- IPN data tampering
- SSLCommerz API changes

**Solution**:
- System automatically falls back to API verification
- If API verification also fails, check SSLCommerz credentials

## Monitoring

### Daily Check
1. Check admin panel for pending SSLCommerz orders
2. Review server logs for IPN errors
3. Verify completed payments match actual transactions

### Weekly Check
1. Run diagnostic script
2. Review success rate (should be >90%)
3. Check for any patterns in failed IPNs

## Environment Variables Required

```bash
SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASSWORD=your_store_password
SSLCOMMERZ_IPN_URL=https://api.scarletunlimited.net/api/payments/webhook/sslcommerz
SSLCOMMERZ_SANDBOX=false
```

## SSLCommerz Merchant Panel Configuration

1. Login: https://merchant.sslcommerz.com/
2. Navigate: My Store > IPN Settings
3. Set IPN URL: `https://api.scarletunlimited.net/api/payments/webhook/sslcommerz`
4. Save settings
5. Test with a small transaction

