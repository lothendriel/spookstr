/**
 * Instagram/Facebook Authentication Utilities
 *
 * Handles generating and managing access tokens for Instagram oEmbed API.
 */

// Try to get credentials from environment first, fallback to hardcoded values
const APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID || '1343445420487893';
const APP_SECRET = import.meta.env.VITE_INSTAGRAM_APP_SECRET || 'xyrlaSq0mho4UMTdNVIVpBaAfQQ';

// Debug: Log if credentials are loaded
console.log('🔑 Instagram credentials loaded:', {
  hasAppId: !!APP_ID,
  hasAppSecret: !!APP_SECRET,
  appId: APP_ID ? `${APP_ID.substring(0, 4)}...` : 'missing',
  source: import.meta.env.VITE_INSTAGRAM_APP_ID ? 'environment' : 'fallback'
});

/**
 * Generate an app access token for Instagram Graph API
 * This token can be used to access public Instagram content via oEmbed
 */
export async function getInstagramAccessToken(): Promise<string> {
  // Check if we have a stored token in localStorage
  const storedToken = localStorage.getItem('instagram_access_token');
  const tokenExpiry = localStorage.getItem('instagram_token_expiry');

  // If we have a valid stored token, use it
  if (storedToken && tokenExpiry) {
    const expiryTime = parseInt(tokenExpiry);
    if (Date.now() < expiryTime) {
      console.log('✅ Using cached Instagram access token');
      return storedToken;
    }
  }

  // Generate a new app access token
  try {
    console.log('🔑 Generating new Instagram access token...');

    // App access tokens don't expire and can be generated directly
    const appAccessToken = `${APP_ID}|${APP_SECRET}`;

    // Store the token (app access tokens don't expire, but we'll set a far future date)
    localStorage.setItem('instagram_access_token', appAccessToken);
    localStorage.setItem('instagram_token_expiry', String(Date.now() + 365 * 24 * 60 * 60 * 1000)); // 1 year

    console.log('✅ Instagram access token generated successfully');
    return appAccessToken;
  } catch (error) {
    console.error('❌ Failed to generate Instagram access token:', error);
    throw error;
  }
}

/**
 * Fetch Instagram oEmbed data for a given URL
 */
export async function fetchInstagramOEmbed(url: string): Promise<{ html: string } | null> {
  try {
    const accessToken = await getInstagramAccessToken();

    // Use Instagram's official oEmbed endpoint
    const oembedUrl = `https://graph.facebook.com/v16.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${accessToken}&omitscript=true`;

    console.log('📷 Fetching Instagram oEmbed data...');

    const response = await fetch(oembedUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Instagram oEmbed API error:', response.status, errorText);

      // If the token is invalid, clear it and try once more
      if (response.status === 401 || response.status === 400) {
        localStorage.removeItem('instagram_access_token');
        localStorage.removeItem('instagram_token_expiry');

        // Try one more time with a fresh token
        const newToken = await getInstagramAccessToken();
        const retryUrl = `https://graph.facebook.com/v16.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${newToken}&omitscript=true`;
        const retryResponse = await fetch(retryUrl);

        if (retryResponse.ok) {
          const data = await retryResponse.json();
          console.log('✅ Instagram oEmbed data fetched (after retry)');
          return data;
        }
      }

      return null;
    }

    const data = await response.json();
    console.log('✅ Instagram oEmbed data fetched successfully');
    return data;
  } catch (error) {
    console.error('❌ Error fetching Instagram oEmbed:', error);
    return null;
  }
}
