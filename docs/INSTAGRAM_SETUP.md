# Instagram Embed Setup Guide

This guide explains how to set up Instagram embeds in Spookstr using the Instagram Graph API.

## 📋 Overview

Instagram posts and reels are embedded in Spookstr using Instagram's official oEmbed API. This requires authentication via a Facebook/Instagram App.

## 🔑 Current Credentials

**Your Instagram App:**
- **App ID:** `1151704059951596`
- **App Secret:** `5bfbf4ac01d5ff1476e976debbb0fe6a`
- **Dashboard:** https://developers.facebook.com/apps/1151704059951596/

## ✅ Setup Checklist

### 1. **Verify Your App Configuration**

Visit your [Instagram App Dashboard](https://developers.facebook.com/apps/1151704059951596/) and ensure:

- [ ] **App is in Development Mode** (or Live Mode if published)
- [ ] **Instagram Graph API** product is added
- [ ] **App Domain** is configured:
  - Add `spookstr.diy` (or your production domain)
  - Add `localhost` for local development
- [ ] **Privacy Policy URL** is set (required by Facebook)
- [ ] **Terms of Service URL** is set (optional but recommended)

### 2. **Environment Variables**

The credentials are stored in `.env` (which is gitignored for security):

```env
VITE_INSTAGRAM_APP_ID=1151704059951596
VITE_INSTAGRAM_APP_SECRET=5bfbf4ac01d5ff1476e976debbb0fe6a
```

### 3. **How It Works**

1. When a user posts an Instagram URL, the media parser detects it
2. The `InstagramEmbed` component fetches oEmbed data from Instagram's API
3. An app access token is generated: `{APP_ID}|{APP_SECRET}`
4. The token is cached in localStorage for performance
5. Instagram's official embed HTML is injected into the page
6. Instagram's `embed.js` script processes the HTML and displays the content

## 🔧 Troubleshooting

### **Error: "Invalid application ID"**

This means Facebook doesn't recognize your app. Solutions:

1. **Verify the App ID is correct** in `.env`
2. **Check App Status** - Make sure it's not deleted or suspended
3. **Add Instagram Graph API Product:**
   - Go to your app dashboard
   - Click "Add Product"
   - Select "Instagram Graph API"
   - Click "Set Up"

### **Error: "Access token required"**

The app access token format `{APP_ID}|{APP_SECRET}` should work for public Instagram content. If it doesn't:

1. **Generate a User Access Token:**
   - Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   - Select your app
   - Click "Get Token" > "Get User Access Token"
   - Select permissions: `instagram_basic`, `pages_read_engagement`
   - Copy the token

2. **Add it to `.env`:**
   ```env
   VITE_INSTAGRAM_ACCESS_TOKEN=your_user_access_token_here
   ```

3. **Update `instagramAuth.ts`** to prefer the user token:
   ```typescript
   const storedToken = import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
   if (storedToken) {
     return storedToken;
   }
   ```

### **Error: "X-Frame-Options deny"**

This is expected! Instagram blocks direct iframe embeds. That's why we use the oEmbed API instead, which returns properly formatted blockquote HTML that Instagram's script can process.

### **Embeds not showing**

1. **Check browser console** for errors
2. **Verify Instagram's embed.js is loading:**
   - Open DevTools > Network tab
   - Look for `embed.js` from `instagram.com`
3. **Try clearing localStorage:**
   ```javascript
   localStorage.removeItem('instagram_access_token');
   localStorage.removeItem('instagram_token_expiry');
   ```
4. **Refresh the page** to generate a new token

## 📱 Testing

To test Instagram embeds:

1. Post a note with an Instagram URL:
   ```
   Check this out! https://www.instagram.com/p/CUP7S7et0gm/
   ```

2. The embed should appear inline in the note

3. If it fails, it should show a fallback purple/pink card with a link to open on Instagram

## 🚀 Production Deployment

When deploying to production:

1. **Set environment variables** on your hosting platform:
   - Netlify: Site settings > Environment variables
   - Vercel: Project settings > Environment Variables
   - Add `VITE_INSTAGRAM_APP_ID` and `VITE_INSTAGRAM_APP_SECRET`

2. **Update App Domains** in Facebook dashboard:
   - Add your production domain (e.g., `spookstr.diy`)
   - Add any staging domains you use

3. **Switch to Live Mode** (optional):
   - In Facebook App dashboard > Settings > Basic
   - Switch from "Development" to "Live"
   - This allows public access without needing to add testers

## 🔒 Security Notes

- ✅ **App Secret is in `.env`** - Never commit this to git!
- ✅ **`.env` is in `.gitignore`** - Your credentials are safe
- ✅ **App access tokens are client-side** - This is okay for public Instagram content
- ⚠️ **For private content**, you'd need user access tokens with proper OAuth flow

## 📚 Resources

- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api/)
- [Instagram oEmbed Endpoint](https://developers.facebook.com/docs/instagram/oembed/)
- [Facebook App Dashboard](https://developers.facebook.com/apps/)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)

## 🆘 Need Help?

If you encounter issues:

1. Check the browser console for detailed error messages
2. Verify your app configuration in Facebook dashboard
3. Try generating a fresh access token
4. Reach out to the Spookstr development team

---

**Built with 👻 for the paranormal community**
