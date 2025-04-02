import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { ApiKey, ApiKeyProvider } from '../types/apiKey';
import { API_KEY_PROVIDERS } from '../shared/constants';
import { ColDef } from 'ag-grid-community';
import { ApiKeyGenerator } from './ApiKeyGenerator';
import { getUniqueKeyName } from '../shared/defaultKeyNames';
import { invoke } from '@tauri-apps/api/core';
import { Command } from '@tauri-apps/plugin-shell';
import { basename } from '@tauri-apps/api/path';
import { saveFileDialog, generateUniqueKeyFilename } from '../utils/fileUtils';
import { openInBrowser } from '../utils/browserHelper';

interface ApiKeyTableProps {
  keys: ApiKey[];
  onKeysChange: (keys: ApiKey[]) => void;
  theme: 'light' | 'dark';
  currentFileName?: string;
}

export const ApiKeyTable: React.FC<ApiKeyTableProps> = ({
  keys,
  onKeysChange,
  theme,
  currentFileName = 'default.key'
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [textFilter, setTextFilter] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorInitialProvider, setGeneratorInitialProvider] = useState<ApiKeyProvider | undefined>(undefined);
  const [displayFileName, setDisplayFileName] = useState<string>('default.key');
  const gridRef = useRef<any>(null);

  // Extract filename from full path
  useEffect(() => {
    const getFileName = async () => {
      if (currentFileName) {
        try {
          // Check if it's already just a filename without path
          if (!currentFileName.includes('/') && !currentFileName.includes('\\')) {
            setDisplayFileName(currentFileName);
          } else {
            // Extract basename from path
            const filename = await basename(currentFileName);
            setDisplayFileName(filename);
          }
        } catch (error) {
          console.error('Error getting filename:', error);
          setDisplayFileName(currentFileName);
        }
      }
    };
    
    getFileName();
  }, [currentFileName]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  // Filter grid by provider - moved up before it's used
  const filterByProvider = useCallback((provider: string | null) => {
    setActiveFilter(provider);
    
    if (!gridRef.current) return;
    
    const filterInstance = gridRef.current.api.getFilterInstance('provider');
    if (provider) {
      filterInstance.setModel({ 
        type: 'equals', 
        filter: provider 
      });
    } else {
      filterInstance.setModel(null);
    }
    
    gridRef.current.api.onFilterChanged();
  }, []);

  const handleAddKey = useCallback(() => {
    // Get the provider from the active filter or default to 'Other'
    const provider = activeFilter as ApiKeyProvider || 'Other';
    
    // Get a unique default key name for this provider
    const existingNames = keys.map(key => key.name);
    const defaultName = getUniqueKeyName(provider, existingNames);
    
    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      name: defaultName,
      value: '',
      provider: provider,
      dateAdded: new Date().toISOString(),
      description: '',  // Initialize with empty description
    };
    onKeysChange([...keys, newKey]);
    setEditingId(newKey.id);
    
    // Schedule scrolling to the newly added row
    setTimeout(() => {
      if (gridRef.current) {
        // Find the index of the newly added row
        let newRowIndex = -1;
        gridRef.current.api.forEachNode((node: any, index: number) => {
          if (node.data && node.data.id === newKey.id) {
            newRowIndex = index;
            node.setSelected(true);
          }
        });
        
        if (newRowIndex >= 0) {
          gridRef.current.api.ensureIndexVisible(newRowIndex, 'middle');
        }
      }
    }, 100);
  }, [keys, onKeysChange, activeFilter]);

  const handleDeleteKey = useCallback(
    (id: string) => {
      onKeysChange(keys.filter((key) => key.id !== id));
    },
    [keys, onKeysChange]
  );

  const handleValueChange = useCallback(
    async (id: string, field: keyof ApiKey, value: any) => {
      // Update the keys array
      const updatedKeys = keys.map((key) => {
        if (key.id !== id) return key;
        
        // If changing the provider and the name is empty or was a default name for the old provider,
        // set a default name for the new provider
        if (field === 'provider' && (key.name === '' || key.name.startsWith(key.provider))) {
          const newProvider = value as ApiKeyProvider;
          const existingNames = keys.map(k => k.name);
          const defaultName = getUniqueKeyName(newProvider, existingNames);
          return { ...key, [field]: value, name: defaultName };
        }
        
        return { ...key, [field]: value };
      });

      // Update state
      onKeysChange(updatedKeys);

      // Auto-save to current file
      try {
        if (currentFileName) {
          await invoke<boolean>("save_file", {
            filePath: currentFileName,
            content: JSON.stringify(updatedKeys, null, 2)
          });
          console.log('Changes auto-saved');
        }
      } catch (error) {
        console.error('Error auto-saving:', error);
      }
    },
    [keys, onKeysChange, currentFileName]
  );

  // Handler for launching the key generator
  const handleLaunchGenerator = useCallback((provider?: ApiKeyProvider) => {
    setGeneratorInitialProvider(provider);
    setShowGenerator(true);
  }, []);

  // Handler for key generated from generator
  const handleKeyGenerated = useCallback((name: string, value: string, provider: ApiKeyProvider) => {
    // If no name was provided, use a default one
    let keyName = name;
    if (!keyName) {
      const existingNames = keys.map(key => key.name);
      keyName = getUniqueKeyName(provider, existingNames);
    }
    
    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      name: keyName,
      value,
      provider,
      dateAdded: new Date().toISOString(),
      description: '',  // Initialize with empty description
    };
    onKeysChange([...keys, newKey]);
    setShowGenerator(false);
    
    // If there's an active filter but the new key has a different provider,
    // we may need to temporarily change the filter to show the new key
    if (activeFilter && provider !== activeFilter) {
      // Option 1: Change filter to the new key's provider
      filterByProvider(provider);
      
      // Option 2 (alternative): Clear filter to show all keys
      // filterByProvider(null);
    }
    
    // Schedule scrolling to the newly added row
    setTimeout(() => {
      if (gridRef.current) {
        // Find the index of the newly added row
        let newRowIndex = -1;
        gridRef.current.api.forEachNode((node: any, index: number) => {
          if (node.data && node.data.id === newKey.id) {
            newRowIndex = index;
            node.setSelected(true);
          }
        });
        
        if (newRowIndex >= 0) {
          gridRef.current.api.ensureIndexVisible(newRowIndex, 'middle');
        }
      }
    }, 100);
  }, [keys, onKeysChange, activeFilter, filterByProvider]);

  const cellRenderer = (params: any) => {
    const { colDef, data } = params;
    const field = colDef.field;
    const colId = colDef.colId;
    const value = data[field];

    if (field === 'provider') {
      return (
        <select
          className={`w-full p-1 ${
            theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'
          } border rounded`}
          value={value}
          onChange={(e) =>
            handleValueChange(data.id, field, e.target.value as ApiKeyProvider)
          }
        >
          {API_KEY_PROVIDERS.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>
      );
    }

    if (colId === 'actions') {
      return (
        <div className="flex space-x-2">
          <button
            onClick={() => handleSetEnvKey(data.id, data.name, data.value)}
            className={`px-2 py-1 ${
              theme === 'dark' ? 'bg-blue-700' : 'bg-blue-500'
            } text-white rounded text-sm`}
          >
            Set Env
          </button>
        </div>
      );
    }

    if (
      data.id === editingId ||
      (field === 'name' && data.name === '') ||
      (field === 'value' && data.value === '')
    ) {
      return (
        <input
          type="text"
          className={`w-full p-1 ${
            theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'
          } border rounded`}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleValueChange(data.id, field, e.target.value)}
          onBlur={() => setEditingId(null)}
        />
      );
    }

    if (field === 'value') {
      return (
        <div className="flex items-center">
          <span className="truncate">
            {value}
          </span>
        </div>
      );
    }

    if (field === 'name') {
      return (
        <div className="flex items-center">
          <span className="truncate">
            {value}
          </span>
        </div>
      );
    }

    return (
      <div
        className="truncate cursor-pointer"
        onClick={() => setEditingId(data.id)}
      >
        {value}
      </div>
    );
  };

  const columnDefs = useMemo<ColDef<ApiKey>[]>(
    () => [
      { 
        headerName: '#', 
        width: 55, 
        valueGetter: (params) => params.node?.rowIndex ? params.node.rowIndex + 1 : 1,
        editable: false,
        sortable: false,
        filter: false,
      },
      { 
        field: 'name', 
        headerName: 'Name', 
        flex: 1, 
        cellRenderer,
        editable: true,
      },
      { 
        field: 'value', 
        headerName: 'API Key', 
        flex: 2, 
        cellRenderer,
        editable: true,
      },
      { 
        field: 'provider', 
        headerName: 'Provider', 
        flex: 1, 
        cellRenderer,
        editable: true,
      },
      {
        field: 'dateAdded',
        headerName: 'Date Added',
        flex: 1,
        valueFormatter: (params: any) =>
          new Date(params.value).toLocaleDateString(),
        editable: true,
        hide: true,
      },
      { 
        field: 'description', 
        headerName: 'Notes', 
        flex: 0.8,
        cellRenderer: (params: any) => {
          const value = params.value || '';
          if (params.data.id === editingId) {
            return (
              <textarea
                className={`w-full p-1 ${
                  theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'
                } border rounded`}
                value={value}
                onChange={(e) => handleValueChange(params.data.id, 'description', e.target.value)}
                onBlur={() => setEditingId(null)}
                rows={2}
                placeholder=""
              />
            );
          }
          return (
            <div
              className="cursor-pointer min-h-[40px] whitespace-pre-wrap"
              onClick={() => setEditingId(params.data.id)}
            >
              {value}
            </div>
          );
        },
        editable: true,
      },
      { 
        headerName: 'Actions', 
        width: 100, 
        cellRenderer,
        colId: 'actions',
        editable: false,
      } as unknown as ColDef<ApiKey>,
    ],
    [cellRenderer]
  );

  // Handle selection changes
  const onSelectionChanged = useCallback(() => {
    if (!gridRef.current) return;
    const selectedRows = gridRef.current.api.getSelectedRows();
    setSelectedCount(selectedRows.length);
  }, []);

  // Handle bulk copy of selected rows
  const handleBulkCopy = useCallback(() => {
    if (!gridRef.current) return;
    const selectedRows = gridRef.current.api.getSelectedRows();
    
    if (selectedRows.length === 0) return;
    
    // Format keys for copying
    const copyText = selectedRows
      .map((row: ApiKey) => `${row.name}=${row.value}`)
      .join('\n');
      
    navigator.clipboard.writeText(copyText).then(() => {
      setCopiedId('bulk');
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  // Handle bulk delete of selected rows
  const handleBulkDelete = useCallback(() => {
    if (!gridRef.current) return;
    const selectedRows = gridRef.current.api.getSelectedRows();
    
    if (selectedRows.length === 0) return;
    
    const selectedIds = selectedRows.map((row: ApiKey) => row.id);
    onKeysChange(keys.filter(key => !selectedIds.includes(key.id)));
  }, [keys, onKeysChange]);

  // Handle bulk export of selected rows
  const handleBulkExport = useCallback(() => {
    if (!gridRef.current) return;
    const selectedRows = gridRef.current.api.getSelectedRows();
    
    if (selectedRows.length === 0) return;
    
    // Create .env format for download
    const envContent = selectedRows
      .map((row: ApiKey) => `${row.name}=${row.value}`)
      .join('\n');

    // Create a download link
    const blob = new Blob([envContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api_keys_export_${new Date().toISOString().split('T')[0]}.env`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Add text filter handler
  const handleTextFilter = useCallback((value: string) => {
    setTextFilter(value);
    if (!gridRef.current) return;
    
    const filterInstance = gridRef.current.api.getFilterInstance('name');
    if (value) {
      filterInstance.setModel({ 
        type: 'contains', 
        filter: value 
      });
    } else {
      filterInstance.setModel(null);
    }
    
    gridRef.current.api.onFilterChanged();
  }, []);

  // Handle setting a key as environment variable by directly using a custom Rust command
  const handleSetEnvKey = useCallback(
    async (id: string, name: string, value: string) => {
      try {
        // Determine platform-specific command
        const isWindows = navigator.platform.toLowerCase().includes('win');
        
        if (isWindows) {
          // Use our custom Rust command that calls setx internally
          const result = await invoke('set_env_var', { name, value });
          console.log('Set env result:', result);
        } else {
          // Linux/macOS - write to .bashrc or .zshrc
          const bashCommand = `echo 'export ${name}="${value}"' >> ~/.bashrc && source ~/.bashrc`;
          
          // Execute bash command
          await Command.create('run-bash', [
            '-c', 
            bashCommand
          ]).execute();
        }
        
        // Update lastUsed timestamp
        onKeysChange(
          keys.map((key) => {
            if (key.id !== id) return key;
            return { ...key, lastUsed: new Date().toISOString() };
          })
        );
        
        alert(`Environment variable "${name}" has been set permanently!`);
      } catch (error: any) {
        console.error('Error setting environment variable:', error);
        alert(`Failed to set environment variable: ${error.message || error}`);
      }
    },
    [keys, onKeysChange]
  );

  // Handle saving the file with a custom Rust command
  const handleSaveAs = useCallback(async () => {
    if (!currentFileName) return;
    
    try {
      const content = JSON.stringify(keys, null, 2);
      // Get the directory of the current file
      const currentDir = currentFileName.substring(0, currentFileName.lastIndexOf('\\'));
      const success = await saveFileDialog(content, currentDir);
      
      if (success) {
        // alert('File saved successfully');
      } else {
        // alert('Failed to save file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      alert(`Failed to save file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [keys, currentFileName]);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex flex-wrap justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={handleAddKey}
            className={`px-4 py-2 ${
              theme === 'dark' ? 'bg-green-600' : 'bg-green-500'
            } text-white rounded hover:opacity-90`}
          >
            Add New Key
          </button>
          <button
            onClick={() => handleLaunchGenerator()}
            className={`px-4 py-2 ${
              theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
            } text-white rounded hover:opacity-90 flex items-center`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            Generate Key
          </button>
        </div>
      </div>

      <div className={`mb-4 p-3 rounded flex items-center justify-between ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
      }`}>
        <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleBulkCopy}
            disabled={selectedCount === 0}
            className={`px-3 py-1 rounded ${
              selectedCount === 0
                ? theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                : theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
            } text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Copy selected keys"
          >
            {copiedId === 'bulk' ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleBulkExport}
            disabled={selectedCount === 0}
            className={`px-3 py-1 rounded ${
              selectedCount === 0
                ? theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                : theme === 'dark' ? 'bg-green-600' : 'bg-green-500'
            } text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Export selected keys"
          >
            Export
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={selectedCount === 0}
            className={`px-3 py-1 rounded ${
              selectedCount === 0
                ? theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                : theme === 'dark' ? 'bg-red-600' : 'bg-red-500'
            } text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Delete selected keys"
          >
            Delete
          </button>
        </div>
      </div>

      <div
        className={`flex-1 min-h-[300px] ${
          theme === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'
        }`}
        style={{ width: '100%' }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={keys}
          columnDefs={columnDefs}
          rowHeight={40}
          domLayout="normal"
          animateRows={true}
          pagination={true}
          paginationPageSize={100}
          rowSelection="multiple"
          onSelectionChanged={onSelectionChanged}
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
            editable: true,
          }}
        />
      </div>
      
      <div className={`mt-4 flex flex-col gap-2 ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
      } sticky bottom-0 bg-inherit pt-2`}>
        <div className="flex items-center justify-center space-x-2">
          <span className="text-xs">Filter:</span>
          <input
            type="text"
            placeholder="Search by name..."
            value={textFilter}
            onChange={(e) => handleTextFilter(e.target.value)}
            className={`px-2 py-0.5 text-xs rounded w-32 ${
              theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'
            } border ${
              theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
            } focus:outline-none focus:ring-1 ${
              theme === 'dark' ? 'focus:ring-indigo-500' : 'focus:ring-indigo-400'
            }`}
          />
          {API_KEY_PROVIDERS.map(provider => (
            <button 
              key={provider}
              onClick={() => filterByProvider(activeFilter === provider ? null : provider)}
              className={`px-2 py-0.5 text-xs rounded ${
                activeFilter === provider 
                  ? theme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white'
                  : theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'
              } hover:opacity-90`}
            >
              {provider}
            </button>
          ))}
          <button
            onClick={() => {
              filterByProvider(null);
              handleTextFilter('');
            }}
            className={`px-2 py-0.5 text-xs rounded ${
              activeFilter || textFilter
                ? theme === 'dark' ? 'bg-red-600' : 'bg-red-500'
                : theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'
            } text-white hover:opacity-90`}
          >
            Clear Filter
          </button>
        </div>
        
        <div className="text-xs flex items-center justify-center space-x-4">
          <span>Current file: <button 
            onClick={handleSaveAs}
            className="font-mono overflow-hidden text-ellipsis inline-block max-w-[280px] text-blue-500 hover:text-blue-700 hover:underline focus:outline-none" 
            title={currentFileName}
          >
            {displayFileName}
          </button></span>
          <span>•</span>
          <span>Ctrl/Shift + Click for multiple selection</span>
          <span>•</span>
          <span>Headers sort</span>
          <span>•</span>
          <span>Changes saved automatically</span>
        </div>
      </div>

      {/* API Key Generator Modal */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <ApiKeyGenerator
            theme={theme}
            onKeyGenerated={handleKeyGenerated}
            initialProvider={generatorInitialProvider}
            onClose={() => setShowGenerator(false)}
          />
        </div>
      )}
    </div>
  );
}; 