# Bunker Login Debugging Guide

## Changes Made

The bunker sign-in functionality has been significantly improved with enhanced validation, error handling, and debugging capabilities.

### 1. Enhanced URI Validation

The bunker URI validator now checks:
- Format starts with `bunker://`
- Contains a valid 64-character hex pubkey
- Includes at least one relay URL starting with `wss://`
- Proper URI structure with query parameters

### 2. Relay Connectivity Testing

Before attempting the bunker connection, the system now:
- Tests if the specified relay is reachable via WebSocket
- Provides immediate feedback if the relay is down or unreachable
- Prevents wasting time on timeouts with unreachable relays

### 3. Comprehensive Error Handling

Error messages are now more specific and actionable:
- **Timeout errors**: "Connection timeout. The bunker relay may be unreachable or not responding."
- **Relay connection errors**: "Failed to connect to the bunker relay. Please verify the relay URL is correct and accessible."
- **Authentication errors**: "Authentication failed. Please check your bunker secret is correct."
- **Invalid URI errors**: "Invalid bunker URI. Please check the pubkey and parameters."

### 4. Detailed Console Logging

When testing bunker login, check the browser console for:
```
🔐 Starting bunker login...
📋 Bunker URI format check: bunker://...
👤 Remote signer pubkey: 0155373ac79b7f...
🔗 Bunker relay: wss://relay.nsec.app
🔑 Has secret: true
🧪 Testing relay connectivity...
✅ Relay is reachable
🚀 Attempting to connect to bunker via NLogin.fromBunker...
```

## Testing Your Bunker URI

Your provided bunker URI:
```
bunker://0155373ac79b7ffb0f586c3e68396f9e82d46f7afe7016d46ed9ca46ba3e1bed?relay=wss://relay.nsec.app&secret=6b8349bda4b421626ca9a6ce36df76ce
```

This URI format is correct and should work IF:
1. The relay `wss://relay.nsec.app` is online and accessible
2. The remote signer (bunker) is listening on that relay
3. The secret is valid for this connection

## Common Issues and Solutions

### Issue: "Relay is not reachable"
**Cause**: The relay URL cannot be connected to
**Solutions**:
- Check if `wss://relay.nsec.app` is online
- Try a different relay if available
- Check your network/firewall settings

### Issue: "Connection timeout"
**Cause**: The bunker didn't respond within 30-60 seconds
**Solutions**:
- Ensure your remote signer (bunker) is running
- Verify it's listening on the correct relay
- Check the pubkey in the URI matches your bunker's pubkey
- If a popup opened, approve the connection quickly

### Issue: "Please allow popups"
**Cause**: Browser blocked the authorization popup window
**Solutions**:
- Click the popup blocked icon in your browser's address bar
- Allow popups for this site
- Try logging in again after allowing popups

### Issue: "Authentication failed"
**Cause**: The secret doesn't match or is invalid
**Solutions**:
- Verify the secret parameter is correct
- Regenerate the bunker URI from your remote signer
- Check for any typos in the URI

## How NIP-46 (Bunker) Works

1. **Client** (Spookstr) generates a temporary keypair
2. **Client** connects to the specified relay
3. **Client** sends a `connect` request to the remote signer pubkey
4. **Remote signer** (bunker) receives the request
5. **Remote signer** may prompt for approval (depending on configuration)
   - **Auth Challenge**: If approval is needed, bunker sends an auth URL
   - **Popup Window**: Client opens the URL in a popup for user authorization
   - **User Action**: You must approve the connection in the popup window
6. **Remote signer** sends back a `connect` response with authentication
7. Connection established - client can now request signatures

## Auth Challenge Flow (What Happens Now)

When you try to log in with your bunker URI, the system will:

1. **Send connection request** to the bunker via the relay
2. **Receive auth challenge** - A URL like `https://use.nsec.app/key/npub1...`
3. **Open popup window** automatically with the authorization page
4. **Wait for your approval** (up to 60 seconds)
5. **Complete connection** once you approve in the popup

**Important**: You must **allow popups** for this site! The auth challenge requires opening a new window.

## Next Steps for Debugging

If the issue persists after these changes:

1. **Check the console logs** - they will show exactly where the connection fails
2. **Test the relay** - open a WebSocket connection test tool to verify `wss://relay.nsec.app` is working
3. **Verify the bunker** - ensure your remote signer is:
   - Running and online
   - Configured with the correct pubkey (0155373ac79b7ffb0f586c3e68396f9e82d46f7afe7016d46ed9ca46ba3e1bed)
   - Listening on wss://relay.nsec.app
4. **Check the secret** - the secret may be single-use or expired
5. **Update @nostrify/react** - check if there's a newer version with bunker improvements

## Alternative Login Methods

If bunker login continues to have issues, consider:
- **Extension login** - Use a Nostr browser extension (Alby, nos2x, etc.)
- **nsec login** - Direct login with your private key (less secure, use with caution)

## Resources

- [NIP-46 Specification](https://github.com/nostr-protocol/nips/blob/master/46.md)
- [Nostrify Documentation](https://jsr.io/@nostrify/react)
