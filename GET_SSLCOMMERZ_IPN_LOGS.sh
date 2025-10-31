#!/bin/bash

# Script to check SSLCommerz IPN logs from PM2
# Run this on your DigitalOcean server

echo "🔍 Checking PM2 logs for SSLCommerz IPN activity..."
echo "=================================================="
echo ""

echo "1️⃣ Checking for IPN reception logs:"
echo "-----------------------------------"
pm2 logs backend --lines 300 --nostream | grep -i -E "SSLCommerz IPN|IPN Received|IPN Handler|===.*IPN" -A 5 -B 2 | tail -50

echo ""
echo "2️⃣ Checking for IPN processing results:"
echo "----------------------------------------"
pm2 logs backend --lines 300 --nostream | grep -i -E "IPN processed|IPN.*success|IPN.*fail|IPN.*error" -A 3 -B 2 | tail -50

echo ""
echo "3️⃣ Checking for payment status updates:"
echo "---------------------------------------"
pm2 logs backend --lines 300 --nostream | grep -i -E "Payment.*status|order.*confirmed|payment.*completed|payment.*failed" -A 2 -B 1 | tail -50

echo ""
echo "4️⃣ Checking for SSLCommerz transaction queries:"
echo "------------------------------------------------"
pm2 logs backend --lines 300 --nostream | grep -i -E "queryTransaction|verifying payment|API verification" -A 3 -B 1 | tail -50

echo ""
echo "5️⃣ Checking for any SSLCommerz errors:"
echo "--------------------------------------"
pm2 logs backend --lines 300 --nostream | grep -i -E "sslcommerz.*error|sslcommerz.*fail|❌.*sslcommerz|❌.*IPN" -A 3 -B 2 | tail -50

echo ""
echo "=================================================="
echo "✅ Done. Look for:"
echo "   - '=== SSLCommerz IPN Received ===' - IPN was received"
echo "   - '✅ IPN processed successfully' - IPN was processed"
echo "   - '❌ IPN processing failed' - IPN had errors"
echo "   - Payment status updates after IPN"
echo ""
echo "📋 If you see no IPN logs, SSLCommerz may not be sending IPN notifications."
echo "   Check IPN URL configuration in SSLCommerz merchant panel."

