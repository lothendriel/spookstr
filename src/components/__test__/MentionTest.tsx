import { useState } from 'react';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { extractMentions, getMentionedPubkeys } from '@/lib/mentions';

export function MentionTest() {
  const [content, setContent] = useState('');

  const mentions = extractMentions(content);
  const pubkeys = getMentionedPubkeys(content);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Mention System Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MentionTextarea
          placeholder="Type @ to test mentions..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
        />
        
        <div className="space-y-2">
          <h4 className="font-medium">Extracted P Tags:</h4>
          <pre className="bg-muted p-2 rounded text-sm">
            {JSON.stringify(mentions, null, 2)}
          </pre>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Mentioned Pubkeys:</h4>
          <pre className="bg-muted p-2 rounded text-sm">
            {JSON.stringify(pubkeys, null, 2)}
          </pre>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Raw Content:</h4>
          <pre className="bg-muted p-2 rounded text-sm whitespace-pre-wrap">
            {content}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}