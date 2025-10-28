# SSLWireless Dashboard Guide - Finding Your API Credentials

If you can't find your API credentials in the SSLWireless dashboard, here's a step-by-step guide to locate them.

## Where to Find API Credentials

### Option 1: SMS API Section
1. Login to: https://dashboard.sslwireless.com/
2. Look for **"SMS"** or **"SMS API"** in the main menu
3. Click on **"Settings"** or **"API Settings"**
4. Look for:
   - **API Token** or **API Key**
   - **SID** (Sender ID) or **Masking Name**

### Option 2: Developer/API Settings
1. Look for **"Developer"**, **"API"**, or **"Integration"** in the sidebar
2. Navigate to **"API Credentials"** or **"API Settings"**
3. You should see:
   - **API Token**
   - **SID** (Sender ID)

### Option 3: SMS Services Menu
1. Click on **"SMS Services"** or **"Services"**
2. Go to **"Masking"** or **"Sender ID"**
3. Look for your approved masking name (e.g., SCARLET)
4. API credentials are usually shown there

### Option 4: Contact Support
If you still can't find the credentials, the dashboard structure may have changed:

1. **Contact Support:**
   - Email: support@sslwireless.com
   - Phone: +880 184 000 0066
   
2. **Request Information:**
   - Ask for your API Token for SMS masking service
   - Request your SID (Sender ID) approval status
   - Verify your masking name "SCARLET" is approved

## What You Need
From the dashboard, you need these three things:

1. **API Token** - Your authentication token
   - Format: Usually a long alphanumeric string
   - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

2. **SID (Sender ID)** - Your masking name
   - This is usually your brand name (e.g., SCARLET)
   - Must be approved by SSLWireless

3. **Balance** - Sufficient credit to send SMS
   - Check your account balance in the dashboard
   - Refill if needed

## Alternative: Generate New API Token

If you can't find your existing API token:

1. **Look for "Generate Token" or "Create API Key"**
   - In API Settings section
   - Create a new token if you don't have one

2. **API Token Formats (Common):**
   ```
   a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
   123456789012345678901234567890
   ```
   - Usually 30-50 characters long
   - Alphanumeric with possible dashes

## Need Help?

If you're still stuck, here's what to do:

### Contact SSLWireless Support
- **Email:** support@sslwireless.com
- **Phone:** +880 184 000 0066
- **Website:** https://sslwireless.com/contact/

### What to Ask Them
When you contact support, ask:
1. "Where can I find my API Token for SMS masking service?"
2. "I need my SID (Sender ID) for masking SMS"
3. "Can you verify my masking name 'SCARLET' is approved?"
4. "Can you generate a new API token for me?"

## Alternative: Look for Sample/Test Credentials

Sometimes the dashboard shows:
- **Test API Token** - For testing integration
- **Production API Token** - For live environment

## Dashboard Screenshots Location

If you see any of these sections, the credentials are likely there:
- 🔑 **API Credentials**
- 📱 **SMS Settings**
- 🎭 **Masking** or **Sender ID**
- ⚙️ **Settings** → **API**
- 🔐 **Developer Tools**
- 📊 **Integration**

## Quick Test

Once you have the credentials, add them to your `.env` file:

```bash
# In backend/.env file
SSL_WIRELESS_API_TOKEN=paste_your_token_here
SSL_WIRELESS_SID=SCARLET
SSL_WIRELESS_MASKING=SCARLET
```

Then restart your backend server and test sending an SMS.

## Still Can't Find It?

If you absolutely cannot find the API credentials in the dashboard, here are your options:

1. **Contact Support** - They can generate new credentials for you
2. **Check Your Purchase Email** - Credentials may have been emailed
3. **Contact Your Reseller** - If you bought through a reseller
4. **Use Contact Form** - Submit request through SSLWireless website

---

**Note:** Dashboard interfaces change over time. The exact location may vary, but the credentials are definitely there - they just might be in a slightly different location than described.

**Last Updated:** 2024-01-15
