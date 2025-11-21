import { useState } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { useNostrSettings, useSettingsMetadata } from '@/hooks/useNostrSettings';
import { exportSettings, importSettings } from '@/lib/settingsExport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SettingsImportApplier } from '@/components/SettingsImportApplier';
import {
  CloudUpload,
  Download,
  RefreshCw,
  Trash2,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Cloud,
  HardDrive,
  Upload
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function SettingsSyncManager() {
  const { config, updateConfig } = useAppContext();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [showImportApplier, setShowImportApplier] = useState(false);

  const {
    nostrSettings,
    isLoadingNostrSettings,
    nostrSettingsError,
    saveSettingsToNostr,
    isSavingToNostr,
    deleteSettingsFromNostr,
    isDeletingFromNostr,
    hasNostrSettings,
    canUseNostrSettings,
  } = useNostrSettings();

  const { metadata, isLoading: isLoadingMetadata } = useSettingsMetadata();

  const handleExport = () => {
    try {
      exportSettings(config);
      toast({
        title: 'Settings Exported',
        description: 'Your settings have been downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importSettings(file);
      setImportResult(result);

      if (result.success) {
        setImportResult(result);
        setShowImportApplier(true);
        toast({
          title: 'Settings Imported',
          description: 'Settings have been imported successfully. Please review and apply them.',
        });
      } else {
        toast({
          title: 'Import Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: 'Failed to import settings file.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleSaveToNostr = async () => {
    try {
      await saveSettingsToNostr(config);
      toast({
        title: 'Settings Saved to Nostr',
        description: 'Your settings have been securely stored on the Nostr network.',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save settings to Nostr. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteFromNostr = async () => {
    if (!confirm('Are you sure you want to delete your settings from Nostr? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteSettingsFromNostr();
      toast({
        title: 'Settings Deleted from Nostr',
        description: 'Your settings have been removed from the Nostr network.',
      });
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete settings from Nostr.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Sync Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Settings Sync Status
          </CardTitle>
          <CardDescription>
            Manage your settings across devices using Nostr and local backups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nostr Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Nostr Storage</Label>
                <Badge variant={hasNostrSettings ? "default" : "secondary"}>
                  {hasNostrSettings ? "Active" : "Not Set"}
                </Badge>
              </div>
              {hasNostrSettings && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last sync: {formatDate(metadata.lastSync)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {metadata.isEncrypted ? "Encrypted" : "Not Encrypted"}
                  </div>
                </div>
              )}
            </div>

            {/* Local Storage Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Local Storage</Label>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  Settings saved locally
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Always available
                </div>
              </div>
            </div>
          </div>

          {!canUseNostrSettings && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Nostr Login Required</AlertTitle>
              <AlertDescription>
                To use Nostr-based settings sync, please log in with your Nostr account.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Nostr Settings Management */}
      {canUseNostrSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudUpload className="h-5 w-5" />
              Nostr Settings Sync
            </CardTitle>
            <CardDescription>
              Store your settings encrypted on the Nostr network for cross-device synchronization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSaveToNostr}
                disabled={isSavingToNostr || !canUseNostrSettings}
                className="flex items-center gap-2"
              >
                {isSavingToNostr ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="h-4 w-4" />
                )}
                Save to Nostr
              </Button>

              {hasNostrSettings && (
                <Button
                  onClick={handleDeleteFromNostr}
                  disabled={isDeletingFromNostr}
                  variant="outline"
                  className="flex items-center gap-2 text-destructive hover:text-destructive"
                >
                  {isDeletingFromNostr ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete from Nostr
                </Button>
              )}
            </div>

            {isLoadingNostrSettings && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking for Nostr settings...
              </div>
            )}

            {nostrSettingsError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Nostr Sync Error</AlertTitle>
                <AlertDescription>
                  Failed to load settings from Nostr: {nostrSettingsError.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export/Import Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export/Import Settings
          </CardTitle>
          <CardDescription>
            Create local backups of your settings or import settings from another device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Settings
            </Button>

            <div className="flex items-center gap-2">
              <Label htmlFor="import-settings" className="cursor-pointer">
                <Button
                  variant="outline"
                  disabled={isImporting}
                  className="flex items-center gap-2"
                  asChild
                >
                  <span>
                    {isImporting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Import Settings
                  </span>
                </Button>
              </Label>
              <Input
                id="import-settings"
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                disabled={isImporting}
              />
            </div>
          </div>

          {/* Import Result */}
          {importResult && !showImportApplier && (
            <Alert className={importResult.success ? "border-green-200" : "border-red-200"}>
              {importResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {importResult.success ? "Import Successful" : "Import Failed"}
              </AlertTitle>
              <AlertDescription>
                {importResult.message}
                {importResult.warnings && importResult.warnings.length > 0 && (
                  <div className="mt-2">
                    <strong>Warnings:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {importResult.warnings.map((warning: string, index: number) => (
                        <li key={index} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Import Applier */}
          {showImportApplier && importResult && (
            <SettingsImportApplier
              importResult={importResult}
              onApply={() => {
                if (importResult.config) {
                  updateConfig(() => importResult.config);
                  toast({
                    title: 'Settings Applied',
                    description: 'Your settings have been updated successfully.',
                  });
                  setShowImportApplier(false);
                  setImportResult(null);
                }
              }}
              onCancel={() => {
                setShowImportApplier(false);
                setImportResult(null);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Information Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            About Settings Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Nostr Storage (NIP-78):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
              <li>Settings are encrypted and stored on the Nostr network</li>
              <li>Automatically sync across all your logged-in devices</li>
              <li>Requires Nostr login and NIP-44 compatible signer</li>
              <li>Privacy-focused: only you can decrypt your settings</li>
            </ul>

            <p className="pt-2"><strong>Export/Import:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
              <li>Download settings as a JSON file for local backup</li>
              <li>Import settings from another device or backup</li>
              <li>Works offline and doesn't require Nostr login</li>
              <li>Perfect for migration between devices or apps</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}