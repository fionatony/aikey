import React, { useState, useCallback, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material';
import { ApiKey } from './types/apiKey';
import { ApiKeyTable } from './components/ApiKeyTable';
import { ImportPreviewDialog } from './components/ImportPreviewDialog';
import { useTheme } from './hooks/useTheme';
import {
  openFileDialog,
  readFile,
  detectFileFormat,
  parseEnvFile,
  parseJsonFile,
  parseCsvFile,
  parseTxtFile,
  saveFileDialog,
  formatApiKeysForExport,
  fileFormats,
  loadFromDefaultKeyFile,
  loadFromKeyFile,
  saveToKeyFile,
  getDefaultKeyFilePath,
  generateUniqueKeyFilename,
} from './utils/fileUtils';
import { Command } from '@tauri-apps/plugin-shell';
import { invoke } from '@tauri-apps/api/core';
import { basename, appLocalDataDir, join } from '@tauri-apps/api/path';
import { save, open } from '@tauri-apps/plugin-dialog';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';

export const App: React.FC = () => {
  const { mode, toggleTheme } = useTheme();
  
  const theme = createTheme({
    palette: {
      mode,
    },
  });

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [currentKeyFile, setCurrentKeyFile] = useState<string | null>(null);
  const [currentKeyFilename, setCurrentKeyFilename] = useState<string>("default.key");
  const [importPreview, setImportPreview] = useState<{
    keys: ApiKey[];
    conflicts: ApiKey[];
    format: string;
  }>({
    keys: [],
    conflicts: [],
    format: '',
  });
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Clear localStorage on app start
  useEffect(() => {
    const clearOldStorage = () => {
      try {
        // Clear the old localStorage data
        localStorage.removeItem('aikeys');
        console.log('Cleared old localStorage data');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    };
    clearOldStorage();
  }, []);

  // Load keys from the default key file on startup
  useEffect(() => {
    const loadKeys = async () => {
      try {
        // Try to load from default.key file first
        const defaultKeys = await loadFromDefaultKeyFile();
        
        if (defaultKeys.length > 0) {
          setKeys(defaultKeys);
          const defaultPath = await getDefaultKeyFilePath();
          setCurrentKeyFile(defaultPath);
          setCurrentKeyFilename("default.key");
          console.log("Loaded keys from default file:", defaultPath);
        } else {
          // Fall back to localStorage if default.key doesn't exist yet
          const savedKeys = localStorage.getItem('aikeys');
          if (savedKeys) {
            try {
              const parsedKeys = JSON.parse(savedKeys);
              setKeys(parsedKeys);
              
              // Save the keys from localStorage to the default.key file
              const defaultPath = await getDefaultKeyFilePath();
              await saveToKeyFile(parsedKeys, defaultPath);
              setCurrentKeyFile(defaultPath);
              setCurrentKeyFilename("default.key");
              console.log("Migrated keys from localStorage to default file:", defaultPath);
            } catch (error) {
              console.error('Error loading saved keys:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error loading keys:', error);
      }
    };
    
    loadKeys();
  }, []);

  // Update the filename whenever the currentKeyFile changes
  useEffect(() => {
    if (currentKeyFile) {
      const updateFilename = async () => {
        try {
          const filename = await basename(currentKeyFile);
          setCurrentKeyFilename(filename);
        } catch (error) {
          console.error('Error getting filename:', error);
        }
      };
      updateFilename();
    }
  }, [currentKeyFile]);

  // Save keys to the current key file when they change
  useEffect(() => {
    const saveKeys = async () => {
      if (keys.length > 0) {
        if (currentKeyFile) {
          // Save to the currently open key file
          await saveToKeyFile(keys, currentKeyFile);
          console.log("Saved keys to current file:", currentKeyFile);
        } else {
          // Save to the default key file
          const defaultPath = await getDefaultKeyFilePath();
          await saveToKeyFile(keys, defaultPath);
          setCurrentKeyFile(defaultPath);
          setCurrentKeyFilename("default.key");
          console.log("Saved keys to default file:", defaultPath);
        }
      }
    };
    
    if (keys.length > 0) {
      saveKeys();
    }
  }, [keys]);

  const handleImport = useCallback(async () => {
    const filePaths = await openFileDialog();
    if (filePaths.length === 0) return;

    const filePath = filePaths[0];
    const content = await readFile(filePath);
    const format = detectFileFormat(filePath);

    if (!format) {
      alert('Unsupported file format');
      return;
    }

    let parsedKeys: ApiKey[];
    switch (format.extension) {
      case '.json':
        parsedKeys = parseJsonFile(content);
        break;
      case '.csv':
        parsedKeys = parseCsvFile(content);
        break;
      case '.txt':
        parsedKeys = parseTxtFile(content);
        break;
      case '.key':
          parsedKeys = parseJsonFile(content);
        break;
      case '*': // Handle "Any File" format
        parsedKeys = parseEnvFile(content);
        break;
      default:
        parsedKeys = parseEnvFile(content);
    }

    // Check for conflicts (keys with same name)
    const conflicts = parsedKeys.filter((newKey) =>
      keys.some((existingKey) => existingKey.name === newKey.name)
    );

    setImportPreview({
      keys: parsedKeys,
      conflicts,
      format: format.name,
    });
    setImportDialogOpen(true);
  }, [keys]);

  const handleOpenKeyFile = useCallback(async () => {
    try {
      // Get the application's local data directory
      const appDir = await appLocalDataDir();

      // Configure file filters
      const filters = [{ name: "Key Files", extensions: ["key"] }];

      // Open file dialog with default directory
      const selected = await open({
        directory: false,
        multiple: false,
        defaultPath: appDir,
        filters
      });

      if (!selected) return;

      const filePath = Array.isArray(selected) ? selected[0] : selected;
      
      // Verify it's a .key file
      if (!filePath.toLowerCase().endsWith('.key')) {
        alert('Only .key files are supported. Please select a valid .key file.');
        return;
      }
      
      // Try to load the key file
      const loadedKeys = await loadFromKeyFile(filePath);
      
      if (loadedKeys.length === 0) {
        alert('No valid keys found in the selected file or the file format is invalid.');
        return;
      }
      
      // Set the loaded keys and update the current key file path
      setKeys(loadedKeys);
      setCurrentKeyFile(filePath);
      const filename = await basename(filePath);
      setCurrentKeyFilename(filename);
      
    } catch (error) {
      console.error('Error opening key file:', error);
      alert(`Failed to open key file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  const handleSaveAs = useCallback(async () => {
    if (keys.length === 0) {
      alert('No keys to save');
      return;
    }

    try {
      // Get the application's local data directory
      const appDir = await appLocalDataDir();

      // Prepare a default filename that's different from the current one
      const suggestedName = currentKeyFilename === "default.key" 
        ? "my_keys.key" 
        : `copy_of_${currentKeyFilename}`;

      // Prepare content
      const content = JSON.stringify(keys, null, 2);
      
      // Open save dialog with filters for .key files and default directory
      const filters = [
        { name: "Key Files", extensions: ["key"] }
      ];

      const filePath = await save({
        filters,
        defaultPath: await join(appDir, suggestedName)
      });

      if (filePath) {
        // Save the file
        const success = await invoke<boolean>("save_file", { 
          filePath, 
          content 
        });

        if (success) {
          // Update current file path
          setCurrentKeyFile(filePath);
          const filename = await basename(filePath);
          setCurrentKeyFilename(filename);
          alert(`File saved successfully as: ${filename}`);
        } else {
          alert('Failed to save file');
        }
      }
    } catch (error) {
      console.error('Error saving file:', error);
      alert(`Failed to save file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [keys, currentKeyFilename]);

  const handleImportConfirm = useCallback((importedKeys: ApiKey[]) => {
    setKeys((prevKeys) => [...prevKeys, ...importedKeys]);
  }, []);

  // Handle importing environment variables
  const handleImportEnv = useCallback(async () => {
    
    try {
      const commandResult = await Command.create('read-env').execute();
      if (commandResult.code !== 0) {
        throw new Error(commandResult.stderr);
      }

      // Parse the environment variables
      const envLines = commandResult.stdout.split('\n');
      const parsedKeys: ApiKey[] = [];

      envLines.forEach(line => {
        const [name, ...valueParts] = line.split('=');
        const value = valueParts.join('='); // Rejoin in case value contains '='
        
        if (name && value) {
          // Skip system variables that might be too long or contain sensitive data
          if (name.length > 50 || value.length > 500) return;
          
          parsedKeys.push({
            id: crypto.randomUUID(),
            name: name.trim(),
            value: value.trim(),
            provider: 'Other',
            dateAdded: new Date().toISOString(),
            description: 'Imported from system environment'
          });
        }
      });

      if (parsedKeys.length === 0) {
        alert('No environment variables found to import.');
        return;
      }

      // Check for conflicts (keys with same name)
      const conflicts = parsedKeys.filter((newKey) =>
        keys.some((existingKey) => existingKey.name === newKey.name)
      );

      setImportPreview({
        keys: parsedKeys,
        conflicts,
        format: 'System Environment',
      });
      setImportDialogOpen(true);
    } catch (error: any) {
      console.error('Error importing environment variables:', error);
      alert(`Failed to import environment variables: ${error.message || error}`);
    }
  }, [keys]);

  const handleExport = useCallback(async () => {
    if (keys.length === 0) {
      alert('No keys to export');
      return;
    }

    const format = fileFormats[0]; // Default to .key format
    const content = formatApiKeysForExport(keys, format);
    await saveFileDialog(content);
  }, [keys]);

  const handleNewFile = useCallback(async () => {
    try {
      // Save current file first if there are keys
      if (keys.length > 0 && currentKeyFile) {
        await saveToKeyFile(keys, currentKeyFile);
      }

      // Get the application's local data directory
      const appDir = await appLocalDataDir();
      
      // Generate a unique filename in the app directory
      const newFilePath = await generateUniqueKeyFilename(appDir);
      
      // Create an empty key file with an empty array
      const content = JSON.stringify([], null, 2);
      const success = await invoke<boolean>("save_file", { 
        filePath: newFilePath, 
        content 
      });
      
      if (success) {
        // Update current file path
        setCurrentKeyFile(newFilePath);
        const filename = await basename(newFilePath);
        setCurrentKeyFilename(filename);
        // Clear the keys array
        setKeys([]);
        alert(`New file created: ${filename}`);
      } else {
        alert('Failed to create new file');
      }
    } catch (error) {
      console.error('Error creating new file:', error);
      alert(`Failed to create new file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [keys, currentKeyFile]);

  return (
    <ThemeProvider theme={theme}>
      <div className={`h-screen w-full ${mode === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100'} p-4 transition-colors duration-200 overflow-hidden`}>
        <div className="h-full w-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">AI Key</h1>
            <div className="space-x-2 flex items-center">
              <button
                onClick={toggleTheme}
                className={`px-2 py-1 text-sm rounded-full ${mode === 'dark' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-white'} hover:opacity-90`}
                title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
              >
                {mode === 'light' ? '🌙' : '☀️'}
              </button>
              <button
                onClick={handleNewFile}
                className={`px-3 py-1 text-sm ${mode === 'dark' ? 'bg-purple-600' : 'bg-purple-500'} text-white rounded hover:opacity-90 flex items-center`}
                title="Create a new .key file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                New
              </button>
              <button
                onClick={handleOpenKeyFile}
                className={`px-3 py-1 text-sm ${mode === 'dark' ? 'bg-indigo-600' : 'bg-indigo-500'} text-white rounded hover:opacity-90 flex items-center`}
                title="Open a .key file"
              >
                <FolderOpenIcon className="h-3 w-3 mr-1" />
                Open
              </button>
              <button
                onClick={handleSaveAs}
                className={`px-3 py-1 text-sm ${mode === 'dark' ? 'bg-amber-600' : 'bg-amber-500'} text-white rounded hover:opacity-90 flex items-center`}
                title="Save as a new .key file"
              >
                <SaveIcon className="h-3 w-3 mr-1" />
                Save As
              </button>
              <button
                onClick={handleImport}
                className={`px-3 py-1 text-sm ${mode === 'dark' ? 'bg-green-600' : 'bg-green-500'} text-white rounded hover:opacity-90`}
              >
                Import
              </button>
              <button
                onClick={handleImportEnv}
                className={`px-3 py-1 text-sm ${mode === 'dark' ? 'bg-purple-600' : 'bg-purple-500'} text-white rounded hover:opacity-90 flex items-center`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Import Env
              </button>
              <button
                onClick={handleExport}
                className={`px-3 py-1 text-sm ${mode === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} text-white rounded hover:opacity-90`}
              >
                Export
              </button>
            </div>
          </div>
          <div className={`${mode === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 flex-1 overflow-hidden`}>
            <ApiKeyTable keys={keys} onKeysChange={setKeys} theme={mode} currentFileName={currentKeyFile || currentKeyFilename} />
       
          </div>
        </div>
        <ImportPreviewDialog
          open={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          onImport={handleImportConfirm}
          preview={importPreview}
          theme={mode}
        />
      </div>
    </ThemeProvider>
  );
};
