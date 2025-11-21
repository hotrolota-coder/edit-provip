
import React, { useState, useEffect } from 'react';
import { Button, Badge } from './UIComponents';
import { SettingsIcon, XIcon, LinkIcon, WarningIcon, LockIcon, EyeIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeyStatus: 'set' | 'unset' | 'checking';
  onConfigureKey: () => void;
  onFactoryReset: () => void;
  storageSize: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKeyStatus,
  onConfigureKey,
  onFactoryReset,
  storageSize
}) => {
  const [manualKey, setManualKey] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('qs_api_key');
    if (savedKey) setManualKey(savedKey);
  }, [isOpen]);

  const handleSaveKey = () => {
    // Sanitize input (trim spaces, remove quotes if user pasted them by accident)
    const sanitizedKey = manualKey.trim().replace(/['"]/g, '');
    
    if (sanitizedKey.length > 0) {
      localStorage.setItem('qs_api_key', sanitizedKey);
      setManualKey(sanitizedKey); // Update state with sanitized value
      setSaveStatus('Saved securely to browser');
      setTimeout(() => {
        setSaveStatus('');
        onClose();
        window.location.reload(); // Reload to re-init services with new key
      }, 1000);
    } else {
      localStorage.removeItem('qs_api_key');
      setSaveStatus('Key removed');
      setTimeout(() => {
        setSaveStatus('');
      }, 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-lg mx-4 glass-panel rounded-2xl overflow-hidden border border-neon-blue/20 shadow-[0_0_50px_rgba(0,243,255,0.1)]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
           <h2 className="text-lg font-bold text-neon-blue flex items-center gap-2">
             <SettingsIcon /> SYSTEM CONFIGURATION
           </h2>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><XIcon /></button>
        </div>
        
        <div className="p-6 space-y-8">
          {/* API KEY SECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-mono text-gray-400 uppercase tracking-wider">Neural Link Status</label>
              <Badge color={apiKeyStatus === 'set' ? 'green-400' : 'red-400'}>
                {apiKeyStatus === 'set' ? 'ONLINE' : 'DISCONNECTED'}
              </Badge>
            </div>
            
            <div className="p-4 bg-black/40 rounded-xl border border-white/10 flex flex-col gap-4">
               <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 mt-2 rounded-full ${apiKeyStatus === 'set' ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-red-500 animate-pulse'}`} />
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">Gemini API Connection</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Required for biometric analysis and image synthesis.
                    </p>
                  </div>
               </div>

               {/* Manual Key Input */}
               <div className="mt-2">
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block">MANUAL KEY ENTRY (OVERRIDES AUTO)</label>
                  <div className="relative flex items-center">
                    <input 
                      type={showKey ? "text" : "password"}
                      value={manualKey}
                      onChange={(e) => setManualKey(e.target.value)}
                      placeholder="Paste your Gemini API Key here..."
                      className="w-full bg-black/50 border border-white/20 rounded-lg pl-9 pr-10 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-blue focus:shadow-[0_0_10px_rgba(0,243,255,0.2)] transition-all font-mono"
                    />
                    <div className="absolute left-3 text-gray-500"><LockIcon /></div>
                    <button 
                      onClick={() => setShowKey(!showKey)} 
                      className="absolute right-3 text-gray-500 hover:text-white focus:outline-none"
                    >
                      <EyeIcon />
                    </button>
                  </div>
                  {saveStatus && <p className="text-green-400 text-xs mt-2 animate-pulse">{saveStatus}</p>}
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                 <Button 
                    variant="primary"
                    onClick={handleSaveKey}
                    className="text-xs py-2"
                  >
                    Save Manual Key
                 </Button>
                 {(window as any).aistudio && (
                    <Button 
                      variant="secondary"
                      onClick={onConfigureKey}
                      className="text-xs py-2"
                    >
                      Use Auto-Select
                    </Button>
                 )}
               </div>
               
               <div className="text-[10px] text-gray-600 flex items-center gap-1 mt-1 border-t border-white/5 pt-2">
                  <LinkIcon /> 
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-neon-blue">
                    Get API Key (Google AI Studio)
                  </a>
               </div>
            </div>
          </div>

          {/* SYSTEM DATA SECTION */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <label className="text-sm font-mono text-gray-400 uppercase tracking-wider">System Data</label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                 <span className="text-sm text-gray-300">Cache Storage</span>
                 <span className="text-xs font-mono text-gray-500">
                   {(storageSize / 1024).toFixed(1)} KB
                 </span>
              </div>
              <Button 
                variant="danger" 
                className="w-full text-xs" 
                onClick={onFactoryReset}
                icon={<WarningIcon />}
              >
                Factory Reset (Wipe All Data)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
