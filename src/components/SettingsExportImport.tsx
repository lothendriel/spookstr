import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Download, Upload, AlertCircle, CheckCircle, FileDown, FileUp, Trash2, RotateCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ExportedSettings {
  personalizedHashtags: string[];
  hiddenUsers: string[];
  hiddenHashtags: string[];
  exportDate: string;
  version: string;
}

export function SettingsExportImport() {
  const [personalizedHashtags] = useLocalStorage<string[]>('spookstr:personalized-hashtags', []);
  const [hiddenUsers] = useLocalStorage<string[]>('spookstr:hidden-users', []);
  const [hiddenHashtags] = useLocalStorage<string[]>('spookstr:hidden-hashtags', []);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    // Force a re-render by updating the refresh key
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);

      const settings: ExportedSettings = {
        personalizedHashtags,
        hiddenUsers,
        hiddenHashtags,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `spookstr-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      setSuccess('Settings exported successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to export settings. Please try again.');
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setError(null);

      const text = await file.text();
      const imported = JSON.parse(text) as ExportedSettings;

      // Validate the imported data structure
      if (!validateImportedSettings(imported)) {
        throw new Error('Invalid settings file format');
      }

      // Show confirmation dialog with counts
      const itemCounts = {
        personalizedHashtags: imported.personalizedHashtags.length,
        hiddenUsers: imported.hiddenUsers.length,
        hiddenHashtags: imported.hiddenHashtags.length
      };

      const totalItems = Object.values(itemCounts).reduce((sum, count) => sum + count, 0);

      const confirmed = confirm(
        `Import settings from ${new Date(imported.exportDate).toLocaleDateString()}?\n\n` +
        `This will add:\n` +
        `• ${itemCounts.personalizedHashtags} personalized hashtags\n` +
        `• ${itemCounts.hiddenUsers} hidden users\n` +
        `• ${itemCounts.hiddenHashtags} hidden hashtags\n\n` +
        `Total: ${totalItems} items\n\n` +
        `Note: Duplicate items will be automatically skipped.\n\n` +
        `⚠️ Important: This data has been validated and contains only valid pubkeys and hashtags.`
      );

      if (!confirmed) {
        setIsImporting(false);
        return;
      }

      // Import settings (merging with existing, avoiding duplicates)
      await importSettings(imported);

      setSuccess('Settings imported successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Import failed: ${err.message}`);
      } else {
        setError('Failed to import settings. Please check the file format.');
      }
      console.error('Import error:', err);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const validateImportedSettings = (data: any): data is ExportedSettings => {
    // Basic structure validation
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.personalizedHashtags)) return false;
    if (!Array.isArray(data.hiddenUsers)) return false;
    if (!Array.isArray(data.hiddenHashtags)) return false;
    if (typeof data.exportDate !== 'string') return false;
    if (typeof data.version !== 'string') return false;

    // Validate hidden users are valid 64-character hex pubkeys
    if (!data.hiddenUsers.every((pubkey: any) =>
      typeof pubkey === 'string' && /^[0-9a-f]{64}$/.test(pubkey)
    )) return false;

    // Validate hashtags are strings
    if (!data.personalizedHashtags.every((tag: any) => typeof tag === 'string')) return false;
    if (!data.hiddenHashtags.every((tag: any) => typeof tag === 'string')) return false;

    return true;
  };

  const importSettings = async (imported: ExportedSettings) => {
    // Get current settings directly from localStorage
    const currentPersonalizedHashtags = JSON.parse(localStorage.getItem('spookstr:personalized-hashtags') || '[]');
    const currentHiddenUsers = JSON.parse(localStorage.getItem('spookstr:hidden-users') || '[]');
    const currentHiddenHashtags = JSON.parse(localStorage.getItem('spookstr:hidden-hashtags') || '[]');

    // Merge personalized hashtags (avoid duplicates)
    const mergedPersonalizedHashtags = [
      ...currentPersonalizedHashtags,
      ...imported.personalizedHashtags.filter(
        hashtag => !currentPersonalizedHashtags.some(
          existing => existing.toLowerCase() === hashtag.toLowerCase()
        )
      )
    ];

    // Merge hidden users (avoid duplicates)
    const mergedHiddenUsers = [
      ...currentHiddenUsers,
      ...imported.hiddenUsers.filter(
        pubkey => !currentHiddenUsers.includes(pubkey)
      )
    ];

    // Merge hidden hashtags (avoid duplicates)
    const mergedHiddenHashtags = [
      ...currentHiddenHashtags,
      ...imported.hiddenHashtags.filter(
        hashtag => !currentHiddenHashtags.some(
          existing => existing.toLowerCase() === hashtag.toLowerCase()
        )
      )
    ];

    // Update localStorage directly for batch update
    localStorage.setItem('spookstr:personalized-hashtags', JSON.stringify(mergedPersonalizedHashtags));
    localStorage.setItem('spookstr:hidden-users', JSON.stringify(mergedHiddenUsers));
    localStorage.setItem('spookstr:hidden-hashtags', JSON.stringify(mergedHiddenHashtags));

    // Trigger a page reload to reflect changes
    window.location.reload();
  };

  const handleClearAll = () => {
    const totalCount = personalizedHashtags.length + hiddenUsers.length + hiddenHashtags.length;

    if (totalCount === 0) {
      setError('No settings to clear');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to clear ALL settings?\n\n` +
      `This will remove:\n` +
      `• ${personalizedHashtags.length} personalized hashtags\n` +
      `• ${hiddenUsers.length} hidden users\n` +
      `• ${hiddenHashtags.length} hidden hashtags\n\n` +
      `Total: ${totalCount} items\n\n` +
      `This action cannot be undone.`
    );

    if (confirmed) {
      localStorage.removeItem('spookstr:personalized-hashtags');
      localStorage.removeItem('spookstr:hidden-users');
      localStorage.removeItem('spookstr:hidden-hashtags');
      setSuccess('All settings cleared successfully!');
      setTimeout(() => setSuccess(null), 3000);
      // Force a re-render by triggering a page reload
      window.location.reload();
    }
  };

  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lime-400 flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              Export & Import Settings
            </CardTitle>
            <CardDescription className="text-lime-500/70">
              Backup your preferences to restore them later or transfer to another browser.
            </CardDescription>
          </div>
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-lime-400 hover:bg-lime-500/10 hover:text-lime-300"
            title="Refresh settings"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success/Error Messages */}
        {success && (
          <Alert className="border-lime-500/50 bg-lime-500/10">
            <CheckCircle className="h-4 w-4 text-lime-400" />
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

        {/* Current Settings Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-lime-400">Current Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 border border-lime-500/20 rounded-lg bg-black/20">
              <p className="text-xs text-lime-500/60 mb-1">Personalized Hashtags</p>
              <Badge variant="outline" className="border-lime-500/30 text-lime-400">
                {personalizedHashtags.length}
              </Badge>
            </div>
            <div className="p-3 border border-lime-500/20 rounded-lg bg-black/20">
              <p className="text-xs text-lime-500/60 mb-1">Hidden Users</p>
              <Badge variant="outline" className="border-lime-500/30 text-lime-400">
                {hiddenUsers.length}
              </Badge>
            </div>
            <div className="p-3 border border-lime-500/20 rounded-lg bg-black/20">
              <p className="text-xs text-lime-500/60 mb-1">Hidden Hashtags</p>
              <Badge variant="outline" className="border-lime-500/30 text-lime-400">
                {hiddenHashtags.length}
              </Badge>
            </div>
          </div>
        </div>

        {/* Export Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-lime-400 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Settings
          </h3>
          <p className="text-xs text-lime-500/60">
            Download a backup file containing all your current settings.
          </p>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-lime-500 hover:bg-lime-600 text-black w-full"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Settings
              </>
            )}
          </Button>
        </div>

        {/* Import Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-lime-400 flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Settings
          </h3>
          <p className="text-xs text-lime-500/60">
            Upload a previously exported settings file to restore your preferences.
          </p>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isImporting}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              id="settings-import"
            />
            <Button
              disabled={isImporting}
              className="bg-lime-500 hover:bg-lime-600 text-black w-full"
              asChild
            >
              <label htmlFor="settings-import" className="cursor-pointer">
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4 mr-2" />
                    Choose File to Import
                  </>
                )}
              </label>
            </Button>
          </div>
        </div>

        {/* Clear All Section */}
        <div className="pt-4 border-t border-lime-500/20">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Clear All Settings
            </h3>
            <p className="text-xs text-red-500/60">
              Remove all personalized hashtags, hidden users, and hidden hashtags.
            </p>
            <Button
              onClick={handleClearAll}
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}