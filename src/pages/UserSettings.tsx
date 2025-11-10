import { SpookstrHeader } from '@/components/SpookstrHeader';
import { HiddenUsersManager } from '@/components/HiddenUsersManager';
import { HiddenHashtagsManager } from '@/components/HiddenHashtagsManager';
import { PersonalizedHashtagsManager } from '@/components/PersonalizedHashtagsManager';
import { Settings } from 'lucide-react';

export default function UserSettings() {
  return (
    <div className="min-h-screen bg-background">
      <SpookstrHeader />

      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-lime-400" />
            <h1 className="text-3xl font-bold text-lime-400">User Settings</h1>
          </div>
          <p className="text-lime-500/70">
            Manage your content preferences and privacy settings
          </p>
        </div>

        {/* Content Filtering */}
        <div className="space-y-6">
          {/* Personalized Hashtags Section */}
          <PersonalizedHashtagsManager />

          {/* Hidden Users Section */}
          <HiddenUsersManager />

          {/* Hidden Hashtags Section */}
          <HiddenHashtagsManager />
        </div>
      </main>
    </div>
  );
}
