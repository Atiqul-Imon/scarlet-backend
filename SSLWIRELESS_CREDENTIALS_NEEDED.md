# SSLWireless SMS Credentials - What You Need

## Required Credentials

To send OTP and SMS notifications, you need these **4 credentials** from SSLWireless:

### 1. **API Token / API Hash**
- **What it is:** Your authentication token to access the API
- **Location:** SSLWireless Dashboard → API Settings
- **Format:** Alphanumeric string (usually 30-50 characters)
- **Example:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- **Environment variable:** `SSL_WIRELESS_API_TOKEN`

### 2. **SID (Sender ID / Masking Name)**
- **What it is:** Your approved masking name that appears as sender
- **Location:** SSLWireless Dashboard → Masking / Sender ID
- **Your masking name:** SCARLET (based on what you purchased)
- **Format:** Brand name (e.g., SCARLET, MyBrand)
- **Environment variable:** `SSL_WIRELESS_SID`
- **Example:** `SCARLET`

### 3. **API User / API User ID**
- **What it is:** Your API username
- **Location:** SSLWireless Dashboard → API Settings
- **Format:** Usually your account username or specific API user ID
- **Environment variable:** `SSL_WIRELESS_API_USER`
- **Example:** `your_username`

### 4. **API Password**
- **What it is:** Password for API access
- **Location:** SSLWireless Dashboard → API Settings
- **Format:** Password you set or were given
- **Environment variable:** `SSL_WIRELESS_API_PASSWORD`
- **Example:** `your_password`

## Where to Find These

### Option 1: In Your Email
When you purchased the masking service, SSLWireless likely sent you an email with:
- Welcome message
- API credentials
- Documentation

**Check your email inbox** for messages from SSLWireless or sslwireless.com

### Option 2: In SSLWireless Dashboard
Login at: https://dashboard.sslwireless.com/

Then look in these sections:
1. **"API"** or **"API Settings"** → Find Token and User/Password
2. **"Masking"** or **"Sender ID"** → Find your SID (SCARLET)
3. **"Services"** → Look for SMS API settings

### Option 3: Contact Support
If you can't find the credentials:

**Email:** support@sslwireless.com  
**Phone:** +880 184 000 0066  
**Website:** https://sslwireless.com/contact/

**Ask them:**
1. "I need my API credentials for SMS masking service"
2. "Can you provide my API Token, API User, Password, and SID?"
3. "I purchased masking service and need my credentials"

## Configuration

Once you have all 4 credentials, add them to your `.env` file:

```bash
# SSLWireless SMS Configuration
SSL_WIRELESS_API_TOKEN=your_api_token_here
SSL_WIRELESS_SID=SCARLET
SSL_WIRELESS_API_USER=your_api_user
SSL_WIRELESS_API_PASSWORD=your_api_password
SSL_WIRELESS_MASKING=SCARLET
```

## How It Works

When you send an OTP, SSLWireless API uses:
1. **API Token** + **API User** + **API Password** → Authenticate your account
2. **SID** → Your approved masking name (SCARLET)
3. **Phone Number** → 8801XXXXXXXXX format (13 digits)

## Test the Integration

After adding credentials:
1. Restart your backend server
2. Try sending an OTP
3. Check console logs for success/failure
4. Monitor SSLWireless dashboard for delivery

## Need Help?

If you're still stuck:
1. Check the guide: `backend/SSLWIRELESS_DASHBOARD_GUIDE.md`
2. Contact SSLWireless support
3. Check your purchase confirmation email
4. Look for any documentation you received when purchasing masking

---

**Quick Checklist:**
- [ ] API Token: _______________
- [ ] SID (Masking): SCARLET
- [ ] API User: _______________
- [ ] API Password: _______________
- [ ] Added to `.env` file
- [ ] Restarted backend server
- [ ] Tested OTP sending

