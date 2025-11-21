import { useState } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertCircle,
  Download,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import type { AppConfig } from '@/contexts/AppContext';

interface SettingsImportApplierProps {
  importResult: {
    success: boolean;
    message: string;
    config?: AppConfig;
    warnings?: string[];
  };
  onApply: () => void;
  onCancel: () => void;
}

export function SettingsImportApplier({
  importResult,
  onApply,
  onCancel
}: SettingsImportApplierProps) {
  const { config: currentConfig } = useAppContext();
  const [showDetails, setShowDetails] = useState(false);

  if (!importResult.success || !importResult.config) {
    return null;
  }

  const newConfig = importResult.config;
  const differences = getConfigDifferences(currentConfig, newConfig);

  const handleApply = () => {
    // In a real implementation, you would update the config here
    // For now, we'll just call the onApply callback
    onApply();
  };

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          Settings Ready to Apply
        </CardTitle>
        <CardDescription>
          Review the changes that will be applied to your settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{differences.total}</div>
            <div className="text-sm text-muted-foreground">Total Changes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{differences.added}</div>
            <div className="text-sm text-muted-foreground">New Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{differences.modified}</div>
            <div className="text-sm text-muted-foreground">Modified</div>
          </div>
        </div>

        {/* Key Changes Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Key Changes:</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1"
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>

          <div className="space-y-1">
            {differences.keyChanges.slice(0, 3).map((change, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Badge variant={change.type === 'modified' ? 'secondary' : 'default'}>
                  {change.type}
                </Badge>
                <span>{change.field}</span>
              </div>
            ))}
            {differences.keyChanges.length > 3 && (
              <div className="text-sm text-muted-foreground">
                ... and {differences.keyChanges.length - 3} more changes
              </div>
            )}
          </div>
        </div>

        {/* Detailed Changes */}
        {showDetails && (
          <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
            <h5 className="font-medium">Detailed Changes:</h5>
            <div className="space-y-2 text-sm">
              {differences.keyChanges.map((change, index) => (
                <div key={index} className="border-l-2 border-muted-foreground/20 pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={change.type === 'modified' ? 'secondary' : 'default'}>
                      {change.type}
                    </Badge>
                    <span className="font-medium">{change.field}</span>
                  </div>
                  {change.type === 'modified' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Current:</div>
                        <div className="font-mono bg-background px-1 rounded">
                          {String(change.oldValue).substring(0, 50)}
                          {String(change.oldValue).length > 50 && '...'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">New:</div>
                        <div className="font-mono bg-background px-1 rounded">
                          {String(change.newValue).substring(0, 50)}
                          {String(change.newValue).length > 50 && '...'}
                        </div>
                      </div>
                    </div>
                  )}
                  {change.type === 'added' && (
                    <div className="text-xs">
                      <div className="text-muted-foreground">Value:</div>
                      <div className="font-mono bg-background px-1 rounded">
                        {String(change.newValue).substring(0, 50)}
                        {String(change.newValue).length > 50 && '...'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {importResult.warnings && importResult.warnings.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Import Warnings</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-1">
                {importResult.warnings.map((warning, index) => (
                  <li key={index} className="text-sm">{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleApply} className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Apply Settings
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ConfigDifference {
  total: number;
  added: number;
  modified: number;
  keyChanges: Array<{
    type: 'added' | 'modified';
    field: string;
    oldValue?: any;
    newValue?: any;
  }>;
}

function getConfigDifferences(current: AppConfig, imported: AppConfig): ConfigDifference {
  const keyChanges: ConfigDifference['keyChanges'] = [];
  let added = 0;
  let modified = 0;

  // Helper function to compare values
  const valuesEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a === 'object') {
      if (Array.isArray(a) && Array.isArray(b)) {
        // Special handling for arrays - compare sorted versions
        const aSorted = [...a].sort();
        const bSorted = [...b].sort();
        return JSON.stringify(aSorted) === JSON.stringify(bSorted);
      }
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return String(a) === String(b);
  };

  // Compare all top-level fields
  const allFields = new Set([
    ...Object.keys(current),
    ...Object.keys(imported)
  ]);

  allFields.forEach(field => {
    const currentValue = (current as any)[field];
    const importedValue = (imported as any)[field];

    if (!(field in current)) {
      // Added field
      keyChanges.push({
        type: 'added',
        field,
        newValue: importedValue
      });
      added++;
    } else if (!(field in imported)) {
      // Removed field (treat as modification)
      keyChanges.push({
        type: 'modified',
        field,
        oldValue: currentValue,
        newValue: undefined
      });
      modified++;
    } else if (!valuesEqual(currentValue, importedValue)) {
      // Modified field
      keyChanges.push({
        type: 'modified',
        field,
        oldValue: currentValue,
        newValue: importedValue
      });
      modified++;
    }
  });

  return {
    total: keyChanges.length,
    added,
    modified,
    keyChanges
  };
}