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
    // Check what's actually stored in localStorage with detailed debugging
    try {
      // First, let's see ALL localStorage keys that might be related
      const allKeys = Object.keys(localStorage);
      const relevantKeys = allKeys.filter(key =>
        key.includes('spookstr') ||
        key.includes('hidden') ||
        key.includes('user') ||
        key.includes('hashtag') ||
        key.includes('preference')
      );

      console.log('All localStorage keys:', allKeys);
      console.log('Relevant localStorage keys:', relevantKeys);

      // Check each potential key
      const debugInfo: Record<string, any> = {};
      relevantKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          debugInfo[key] = {
            raw: value,
            parsed: value ? JSON.parse(value) : null,
            length: value?.length || 0
          };
        } catch (e) {
          debugInfo[key] = {
            raw: localStorage.getItem(key),
            parseError: e instanceof Error ? e.message : 'Parse error'
          };
        }
      });

      console.log('Debug info for relevant keys:', debugInfo);

      // Now try to get the expected keys
      const hiddenUsersRaw = localStorage.getItem('spookstr:hidden-users');
      const hiddenHashtagsRaw = localStorage.getItem('spookstr:hidden-hashtags');
      const personalizedHashtagsRaw = localStorage.getItem('spookstr:personalized-hashtags');

      console.log('Raw hiddenUsers:', hiddenUsersRaw);
      console.log('Raw hiddenHashtags:', hiddenHashtagsRaw);
      console.log('Raw personalizedHashtags:', personalizedHashtagsRaw);

      const hiddenUsers = hiddenUsersRaw ? JSON.parse(hiddenUsersRaw) : [];
      const hiddenHashtags = hiddenHashtagsRaw ? JSON.parse(hiddenHashtagsRaw) : [];
      const personalizedHashtags = personalizedHashtagsRaw ? JSON.parse(personalizedHashtagsRaw) : [];

      console.log('Parsed hiddenUsers:', hiddenUsers);
      console.log('Parsed hiddenHashtags:', hiddenHashtags);
      console.log('Parsed personalizedHashtags:', personalizedHashtags);

      setLocalStorageStatus({
        hiddenUsers,
        hiddenHashtags,
        personalizedHashtags,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error reading localStorage:', error);
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
            <div className="flex flex-col gap-3">
              <div className="flex justify-center gap-2 flex-wrap">
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

                <Button
                  onClick={() => {
                    // Show raw localStorage data in console
                    console.log('=== RAW LOCALSTORAGE DEBUG ===');
                    const allKeys = Object.keys(localStorage);
                    console.log('All localStorage keys:', allKeys);

                    allKeys.forEach(key => {
                      const value = localStorage.getItem(key);
                      console.log(`Key: "${key}"`, value);
                      try {
                        const parsed = JSON.parse(value || 'null');
                        console.log(`Parsed "${key}":`, parsed);
                      } catch (e) {
                        console.log(`Could not parse "${key}":`, e);
                      }
                    });

                    alert('Check the browser console (F12) for detailed localStorage data. Look for any keys that might contain your preferences.');
                  }}
                  variant="outline"
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                >
                  Debug localStorage
                </Button>

                <Button
                  onClick={() => {
                    // Try to find preferences in all localStorage keys
                    console.log('=== FINDING PREFERENCES ===');
                    const allKeys = Object.keys(localStorage);
                    const foundPreferences: Record<string, any> = {};

                    allKeys.forEach(key => {
                      const value = localStorage.getItem(key);
                      if (!value) return;

                      try {
                        const parsed = JSON.parse(value);

                        // Check if this looks like user preferences data
                        if (Array.isArray(parsed)) {
                          // Check if it contains npubs (hidden users)
                          const hasNpubs = parsed.some((item: any) =>
                            typeof item === 'string' && item.startsWith('npub1')
                          );

                          // Check if it contains hashtags
                          const hasHashtags = parsed.some((item: any) =>
                            typeof item === 'string' && !item.startsWith('npub1') && item.length > 0
                          );

                          if (hasNpubs) {
                            foundPreferences[`hiddenUsers_${key}`] = parsed;
                            console.log(`Found hidden users in key "${key}":`, parsed);
                          }

                          if (hasHashtags) {
                            foundPreferences[`hashtags_${key}`] = parsed;
                            console.log(`Found hashtags in key "${key}":`, parsed);
                          }
                        }
                      } catch (e) {
                        // Not JSON, skip
                      }
                    });

                    if (Object.keys(foundPreferences).length > 0) {
                      console.log('Found preferences:', foundPreferences);

                      // Try to move found preferences to correct keys
                      let movedAny = false;

                      if (foundPreferences.hiddenUsers_spookstr_hidden_users) {
                        localStorage.setItem('spookstr:hidden-users', JSON.stringify(foundPreferences.hiddenUsers_spookstr_hidden_users));
                        console.log('Moved hidden users to correct key');
                        movedAny = true;
                      } else {
                        // Look for any hidden users
                        Object.keys(foundPreferences).forEach(key => {
                          if (key.startsWith('hiddenUsers_')) {
                            localStorage.setItem('spookstr:hidden-users', JSON.stringify(foundPreferences[key]));
                            console.log(`Moved hidden users from ${key} to correct key`);
                            movedAny = true;
                          }
                        });
                      }

                      if (foundPreferences.hashtags_spookstr_hidden_hashtags) {
                        localStorage.setItem('spookstr:hidden-hashtags', JSON.stringify(foundPreferences.hashtags_spookstr_hidden_hashtags));
                        console.log('Moved hidden hashtags to correct key');
                        movedAny = true;
                      }

                      if (foundPreferences.hashtags_spookstr_personalized_hashtags) {
                        localStorage.setItem('spookstr:personalized-hashtags', JSON.stringify(foundPreferences.hashtags_spookstr_personalized_hashtags));
                        console.log('Moved personalized hashtags to correct key');
                        movedAny = true;
                      } else {
                        // Look for any hashtags that might be personalized
                        Object.keys(foundPreferences).forEach(key => {
                          if (key.startsWith('hashtags_') && !key.includes('hidden')) {
                            localStorage.setItem('spookstr:personalized-hashtags', JSON.stringify(foundPreferences[key]));
                            console.log(`Moved personalized hashtags from ${key} to correct key`);
                            movedAny = true;
                          }
                        });
                      }

                      if (movedAny) {
                        alert('Found and moved your preferences to the correct keys! Click "Refresh Display" to see them.');
                        window.location.reload();
                      } else {
                        alert('Found some data but could not determine how to organize it. Check console for details.');
                      }
                    } else {
                      alert('No preferences found in localStorage. Check console for all stored data.');
                    }
                  }}
                  variant="outline"
                  className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                >
                  Find My Preferences
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-lime-500/60">
                  Open browser console (F12) and click "Debug localStorage" to see all stored data
                </p>
              </div>
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
