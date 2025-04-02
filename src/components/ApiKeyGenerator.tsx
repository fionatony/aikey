import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ApiKeyProvider } from '../types/apiKey';
import { ClipboardMonitorStatus } from '../types/apiKeyGeneration';
import { API_KEY_PROVIDER_INFO } from '../shared/apiKeyProviders';
import { ClipboardMonitor } from '../utils/clipboardMonitor';
import { openInBrowser } from '../utils/browserHelper';
import { getUniqueKeyName } from '../shared/defaultKeyNames';

interface ApiKeyGeneratorProps {
  theme: 'light' | 'dark';
  onKeyGenerated: (name: string, value: string, provider: ApiKeyProvider) => void;
  initialProvider?: ApiKeyProvider;
  onClose: () => void;
}

export const ApiKeyGenerator: React.FC<ApiKeyGeneratorProps> = ({
  theme,
  onKeyGenerated,
  initialProvider = 'OpenAI',
  onClose,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<ApiKeyProvider>(initialProvider);
  const [monitorStatus, setMonitorStatus] = useState<ClipboardMonitorStatus>('idle');
  const [keyName, setKeyName] = useState<string>('');
  const [detectedKey, setDetectedKey] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const clipboardMonitor = useRef<ClipboardMonitor | null>(null);
  
  // Set default key name when provider changes
  useEffect(() => {
    if (keyName === '' || keyName.startsWith(selectedProvider) || keyName.includes('API_KEY')) {
      setKeyName(getUniqueKeyName(selectedProvider));
    }
  }, [selectedProvider, keyName]);
  
  // Initialize with default key name
  useEffect(() => {
    setKeyName(getUniqueKeyName(initialProvider));
  }, [initialProvider]);
  
  // Initialize clipboard monitor
  useEffect(() => {
    clipboardMonitor.current = new ClipboardMonitor();
    
    // Cleanup on unmount
    return () => {
      if (clipboardMonitor.current) {
        clipboardMonitor.current.stop();
      }
    };
  }, []);
  
  // Handle key detection from clipboard
  const handleKeyDetected = useCallback((text: string, provider: ApiKeyProvider) => {
    setDetectedKey(text);
    setMonitorStatus('detected');
    
    // If provider matches or we're monitoring any provider, suggest a name
    if (provider === selectedProvider || selectedProvider === 'Other') {
      // Suggest a name based on provider if none entered
      if (!keyName) {
        const date = new Date().toLocaleDateString().replace(/\//g, '-');
        setKeyName(`${provider} Key ${date}`);
      }
    }
  }, [keyName, selectedProvider]);
  
  // Start monitoring clipboard
  const startMonitoring = useCallback(() => {
    if (clipboardMonitor.current) {
      // Generate a unique session ID
      // const sessionId = crypto.randomUUID(); // Remove unused variable
      
      // Clear any previously detected key
      setDetectedKey('');
      setMonitorStatus('monitoring');
      
      // Start monitoring with the selected provider filter
      clipboardMonitor.current.start(
        selectedProvider === 'Other' ? null : selectedProvider,
        handleKeyDetected
      );
    }
  }, [selectedProvider, handleKeyDetected]);
  
  // Stop monitoring clipboard
  const stopMonitoring = useCallback(() => {
    if (clipboardMonitor.current) {
      clipboardMonitor.current.stop();
      setMonitorStatus('idle');
    }
  }, []);
  
  // Handle opening the provider's key generation page
  const handleGenerateKey = useCallback(() => {
    const providerInfo = API_KEY_PROVIDER_INFO[selectedProvider];
    
    if (providerInfo && providerInfo.generateUrl) {
      // Start clipboard monitoring
      startMonitoring();
      
      // Open the generation URL in the default browser
      openInBrowser(providerInfo.generateUrl).catch(error => {
        console.error('Failed to open browser:', error);
        stopMonitoring();
      });
    }
  }, [selectedProvider, startMonitoring, stopMonitoring]);
  
  // Save the detected key
  const handleSaveKey = useCallback(() => {
    if (detectedKey && selectedProvider) {
      // Use the entered name or generate a default one
      const finalKeyName = keyName || `${selectedProvider} Key`;
      
      // Call the parent component's callback with the new key
      onKeyGenerated(finalKeyName, detectedKey, selectedProvider);
      
      // Reset the component state
      setDetectedKey('');
      setKeyName('');
      setMonitorStatus('idle');
      stopMonitoring();
      
      // Close the generator
      onClose();
    }
  }, [detectedKey, keyName, selectedProvider, onKeyGenerated, stopMonitoring, onClose]);
  
  // Cancel key generation
  const handleCancel = useCallback(() => {
    stopMonitoring();
    onClose();
  }, [stopMonitoring, onClose]);
  
  // Get the instructions for the selected provider
  const providerInfo = API_KEY_PROVIDER_INFO[selectedProvider];
  const instructions = providerInfo ? providerInfo.instructions : [];
  
  // Navigate through steps
  const nextStep = () => {
    if (currentStep < instructions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  return (
    <div className={`${
      theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
    } rounded-lg shadow-lg p-6 max-w-2xl mx-auto`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Generate API Key</h2>
        <button
          onClick={handleCancel}
          className={`p-2 rounded-full ${
            theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-12 gap-4">
        {/* Left panel - Provider selection and controls */}
        <div className="col-span-4 border-r pr-4">
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Select Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as ApiKeyProvider)}
              className={`w-full p-2 rounded border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-blue-500 focus:border-blue-500`}
              disabled={monitorStatus !== 'idle'}
            >
              {Object.keys(API_KEY_PROVIDER_INFO).map((provider) => (
                <option key={provider} value={provider}>
                  {API_KEY_PROVIDER_INFO[provider as ApiKeyProvider].name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Key Name (Optional)</label>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="My API Key"
              className={`w-full p-2 rounded border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
          
          <div className="flex flex-col space-y-3">
            <button
              onClick={handleGenerateKey}
              disabled={monitorStatus !== 'idle'}
              className={`py-2 px-4 rounded ${
                monitorStatus === 'idle'
                  ? theme === 'dark' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Generate Key
            </button>
            
            {monitorStatus === 'monitoring' && (
              <div className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'} animate-pulse`}>
                Monitoring clipboard for API key...
              </div>
            )}
            
            {monitorStatus === 'detected' && (
              <div className="flex flex-col space-y-2">
                <div className={`text-sm ${theme === 'dark' ? 'text-green-300' : 'text-green-600'}`}>
                  API key detected!
                </div>
                <button
                  onClick={handleSaveKey}
                  className={`py-2 px-4 rounded ${
                    theme === 'dark' 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  Save Key
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Right panel - Instructions and steps */}
        <div className="col-span-8">
          <div className={`p-4 rounded mb-4 ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <h3 className="font-bold mb-2">Instructions</h3>
            <div className="space-y-3">
              {instructions.map((instruction, index) => (
                <div 
                  key={index} 
                  className={`flex items-start ${
                    index === currentStep
                      ? theme === 'dark' ? 'bg-blue-900 bg-opacity-30 p-2 rounded' : 'bg-blue-50 p-2 rounded'
                      : ''
                  }`}
                >
                  <div className={`mr-2 rounded-full w-6 h-6 flex items-center justify-center text-xs ${
                    index < currentStep 
                      ? theme === 'dark' ? 'bg-green-700 text-white' : 'bg-green-500 text-white'
                      : index === currentStep
                        ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                        : theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-700'
                  }`}>
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <div className="text-sm">{instruction}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation controls for steps */}
          <div className="flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`py-1 px-3 rounded text-sm ${
                currentStep > 0
                  ? theme === 'dark' 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  : theme === 'dark'
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Previous Step
            </button>
            
            <button
              onClick={nextStep}
              disabled={currentStep >= instructions.length - 1}
              className={`py-1 px-3 rounded text-sm ${
                currentStep < instructions.length - 1
                  ? theme === 'dark' 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  : theme === 'dark'
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Next Step
            </button>
          </div>
        </div>
      </div>
      
      {/* Key preview section (when detected) */}
      {detectedKey && (
        <div className={`mt-6 p-4 rounded ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <h3 className="font-bold mb-2">Detected API Key</h3>
          <div className="flex items-center">
            <div className={`flex-grow p-2 rounded font-mono text-sm overflow-x-auto ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}>
              {detectedKey.substring(0, 4)}...{detectedKey.substring(detectedKey.length - 4)}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(detectedKey)}
              className={`ml-2 p-2 rounded ${
                theme === 'dark' 
                  ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
              }`}
              title="Copy full key"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 