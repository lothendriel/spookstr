import { useState, useEffect } from 'react';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { HiddenUsersManager } from '@/components/HiddenUsersManager';
import { HiddenHashtagsManager } from '@/components/HiddenHashtagsManager';
import { PersonalizedHashtagsManager } from '@/components/PersonalizedHashtagsManager';
import { Settings, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function UserSettings() {
  const [localStorageStatus, setLocalStorageStatus] = useState<{
    hiddenUsers: string[] | null;
    hiddenHashtags: string[] | null;
    personalizedHashtags: string[] | null;
    loading: boolean;
    error: string | null;
  }>({
    hiddenUsers: null,
    hiddenHashtags: null,
    personalizedHashtags: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    // Check what's actually stored in localStorage
    try {
      const hiddenUsers = JSON.parse(localStorage.getItem('spookstr:hidden-users') || '[]');
      const hiddenHashtags = JSON.parse(localStorage.getItem('spookstr:hidden-hashtags') || '[]');
      const personalizedHashtags = JSON.parse(localStorage.getItem('spookstr:personalized-hashtags') || '[]');

      setLocalStorageStatus({
        hiddenUsers,
        hiddenHashtags,
        personalizedHashtags,
        loading: false,
        error: null
      });
    } catch (error) {
      setLocalStorageStatus(prev => ({
        ...prev,
        loading: false,
        error: `Failed to read preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  }, []);

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

        {/* LocalStorage Status */}
        {!localStorageStatus.loading && (
          <div className="mb-6 space-y-3">
            {localStorageStatus.error ? (
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">
                  {localStorageStatus.error}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-lime-500/50 bg-lime-500/10">
                <CheckCircle className="h-4 w-4 text-lime-400" />
                <AlertDescription className="text-lime-400">
                  Preferences loaded successfully: {localStorageStatus.hiddenUsers?.length || 0} hidden users,
                  {localStorageStatus.hiddenHashtags?.length || 0} hidden hashtags,
                  {localStorageStatus.personalizedHashtags?.length || 0} personalized hashtags
                </AlertDescription>
              </Alert>
            )}

            {/* Restore Preferences Button */}
            <div className="flex justify-center gap-2">
              <Button
                onClick={() => {
                  // Force refresh localStorage data
                  try {
                    const hiddenUsers = JSON.parse(localStorage.getItem('spookstr:hidden-users') || '[]');
                    const hiddenHashtags = JSON.parse(localStorage.getItem('spookstr:hidden-hashtags') || '[]');
                    const personalizedHashtags = JSON.parse(localStorage.getItem('spookstr:personalized-hashtags') || '[]');

                    setLocalStorageStatus({
                      hiddenUsers,
                      hiddenHashtags,
                      personalizedHashtags,
                      loading: false,
                      error: null
                    });

                    // Force reload the page to refresh all hooks
                    window.location.reload();
                  } catch (error) {
                    setLocalStorageStatus(prev => ({
                      ...prev,
                      loading: false,
                      error: `Failed to restore preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
                    }));
                  }
                }}
                variant="outline"
                className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Display
              </Button>

              <Button
                onClick={() => {
                  // Export preferences as JSON
                  try {
                    const preferences = {
                      hiddenUsers: JSON.parse(localStorage.getItem('spookstr:hidden-users') || '[]'),
                      hiddenHashtags: JSON.parse(localStorage.getItem('spookstr:hidden-hashtags') || '[]'),
                      personalizedHashtags: JSON.parse(localStorage.getItem('spookstr:personalized-hashtags') || '[]'),
                      exportedAt: new Date().toISOString()
                    };

                    const blob = new Blob([JSON.stringify(preferences, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `spookstr-preferences-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    setLocalStorageStatus(prev => ({
                      ...prev,
                      error: `Failed to export preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
                    }));
                  }
                }}
                variant="outline"
                className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
              >
                Export Preferences
              </Button>

              <Button
                onClick={() => {
                  // Import preferences from JSON file
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        try {
                          const preferences = JSON.parse(e.target?.result as string);

                          if (preferences.hiddenUsers) {
                            localStorage.setItem('spookstr:hidden-users', JSON.stringify(preferences.hiddenUsers));
                          }
                          if (preferences.hiddenHashtags) {
                            localStorage.setItem('spookstr:hidden-hashtags', JSON.stringify(preferences.hiddenHashtags));
                          }
                          if (preferences.personalizedHashtags) {
                            localStorage.setItem('spookstr:personalized-hashtags', JSON.stringify(preferences.personalizedHashtags));
                          }

                          // Reload to apply changes
                          window.location.reload();
                        } catch (error) {
                          setLocalStorageStatus(prev => ({
                            ...prev,
                            error: `Failed to import preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
                          }));
                        }
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}
                variant="outline"
                className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
              >
                Import Preferences
              </Button>
            </div>
          </div>
        )}

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
