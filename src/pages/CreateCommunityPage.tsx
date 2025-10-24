import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateCommunityDefinition } from '@/components/CreateCommunityDefinition';
import { CommunityManagement } from '@/components/CommunityManagement';
import { useCommunity } from '@/hooks/useCommunity';
import { Skeleton } from '@/components/ui/skeleton';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { useNavigate, useParams } from 'react-router-dom';

// Import the predefined communities data
const PARANORMAL_COMMUNITIES = [
  { id: 'spookstr', name: 'Spookstr', description: 'Main paranormal community for all supernatural experiences' },
  { id: 'ghosts', name: 'Ghosts', description: 'Share your ghost stories and haunted location experiences' },
  { id: 'ufos', name: 'UFOs & Aliens', description: 'UFO sightings, alien encounters, and extraterrestrial phenomena' },
  { id: 'cryptids', name: 'Cryptids', description: 'Bigfoot, Loch Ness Monster, and other mysterious creatures' },
  { id: 'supernatural', name: 'Supernatural', description: 'General supernatural discussions and unexplained events' },
  { id: 'occult', name: 'Occult', description: 'Magic, rituals, and esoteric knowledge' },
  { id: 'haunted', name: 'Haunted Places', description: 'Discussion of haunted locations and paranormal hotspots' },
  { id: 'mysteries', name: 'Unexplained Mysteries', description: 'Conspiracy theories and unexplained phenomena' }
];

export default function CreateCommunityPage() {
  const navigate = useNavigate();
  const { communityId } = useParams<{ communityId: string }>();

  // Determine which community to create/check
  const targetCommunityId = communityId || 'spookstr';
  const { data: existingCommunity, isLoading } = useCommunity(targetCommunityId);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
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
      </div>
    );
  }

  // Get the predefined community data if it exists
  const predefinedCommunity = PARANORMAL_COMMUNITIES.find(c => c.id === targetCommunityId);

  if (existingCommunity) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
          <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-purple-400 text-center">
                Manage {existingCommunity.name} Community
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-purple-300 text-center mb-6">
                The {existingCommunity.name} community already exists. You can manage it here or visit the community page.
              </p>
              <div className="space-y-4">
                <CommunityManagement community={existingCommunity} />
                <div className="text-center">
                  <button
                    onClick={() => navigate(`/community/${existingCommunity.id}`)}
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
      </div>
    );
  }

  // If no predefined community data found, show a generic creation form
  if (!predefinedCommunity) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
          <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-purple-400 text-center">
                Create Community
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-purple-300 text-center mb-6">
                Create a new community definition using NIP-72.
              </p>
              <CreateCommunityDefinition
                initialData={{ id: targetCommunityId }}
                onSuccess={() => navigate(`/community/${targetCommunityId}?created=true`)}
              />
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SpookstrHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
        <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-purple-400 text-center">
              Create {predefinedCommunity.name} Community
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-purple-300 text-center mb-6">
              This page will create the {predefinedCommunity.name} community definition using NIP-72.
              Once created, users can access it at <code className="bg-purple-500/20 px-1 rounded">/community/{predefinedCommunity.id}</code>
            </p>
            <CreateCommunityDefinition
              initialData={predefinedCommunity}
              onSuccess={() => navigate(`/community/${predefinedCommunity.id}?created=true`)}
            />
          </CardContent>
        </Card>
      </div>
      </main>
    </div>
  );
}