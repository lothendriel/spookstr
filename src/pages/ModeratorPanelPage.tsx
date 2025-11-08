import { useParams } from 'react-router-dom';
import { ModerationPanel } from '@/components/ModerationPanel';
import { SpookstrHeader } from '@/components/SpookstrHeader';

export default function ModeratorPanelPage() {
  const { communityId } = useParams<{ communityId: string }>();
  
  if (!communityId) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-red-400">Community ID not found</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      <SpookstrHeader />
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <ModerationPanel communityId={communityId} />
        </div>
      </main>
    </div>
  );
}
