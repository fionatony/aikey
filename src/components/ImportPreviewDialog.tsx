import React, { useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { ApiKey } from '../types/apiKey';

interface ImportPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (keys: ApiKey[]) => void;
  preview: {
    keys: ApiKey[];
    conflicts: ApiKey[];
    format: string;
  };
  theme: 'light' | 'dark';
}

export const ImportPreviewDialog: React.FC<ImportPreviewDialogProps> = ({
  open,
  onClose,
  onImport,
  preview,
  theme,
}) => {
  const [skipConflicts, setSkipConflicts] = useState(true);

  const handleImport = useCallback(() => {
    const keysToImport = skipConflicts
      ? preview.keys.filter(
          (key) => !preview.conflicts.some((conflict) => conflict.name === key.name)
        )
      : preview.keys;
    
    onImport(keysToImport);
    onClose();
  }, [skipConflicts, preview, onImport, onClose]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: theme === 'dark' ? '#1f2937' : 'white',
          color: theme === 'dark' ? 'white' : 'inherit',
        },
      }}
    >
      <DialogTitle>Import Preview - {preview.format}</DialogTitle>
      <DialogContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Found {preview.keys.length} keys</h3>
            {preview.conflicts.length > 0 && (
              <p className={`text-sm ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'}`}>
                Warning: {preview.conflicts.length} keys with conflicting names were found
              </p>
            )}
          </div>
          
          <div className={`rounded p-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div className="grid grid-cols-2 gap-2 font-semibold mb-2">
              <div>Name</div>
              <div>Value (Preview)</div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {preview.keys.map((key) => {
                const hasConflict = preview.conflicts.some((c) => c.name === key.name);
                return (
                  <div 
                    key={key.id} 
                    className={`grid grid-cols-2 gap-2 p-1 rounded ${
                      hasConflict 
                        ? theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-100' 
                        : ''
                    }`}
                  >
                    <div className="truncate">{key.name}</div>
                    <div className="truncate">
                      {key.value ? key.value.substring(0, 20) + (key.value.length > 20 ? '...' : '') : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {preview.conflicts.length > 0 && (
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="skipConflicts"
                checked={skipConflicts}
                onChange={(e) => setSkipConflicts(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="skipConflicts">
                Skip keys with conflicting names
              </label>
            </div>
          )}
        </div>
      </DialogContent>
      <DialogActions style={{ padding: '16px' }}>
        <Button 
          onClick={onClose}
          style={{ 
            backgroundColor: theme === 'dark' ? '#4b5563' : '#e5e7eb',
            color: theme === 'dark' ? 'white' : 'black',
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleImport}
          style={{ 
            backgroundColor: theme === 'dark' ? '#1e40af' : '#3b82f6',
            color: 'white',
          }}
          variant="contained"
        >
          Import {skipConflicts && preview.conflicts.length > 0 
            ? `(${preview.keys.length - preview.conflicts.length} keys)` 
            : `(${preview.keys.length} keys)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 