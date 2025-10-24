import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateCommunityDefinition } from '@/components/CreateCommunityDefinition';

export default function CreateCommunityPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-purple-400 text-center">
              Create Spookstr Community
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-purple-300 text-center mb-6">
              This page will create the Spookstr community definition using NIP-72.
              Once created, users can access it at <code className="bg-purple-500/20 px-1 rounded">/community/spookstr</code>
            </p>
            <CreateCommunityDefinition />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}