import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Upload, AlertCircle, Copy, ClipboardCopy, Clipboard, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHiddenUsers } from '@/hooks/useHiddenUsers';
import { useHiddenHashtags } from '@/hooks/useHiddenHashtags';
import { usePersonalizedHashtags } from '@/hooks/usePersonalizedHashtags';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
  const [rawSettingsOpen, setRawSettingsOpen] = useState(false);
  const [textSettingsOpen, setTextSettingsOpen] = useState(false);
  const [localStorageViewOpen, setLocalStorageViewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

  /**
   * Create a settings backup file and download it
   */
  const handleExport = () => {
    try {
      // Use the same method as getCurrentSettingsJson for consistency
      const dataStr = getCurrentSettingsJson();
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

        // Direct localStorage approach - more reliable than using the hooks
        // This ensures we're writing the exact data format expected by the hooks

        // Import hidden users
        if (Array.isArray(data.settings.hiddenUsers)) {
          localStorage.setItem('spookstr:hidden-users', JSON.stringify(data.settings.hiddenUsers));
        }

        // Import hidden hashtags
        if (Array.isArray(data.settings.hiddenHashtags)) {
          localStorage.setItem('spookstr:hidden-hashtags', JSON.stringify(data.settings.hiddenHashtags));
        }

        // Import personalized hashtags
        if (Array.isArray(data.settings.personalizedHashtags)) {
          localStorage.setItem('spookstr:personalized-hashtags', JSON.stringify(data.settings.personalizedHashtags));
        }

        // Also update the hook states (this might be redundant with useEffect in the hooks,
        // but ensures immediate UI update)
        clearHiddenUsers();
        data.settings.hiddenUsers.forEach(pubkey => {
          try {
            hideUser(pubkey);
          } catch (err) {
            console.warn(`Failed to update UI for hidden user: ${pubkey}`);
          }
        });

        clearHiddenHashtags();
        data.settings.hiddenHashtags.forEach(hashtag => {
          try {
            hideHashtag(hashtag);
          } catch (err) {
            console.warn(`Failed to update UI for hidden hashtag: ${hashtag}`);
          }
        });

        clearPersonalizedHashtags();
        data.settings.personalizedHashtags.forEach(hashtag => {
          try {
            addPersonalizedHashtag(hashtag);
          } catch (err) {
            console.warn(`Failed to update UI for personalized hashtag: ${hashtag}`);
          }
        });

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

  /**
   * Get current settings as JSON string
   */
  const getCurrentSettingsJson = (): string => {
    // Directly read from localStorage for maximum reliability
    const hiddenUsers = localStorage.getItem('spookstr:hidden-users') || '[]';
    const hiddenTags = localStorage.getItem('spookstr:hidden-hashtags') || '[]';
    const personalizedTags = localStorage.getItem('spookstr:personalized-hashtags') || '[]';

    // Parse the values
    const parsedHiddenUsers = JSON.parse(hiddenUsers);
    const parsedHiddenTags = JSON.parse(hiddenTags);
    const parsedPersonalizedTags = JSON.parse(personalizedTags);

    const backup: SettingsBackup = {
      version: '1.0.0',
      timestamp: Date.now(),
      settings: {
        hiddenUsers: parsedHiddenUsers,
        hiddenHashtags: parsedHiddenTags,
        personalizedHashtags: parsedPersonalizedTags
      }
    };
    return JSON.stringify(backup, null, 2);
  };

  /**
   * Copy settings to clipboard
   */
  const handleCopySettings = () => {
    try {
      const settingsJson = getCurrentSettingsJson();
      navigator.clipboard.writeText(settingsJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setSuccess('Settings copied to clipboard');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to copy settings:', err);
      setError('Failed to copy settings to clipboard');
      setTimeout(() => setError(null), 5000);
    }
  };

  /**
   * Parse and import settings from JSON text
   */
  const handleImportFromText = () => {
    setError(null);
    setSuccess(null);

    if (!jsonInput.trim()) {
      setError('Please enter settings JSON');
      return;
    }

    try {
      const data = JSON.parse(jsonInput) as SettingsBackup;

      // Validate the backup format
      if (!data.version || !data.settings) {
        throw new Error('Invalid backup format');
      }

      // Direct localStorage approach - more reliable than using the hooks
      // This ensures we're writing the exact data format expected by the hooks

      // Import hidden users
      if (Array.isArray(data.settings.hiddenUsers)) {
        localStorage.setItem('spookstr:hidden-users', JSON.stringify(data.settings.hiddenUsers));
      }

      // Import hidden hashtags
      if (Array.isArray(data.settings.hiddenHashtags)) {
        localStorage.setItem('spookstr:hidden-hashtags', JSON.stringify(data.settings.hiddenHashtags));
      }

      // Import personalized hashtags
      if (Array.isArray(data.settings.personalizedHashtags)) {
        localStorage.setItem('spookstr:personalized-hashtags', JSON.stringify(data.settings.personalizedHashtags));
      }

      // Also update the hook states (this might be redundant with useEffect in the hooks,
      // but ensures immediate UI update)
      clearHiddenUsers();
      data.settings.hiddenUsers.forEach(pubkey => {
        try {
          hideUser(pubkey);
        } catch (err) {
          console.warn(`Failed to update UI for hidden user: ${pubkey}`);
        }
      });

      clearHiddenHashtags();
      data.settings.hiddenHashtags.forEach(hashtag => {
        try {
          hideHashtag(hashtag);
        } catch (err) {
          console.warn(`Failed to update UI for hidden hashtag: ${hashtag}`);
        }
      });

      clearPersonalizedHashtags();
      data.settings.personalizedHashtags.forEach(hashtag => {
        try {
          addPersonalizedHashtag(hashtag);
        } catch (err) {
          console.warn(`Failed to update UI for personalized hashtag: ${hashtag}`);
        }
      });

      setSuccess('Settings imported successfully');
      setTextSettingsOpen(false);
      setJsonInput('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to import settings:', err);
      setError('Failed to parse settings JSON. Please check the format.');
      setTimeout(() => setError(null), 5000);
    }
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
            Export Settings File
          </Button>
          <Button
            onClick={handleImportClick}
            className="flex-1 border-lime-500 text-lime-400 hover:bg-lime-500/10"
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Settings File
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />
        </div>

        {/* Advanced Import/Export */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Dialog open={rawSettingsOpen} onOpenChange={setRawSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 border-lime-500/30 text-lime-400 hover:bg-lime-500/10"
              >
                <ClipboardCopy className="h-4 w-4 mr-2" />
                Copy Settings as Text
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black border-lime-500/30 text-lime-400 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-lime-400">Current Settings</DialogTitle>
                <DialogDescription className="text-lime-500/70">
                  Copy this JSON text to save your settings or share between devices
                </DialogDescription>
              </DialogHeader>

              {/* Settings Summary */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="border border-lime-500/20 rounded p-2 text-center">
                  <div className="text-sm font-medium text-lime-400">Hidden Users</div>
                  <div className="text-xl font-bold text-lime-500">
                    {JSON.parse(localStorage.getItem('spookstr:hidden-users') || '[]').length}
                  </div>
                </div>
                <div className="border border-lime-500/20 rounded p-2 text-center">
                  <div className="text-sm font-medium text-lime-400">Hidden Tags</div>
                  <div className="text-xl font-bold text-lime-500">
                    {JSON.parse(localStorage.getItem('spookstr:hidden-hashtags') || '[]').length}
                  </div>
                </div>
                <div className="border border-lime-500/20 rounded p-2 text-center">
                  <div className="text-sm font-medium text-lime-400">Personalized</div>
                  <div className="text-xl font-bold text-lime-500">
                    {JSON.parse(localStorage.getItem('spookstr:personalized-hashtags') || '[]').length}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Textarea
                  className="font-mono text-xs h-64 bg-black/80 border-lime-500/30"
                  value={getCurrentSettingsJson()}
                  readOnly
                />

                <Button
                  onClick={handleCopySettings}
                  className="w-full bg-lime-500 hover:bg-lime-600 text-black"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={textSettingsOpen} onOpenChange={setTextSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 border-lime-500/30 text-lime-400 hover:bg-lime-500/10"
              >
                <Clipboard className="h-4 w-4 mr-2" />
                Paste Settings from Text
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black border-lime-500/30 text-lime-400 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-lime-400">Import Settings from Text</DialogTitle>
                <DialogDescription className="text-lime-500/70">
                  Paste settings JSON that you've previously copied or received from another device
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <Textarea
                  className="font-mono text-xs h-64 bg-black/80 border-lime-500/30"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Paste your settings JSON here..."
                />

                <Button
                  onClick={handleImportFromText}
                  className="w-full bg-lime-500 hover:bg-lime-600 text-black"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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

          <Dialog open={localStorageViewOpen} onOpenChange={setLocalStorageViewOpen}>
            <Button
              onClick={() => setLocalStorageViewOpen(true)}
              variant="link"
              size="sm"
              className="text-xs text-lime-500/60 hover:text-lime-400 p-0 h-auto font-normal"
            >
              View raw localStorage keys (for debugging)
            </Button>
            <DialogContent className="bg-black border-lime-500/30 text-lime-400 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-lime-400">Raw localStorage Data</DialogTitle>
                <DialogDescription className="text-lime-500/70">
                  Technical view of all localStorage keys used by Spookstr
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="border border-lime-500/20 rounded p-3 bg-black/80 font-mono text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-lime-400 font-medium">Key</span>
                    <span className="text-lime-400 font-medium">Value</span>
                  </div>
                  {Object.keys(localStorage)
                    .filter(key => key.startsWith('spookstr:'))
                    .map(key => (
                      <div key={key} className="flex justify-between border-t border-lime-500/10 pt-2">
                        <span className="text-lime-500">{key}</span>
                        <span className="text-lime-300 truncate max-w-[300px]">
                          {localStorage.getItem(key)?.length || 0} bytes
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}