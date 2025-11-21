import { SpookstrHeader } from '@/components/SpookstrHeader';
import { HiddenUsersManager } from '@/components/HiddenUsersManager';
import { HiddenHashtagsManager } from '@/components/HiddenHashtagsManager';
import { PersonalizedHashtagsManager } from '@/components/PersonalizedHashtagsManager';
import { SettingsSyncManager } from '@/components/SettingsSyncManager';
import { Settings, Cloud, Filter } from 'lucide-react';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function UserSettings() {
  const [activeTab, setActiveTab] = useState('sync');

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
            Manage your app settings, content preferences, and sync options
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sync" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Sync & Backup
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Content Filtering
            </TabsTrigger>
          </TabsList>

          {/* Sync & Backup Tab */}
          <TabsContent value="sync" className="space-y-6">
            <SettingsSyncManager />
          </TabsContent>

          {/* Content Filtering Tab */}
          <TabsContent value="content" className="space-y-6">
            <div className="space-y-6">
              {/* Personalized Hashtags Section */}
              <PersonalizedHashtagsManager />

              {/* Hidden Users Section */}
              <HiddenUsersManager />

              {/* Hidden Hashtags Section */}
              <HiddenHashtagsManager />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
