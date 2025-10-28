# SSLWireless SMS Integration - Exact Credentials Needed

Based on the official SSLWireless API v3.0.0 documentation, you need **2 credentials** from SSLWireless:

## 🔑 **IMPORTANT CLARIFICATION: API Key = API Token**

SSL Wireless uses the terms "API Key" and "API Token" interchangeably - **they are the same thing**. If SSL Wireless gives you an "API Key", use it as your `SSL_WIRELESS_API_TOKEN` environment variable. Your current implementation is already correctly configured for this.

## ✅ Required Credentials

### 1. **API Token** (Required) - Also called "API Key"
- **What it is:** Authentication token provided by SSL (same as API Key)
- **Important:** SSL Wireless uses "API Token" and "API Key" interchangeably - they are the same thing
- **Length:** Max 50 characters
- **Type:** Alphanumeric
- **Where to get:** SSLWireless dashboard or provided when you register
- **Environment variable:** `SSL_WIRELESS_API_TOKEN`
- **Example:** `1279-98d2bb25-3f7e-49bf-a1e2-5d1a6c6c588f`

### 2. **SID (Sender ID/Masking)** (Required)
- **What it is:** Your approved masking/brand name
- **Length:** Max 20 characters
- **Type:** Alphanumeric
- **Where to get:** SSLWireless dashboard → Masking/Sender ID section
- **Your masking:** `Scarlet` (based on your purchase)
- **Environment variable:** `SSL_WIRELESS_SID`
- **Example:** `Scarlet` or `ENGINEERING`

## 📋 API Request Format

According to SSLWireless API v3.0.0 specification:

```json
{
  "api_token": "your-api-token-here",
  "sid": "Scarlet",
  "msisdn": "8801712345678",
  "sms": "Your message here",
  "csms_id": "unique-reference-id-123"
}
```

## 🔗 API Endpoint

- **URL:** `https://smsplus.sslwireless.com/api/v3/send-sms`
- **Method:** POST
- **Content Type:** JSON
- **Response Type:** JSON

## 📱 Phone Number Format

- **Format:** `8801XXXXXXXXX` (13 digits)
- **Must start with:** `8801` (Bangladesh country code)
- **Rest:** Mobile operator number (3-9) + 8 more digits
- **Examples:**
  - ✅ `8801712345678`
  - ✅ `8801912345678`
  - ❌ `01712345678` (will be converted)
  - ❌ `+8801712345678` (+ will be removed)

## ⚙️ Configuration

Add these to your `backend/.env` file:

```bash
# SSLWireless SMS Configuration
# Get these from your SSLWireless dashboard

# 1. API Token (provided by SSL for authentication)
SSL_WIRELESS_API_TOKEN=your_api_token_here

# 2. SID/Masking Name (your approved branding)
SSL_WIRELESS_SID=SCARLET
```

## ✅ How to Get These Credentials

### Option 1: From SSLWireless Dashboard
1. Login at: https://dashboard.sslwireless.com/
2. Look for **"API"** or **"API Settings"** section
3. Find your **API Token** (50 character alphanumeric string)
4. Find your **SID** or **Masking Name** (usually your brand name like "SCARLET")

### Option 2: From Welcome Email
When you purchased the masking service, SSLWireless should have sent you:
- Welcome email with credentials
- API documentation
- Your masking approval notice

### Option 3: Contact SSLWireless Support
If you can't find the credentials:

**Email:** service.operation@sslwireless.com  
**Phone:** +880 9612222020  
**Ask for:**
- "I need my API Token for SMS masking service"
- "I need my SID/Masking name for my brand 'SCARLET'"

## 🧪 Testing the Integration

Once you have both credentials:

1. **Add to `.env` file:**
```bash
SSL_WIRELESS_API_TOKEN=paste_your_token_here
SSL_WIRELESS_SID=SCARLET
```

2. **Restart backend server**

3. **Try sending an OTP or SMS**

4. **Check logs** to see if SMS was sent successfully

## 📝 Sample API Request

When you send an SMS, the backend will make this request:

```bash
POST https://smsplus.sslwireless.com/api/v3/send-sms
Content-Type: application/json

{
  "api_token": "your-token-from-env",
  "sid": "Scarlet",
  "msisdn": "8801712345678",
  "sms": "Your Scarlet verification code is: 1234. Valid for 10 minutes.",
  "csms_id": "SCARLET_1234567890_abc123"
}
```

## 📋 Response Format

SSLWireless API will return:

```json
{
  "status": "SUCCESS",
  "status_code": 1000,
  "error_message": "",
  "smsinfo": [
    {
      "sms_status": "SUCCESS",
      "status_message": "Success",
      "msisdn": "8801712345678",
      "sms_type": "EN",
      "sms_body": "Your message",
      "csms_id": "your-reference-id",
      "reference_id": "5da2f0b5ba3a2248110"
    }
  ]
}
```

## ⚠️ Important Notes

1. **API Token** is mandatory - cannot send SMS without it
   - **Clarification:** SSL Wireless calls this "API Token" but it's the same as "API Key"
   - If SSL Wireless gives you an "API Key", use it as your `SSL_WIRELESS_API_TOKEN`
2. **SID** must be pre-approved by SSLWireless
3. **csms_id** must be unique (you don't need to provide it - our code generates it)
4. Phone numbers are auto-normalized to 8801XXXXXXXXX format
5. Max SMS length: 1000 characters for English

## 📞 Support

If you need help finding your credentials:
- Check your purchase/registration email from SSLWireless
- Contact SSLWireless support: service.operation@sslwireless.com
- Check SSLWireless dashboard: https://dashboard.sslwireless.com/

---

**Summary:** You only need **2 things**:
1. `SSL_WIRELESS_API_TOKEN` - Your authentication token (also called "API Key" by SSL)
2. `SSL_WIRELESS_SID` - Your masking name (SCARLET)

**Key Point:** If SSL Wireless gives you an "API Key", use it as your `SSL_WIRELESS_API_TOKEN` - they are the same thing!

Both should be in your SSLWireless dashboard or welcome email!

