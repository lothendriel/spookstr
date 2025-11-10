import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHiddenUsers } from '@/hooks/useHiddenUsers';
import { useHiddenHashtags } from '@/hooks/useHiddenHashtags';
import { usePersonalizedHashtags } from '@/hooks/usePersonalizedHashtags';

/**
 * Settings backup schema
 */
interface SettingsBackup {
  version: string;
  timestamp: number;
  settings: {
    hiddenUsers: string[];
    hiddenHashtags: string[];
    personalizedHashtags: string[];
  };
}

/**
 * Component for exporting and importing user settings
 */
export function SettingsExportImport() {
  const { hiddenPubkeys, hideUser, clearHiddenUsers } = useHiddenUsers();
  const { hiddenHashtags, hideHashtag, clearHiddenHashtags } = useHiddenHashtags();
  const { personalizedHashtags, addPersonalizedHashtag, clearPersonalizedHashtags } = usePersonalizedHashtags();
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Create a settings backup file and download it
   */
  const handleExport = () => {
    try {
      const backup: SettingsBackup = {
        version: '1.0.0',
        timestamp: Date.now(),
        settings: {
          hiddenUsers: hiddenPubkeys,
          hiddenHashtags: hiddenHashtags,
          personalizedHashtags: personalizedHashtags
        }
      };

      // Create a JSON file with the settings
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // Generate a filename with the current date
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `spookstr-settings-${dateStr}.json`;

      // Create a download link and trigger it
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      setSuccess('Settings exported successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to export settings:', err);
      setError('Failed to export settings');
      setTimeout(() => setError(null), 5000);
    }
  };

  /**
   * Trigger file input click
   */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Process the imported settings file
   */
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as SettingsBackup;
        
        // Validate the backup format
        if (!data.version || !data.settings) {
          throw new Error('Invalid backup format');
        }

        // Clear existing settings
        clearHiddenUsers();
        clearHiddenHashtags();
        clearPersonalizedHashtags();

        // Import hidden users
        if (Array.isArray(data.settings.hiddenUsers)) {
          data.settings.hiddenUsers.forEach(pubkey => {
            try {
              hideUser(pubkey);
            } catch (err) {
              console.warn(`Failed to import hidden user: ${pubkey}`);
            }
          });
        }

        // Import hidden hashtags
        if (Array.isArray(data.settings.hiddenHashtags)) {
          data.settings.hiddenHashtags.forEach(hashtag => {
            try {
              hideHashtag(hashtag);
            } catch (err) {
              console.warn(`Failed to import hidden hashtag: ${hashtag}`);
            }
          });
        }

        // Import personalized hashtags
        if (Array.isArray(data.settings.personalizedHashtags)) {
          data.settings.personalizedHashtags.forEach(hashtag => {
            try {
              addPersonalizedHashtag(hashtag);
            } catch (err) {
              console.warn(`Failed to import personalized hashtag: ${hashtag}`);
            }
          });
        }

        setSuccess('Settings imported successfully');
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        console.error('Failed to import settings:', err);
        setError('Failed to import settings. Please check the file format.');
        setTimeout(() => setError(null), 5000);
      }
    };

    reader.onerror = () => {
      setError('Failed to read the file');
      setTimeout(() => setError(null), 5000);
    };

    reader.readAsText(file);
    
    // Reset the file input so the same file can be selected again
    event.target.value = '';
  };

  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lime-400 flex items-center gap-2">
          <Save className="h-5 w-5" />
          Backup & Restore Settings
        </CardTitle>
        <CardDescription className="text-lime-500/70">
          Export your settings to a file or restore them from a previous backup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success/Error Messages */}
        {success && (
          <Alert className="border-lime-500/50 bg-lime-500/10">
            <AlertDescription className="text-lime-400">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Export/Import Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleExport}
            className="flex-1 bg-lime-500 hover:bg-lime-600 text-black"
          >
            <Save className="h-4 w-4 mr-2" />
            Export Settings
          </Button>
          <Button
            onClick={handleImportClick}
            className="flex-1 border-lime-500 text-lime-400 hover:bg-lime-500/10"
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Settings
          </Button>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />
        </div>

        <div className="text-sm text-lime-500/70 space-y-2 pt-2">
          <p>
            These settings include:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Personalized hashtags ({personalizedHashtags.length})</li>
            <li>Hidden users ({hiddenPubkeys.length})</li>
            <li>Hidden hashtags ({hiddenHashtags.length})</li>
          </ul>
          <p className="text-xs border-t border-lime-500/20 pt-3 mt-2">
            Note: Your settings are stored in your browser's local storage and will be lost if you clear your browser data.
            Export your settings periodically to ensure you can restore them if needed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}