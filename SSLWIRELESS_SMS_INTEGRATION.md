# SSLWireless SMS Integration Guide

This document explains how to integrate SSLWireless SMS service for sending OTP and order notifications.

## Overview

SSLWireless provides SMS masking service for Bangladesh. This integration allows sending:
- OTP verification codes
- Order confirmation SMS
- Order status updates
- Custom notifications

## Setup Instructions

### 1. Get Your Credentials

1. **Sign up/Login** at https://dashboard.sslwireless.com/
2. Navigate to **SMS settings**
3. Get your **API Token** from the dashboard
4. **Apply for masking** (sender ID) - this usually takes 1-2 business days

### 2. Configure Environment Variables

Add these variables to your `.env` file:

```bash
# SSLWireless SMS Configuration
SSL_WIRELESS_API_TOKEN=your_api_token_here
SSL_WIRELESS_SID=your_sender_id_here
SSL_WIRELESS_MASKING=SCARLET
```

**Important:** 
- `SID` is your masking name (e.g., SCARLET, MyBrand)
- Phone numbers must be in format: `8801XXXXXXXXX` (13 digits)
- The masking name must be approved by SSLWireless

### 3. Phone Number Format

All phone numbers will be automatically normalized to `8801XXXXXXXXX` format:

- Input: `01712345678` → Normalized: `8801712345678`
- Input: `8801712345678` → Normalized: `8801712345678`
- Input: `+8801712345678` → Normalized: `8801712345678`

## Usage

### Send OTP SMS

```typescript
import { smsService } from '@/core/services/smsService';

// Send OTP
await smsService.sendOTP('8801712345678', '1234');
```

### Send Order Confirmation

```typescript
await smsService.sendOrderConfirmation(
  '8801712345678',
  'SCR-12345',
  2500.00
);
```

### Send Order Status Update

```typescript
await smsService.sendOrderStatusUpdate(
  '8801712345678',
  'SCR-12345',
  'Shipped'
);
```

### Send Custom SMS

```typescript
await smsService.sendCustomNotification(
  '8801712345678',
  'Your custom message here'
);
```

### Check if Service is Configured

```typescript
if (smsService.isConfigured()) {
  // Send SMS
} else {
  // Fallback to console logging
}
```

## API Reference

### SSLWirelessSMSService Methods

#### `sendSMS(phone, message, options?)`
- **phone**: Recipient phone number (8801XXXXXXXXX format)
- **message**: SMS content (max 160 characters per message)
- **options**: Optional configuration
  - `masking`: Custom masking name
  - `csmsId`: Client transaction ID

#### `sendOTP(phone, otp)`
- Sends OTP verification code with SCARLET masking
- Message: "Your Scarlet verification code is: {otp}. Valid for 10 minutes..."

#### `sendOrderConfirmation(phone, orderNumber, total)`
- Sends order confirmation with order number and total

#### `sendOrderStatusUpdate(phone, orderNumber, status)`
- Sends order status updates to customers

#### `sendCustomNotification(phone, message, options?)`
- Sends custom SMS notifications

## Integration in Existing Code

The service is already integrated in:

1. **OTP Module** (`backend/src/modules/otp/presenter.ts`)
   - Automatically uses SSLWireless when configured
   - Falls back to console logging when not configured

2. **Order Module** (`backend/src/modules/orders/presenter.ts`)
   - Sends order confirmation SMS after successful order

## Testing

### Test in Development

1. Add credentials to `.env` file
2. Restart your backend server
3. Request an OTP or place an order
4. Check console logs to see SMS details

### Test Credentials

If you want to test without real SMS:

```bash
# Don't set these variables or set them to empty
# The system will fall back to console logging
```

## Pricing

Check SSLWireless pricing at: https://sslwireless.com/sms-service/pricing/

Typical costs:
- **Per SMS**: ৳0.25 - ৳0.50 depending on volume
- **Masking Fee**: One-time approval fee (contact SSLWireless)
- **Volume Discounts**: Available for high-volume senders

## Monitoring

1. **Check Delivery Status**: https://dashboard.sslwireless.com/
2. **View SMS Logs**: Backend console output
3. **Monitor Costs**: SSLWireless dashboard billing section

## Error Handling

The service includes automatic error handling:

```typescript
try {
  await smsService.sendOTP(phone, otp);
} catch (error) {
  // Error is logged automatically
  // System continues to work even if SMS fails
  // OTP is still stored and can be verified
}
```

## Fallback Behavior

If SSLWireless is not configured:
- SMS details are logged to console
- Application continues to function normally
- Useful for development and testing

## Production Deployment

1. **Add credentials** to your hosting environment variables
2. **Test** with a few real SMS
3. **Monitor** delivery rates in dashboard
4. **Set up alerts** for SMS failures
5. **Monitor costs** and set budget alerts

## Security Best Practices

- ✅ Never commit credentials to version control
- ✅ Use environment variables for all secrets
- ✅ Rotate API tokens periodically
- ✅ Monitor SMS usage for suspicious activity
- ✅ Set up rate limiting for OTP requests

## Support

- **SSLWireless Support**: support@sslwireless.com
- **Documentation**: https://docs.sslwireless.com/
- **Dashboard**: https://dashboard.sslwireless.com/

## Troubleshooting

### SMS Not Sending

1. Check credentials are set correctly
2. Verify masking is approved in dashboard
3. Check phone number format (8801XXXXXXXXX)
4. Review console logs for error messages

### Invalid Phone Number

Phone numbers must match Bangladesh mobile format:
- ✅ 8801712345678
- ✅ 8801912345678
- ❌ +8801712345678 (remove +)
- ❌ 01712345678 (needs 880 prefix)

### API Errors

Common SSLWireless API errors:
- **403**: Invalid API token
- **400**: Invalid phone number format
- **402**: Insufficient balance
- **429**: Rate limit exceeded

Check SSLWireless dashboard for detailed error messages.

## Next Steps

1. ✅ Add SSLWireless credentials to environment
2. ✅ Test OTP sending
3. ✅ Test order confirmation SMS
4. ✅ Monitor in production
5. ✅ Set up error alerts

---

**Last Updated:** 2024-01-15
**Integration Version:** 1.0.0
