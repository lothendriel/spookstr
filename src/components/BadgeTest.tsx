import { useNostr } from '@/hooks/useNostr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

export function BadgeTest() {
  const { nostr } = useNostr();
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testBadgeQueries = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing badge queries...');
      
      // Test 1: Find any profile badge events (kind 30008)
      const profileBadges = await nostr.query([{ kinds: [30008], limit: 10 }], { signal: AbortSignal.timeout(5000) });
      console.log('📋 Profile badge events:', profileBadges.length);
      
      // Test 2: Find any badge award events (kind 8)
      const badgeAwards = await nostr.query([{ kinds: [8], limit: 10 }], { signal: AbortSignal.timeout(5000) });
      console.log('🏅 Badge award events:', badgeAwards.length);
      
      // Test 3: Find any badge definition events (kind 30009)
      const badgeDefinitions = await nostr.query([{ kinds: [30009], limit: 10 }], { signal: AbortSignal.timeout(5000) });
      console.log('📖 Badge definition events:', badgeDefinitions.length);

      // Test 4: Check for well-known badge issuers
      const knownIssuers = [
        'npub1l2vyh47mk2p0qlsku7hg0vn29faehy9hy34ygaclpnscukqr9g8s6s5j85an', // badges.page
      ];
      
      for (const issuer of knownIssuers) {
        const issuerBadges = await nostr.query([{ kinds: [30009], authors: [issuer], limit: 5 }], { signal: AbortSignal.timeout(5000) });
        console.log(`🏢 Badges from ${issuer}:`, issuerBadges.length);
      }

      setResults({
        profileBadges: profileBadges.length,
        badgeAwards: badgeAwards.length,
        badgeDefinitions: badgeDefinitions.length,
        sampleProfileBadge: profileBadges[0],
        sampleBadgeAward: badgeAwards[0],
        sampleBadgeDefinition: badgeDefinitions[0],
      });

    } catch (error) {
      console.error('❌ Error testing badge queries:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-lime-500/20 bg-black/40">
      <CardHeader>
        <CardTitle className="text-lime-400">NIP-58 Badge Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testBadgeQueries} 
          disabled={loading}
          className="bg-lime-500 hover:bg-lime-600 text-black"
        >
          {loading ? 'Testing...' : 'Test Badge Queries'}
        </Button>
        
        {Object.keys(results).length > 0 && (
          <div className="space-y-2 text-sm">
            <div>Profile Badge Events: {results.profileBadges}</div>
            <div>Badge Award Events: {results.badgeAwards}</div>
            <div>Badge Definition Events: {results.badgeDefinitions}</div>
            
            {results.sampleProfileBadge && (
              <div className="mt-4 p-2 bg-black/20 rounded">
                <div className="font-mono text-xs break-all">
                  Sample Profile Badge ID: {results.sampleProfileBadge.id}
                </div>
              </div>
            )}
            
            {results.sampleBadgeAward && (
              <div className="mt-4 p-2 bg-black/20 rounded">
                <div className="font-mono text-xs break-all">
                  Sample Badge Award ID: {results.sampleBadgeAward.id}
                </div>
              </div>
            )}
            
            {results.sampleBadgeDefinition && (
              <div className="mt-4 p-2 bg-black/20 rounded">
                <div className="font-mono text-xs break-all">
                  Sample Badge Definition ID: {results.sampleBadgeDefinition.id}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}