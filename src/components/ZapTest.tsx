import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

// Create a test event with a known working lightning address
const TEST_EVENT = {
  id: 'test-zap-event',
  pubkey: 'd0a5a781d0ae6e0783781dbe6dc7c63db35c066a736aff94975dc263a8cb8ca2', // Example pubkey
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'Test post for zap functionality',
  sig: ''
};

export function ZapTest() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testDirectLNURL = async () => {
    addResult("Testing direct LNURL approach...");
    try {
      const lightningAddress = 'fiatjaf@getalby.com'; // Known working address
      const [username, domain] = lightningAddress.split('@');
      const url = `https://${domain}/.well-known/lnurlp/${username}?amount=1000`;

      addResult(`Step 1 - Initial request: ${url}`);
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.callback) {
        addResult(`✅ Step 1 SUCCESS: Got callback URL`);

        // Step 2: Make callback request for actual invoice
        const callbackUrl = `${data.callback}?amount=1000`;
        addResult(`Step 2 - Callback request: ${callbackUrl}`);

        const callbackResponse = await fetch(callbackUrl);
        const callbackData = await callbackResponse.json();

        if (callbackResponse.ok && callbackData.pr) {
          addResult(`✅ SUCCESS: Direct LNURL works! Invoice: ${callbackData.pr.substring(0, 50)}...`);
        } else {
          addResult(`❌ Step 2 FAILED: ${JSON.stringify(callbackData)}`);
        }
      } else {
        addResult(`❌ Step 1 FAILED: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testGetAlbyEndpoint = async () => {
    addResult("Testing GetAlby zap endpoint...");
    try {
      const lightningAddress = 'cryptoshi2k21@getalby.com'; // The failing address from logs
      const [username, domain] = lightningAddress.split('@');
      const url = `https://${domain}/.well-known/lnurlp/${username}?amount=1000`;

      addResult(`Step 1 - Initial request: ${url}`);
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.callback) {
        addResult(`✅ Step 1 SUCCESS: Got callback URL`);

        // Step 2: Make callback request for actual invoice
        const callbackUrl = `${data.callback}?amount=1000`;
        addResult(`Step 2 - Callback request: ${callbackUrl}`);

        const callbackResponse = await fetch(callbackUrl);
        const callbackData = await callbackResponse.json();

        if (callbackResponse.ok && callbackData.pr) {
          addResult(`✅ SUCCESS: GetAlby works! Invoice: ${callbackData.pr.substring(0, 50)}...`);
        } else {
          addResult(`❌ Step 2 FAILED: ${JSON.stringify(callbackData)}`);
        }
      } else {
        addResult(`❌ Step 1 FAILED: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lime-400 flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Zap Functionality Test</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-sm text-lime-100/80">
          Test different lightning address configurations to verify zap functionality works correctly.
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={testDirectLNURL} variant="outline" size="sm">
            Test Direct LNURL
          </Button>

          <Button onClick={testGetAlbyEndpoint} variant="outline" size="sm">
            Test GetAlby (failing case)
          </Button>

          <Button onClick={clearResults} variant="outline" size="sm">
            Clear Results
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="bg-black/20 border border-lime-500/20 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-lime-400 mb-2">Test Results:</h4>
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`text-xs font-mono ${
                    result.includes('✅') ? 'text-green-400' :
                    result.includes('❌') ? 'text-red-400' :
                    'text-lime-300'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}