import type { AppConfig } from '@/contexts/AppContext';

export interface SettingsExportData {
  version: string;
  timestamp: number;
  app: string;
  config: AppConfig;
  metadata?: {
    theme?: string;
    relayCount?: number;
    hasEncryptedData?: boolean;
    exportDate?: string;
  };
}

export interface SettingsImportResult {
  success: boolean;
  message: string;
  config?: AppConfig;
  warnings?: string[];
}

/**
 * Export settings to a downloadable JSON file
 */
export function exportSettings(config: AppConfig, filename?: string): void {
  try {
    const exportData: SettingsExportData = {
      version: '1.0',
      timestamp: Date.now(),
      app: 'spookstr',
      config,
      metadata: {
        theme: config.theme,
        relayCount: config.relays?.length || 0,
        hasEncryptedData: false, // In a real app, you might check for encrypted fields
        exportDate: new Date().toISOString(),
      },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `spookstr-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
    
    console.log('Settings exported successfully');
  } catch (error) {
    console.error('Error exporting settings:', error);
    throw new Error('Failed to export settings');
  }
}

/**
 * Import settings from a JSON file
 */
export function importSettings(file: File): Promise<SettingsImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const data = JSON.parse(jsonString);
        
        // Validate the imported data structure
        const result = validateImportData(data);
        
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.message));
        }
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Validate imported settings data
 */
function validateImportData(data: any): SettingsImportResult {
  const warnings: string[] = [];

  // Check if it's an object
  if (typeof data !== 'object' || data === null) {
    return {
      success: false,
      message: 'Invalid settings file: not a valid JSON object',
    };
  }

  // Check required fields
  if (!data.version || !data.config) {
    return {
      success: false,
      message: 'Invalid settings file: missing required fields',
    };
  }

  // Check version compatibility
  if (data.version && !data.version.startsWith('1.')) {
    warnings.push(`Settings version ${data.version} may not be compatible with current app version`);
  }

  // Check if it's a Spookstr settings file
  if (data.app && data.app !== 'spookstr') {
    warnings.push(`Settings file is from ${data.app}, not Spookstr. Some features may not work correctly.`);
  }

  // Validate config structure
  if (!validateConfigStructure(data.config)) {
    return {
      success: false,
      message: 'Invalid configuration structure in settings file',
    };
  }

  return {
    success: true,
    message: 'Settings validated successfully',
    config: data.config,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate the configuration structure
 */
function validateConfigStructure(config: any): boolean {
  // Check if config is an object
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  // Check required fields
  const requiredFields = ['theme', 'relayUrl'];
  for (const field of requiredFields) {
    if (!(field in config)) {
      return false;
    }
  }

  // Validate theme
  const validThemes = ['dark', 'light', 'system'];
  if (!validThemes.includes(config.theme)) {
    return false;
  }

  // Validate relayUrl
  if (typeof config.relayUrl !== 'string' || !config.relayUrl.startsWith('wss://')) {
    return false;
  }

  // Validate optional arrays if they exist
  const optionalArrays = ['selectedRelays', 'searchRelays', 'blossomServers'];
  for (const field of optionalArrays) {
    if (config[field] && !Array.isArray(config[field])) {
      return false;
    }
  }

  // Validate relays array if it exists
  if (config.relays && Array.isArray(config.relays)) {
    for (const relay of config.relays) {
      if (!relay.url || !relay.mode) {
        return false;
      }
      const validModes = ['read', 'write', 'both'];
      if (!validModes.includes(relay.mode)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Create a backup of current settings with timestamp
 */
export function createSettingsBackup(config: AppConfig): string {
  const backupData: SettingsExportData = {
    version: '1.0',
    timestamp: Date.now(),
    app: 'spookstr',
    config,
    metadata: {
      theme: config.theme,
      relayCount: config.relays?.length || 0,
      hasEncryptedData: false,
      exportDate: new Date().toISOString(),
    },
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Restore settings from a backup string
 */
export function restoreSettingsFromBackup(backupString: string): SettingsImportResult {
  try {
    const data = JSON.parse(backupString);
    return validateImportData(data);
  } catch (error) {
    return {
      success: false,
      message: 'Invalid backup data',
    };
  }
}