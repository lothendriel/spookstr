import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateCommunityDefinition } from '@/components/CreateCommunityDefinition';
import { CommunityManagement } from '@/components/CommunityManagement';
import { useCommunity } from '@/hooks/useCommunity';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export default function CreateCommunityPage() {
  const navigate = useNavigate();
  const { data: existingCommunity, isLoading } = useCommunity('spookstr');

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
            <CardContent className="p-8">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (existingCommunity) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-purple-400 text-center">
                Manage Spookstr Community
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-purple-300 text-center mb-6">
                The Spookstr community already exists. You can manage it here or visit the community page.
              </p>
              <div className="space-y-4">
                <CommunityManagement community={existingCommunity} />
                <div className="text-center">
                  <button
                    onClick={() => navigate('/community/spookstr')}
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    Visit Community Page
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <CreateCommunityDefinition onSuccess={() => navigate('/community/spookstr')} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}