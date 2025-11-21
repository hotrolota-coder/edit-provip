
import React, { useState, useRef, useEffect } from 'react';
import { AppState, GeneratedImage, AnalysisResult, AlbumSession, ReferenceAsset } from './types';
import { analyzeImageIdentity, generateCharacterImage } from './services/geminiService';
import { getRandomPoses } from './constants';
import { Button, Card, Badge, QuantitySelector, AssetStack } from './components/UIComponents';
import { 
  UploadIcon, SparklesIcon, LayersIcon, CameraIcon, 
  EyeIcon, LockIcon, MaximizeIcon, HistoryIcon, SettingsIcon, TrashIcon
} from './components/Icons';

// Imported Feature Components
import { CropInterface } from './components/CropInterface';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { Lightbox } from './components/Lightbox';

// Keys for local storage
const STORAGE_KEYS = {
  ALBUM: 'qs_album_v2',
  ANALYSIS: 'qs_analysis_v2',
  ASSETS: 'qs_assets_v2',
  HISTORY: 'qs_history_v2'
};

export default function App() {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  
  // Multi-Reference State
  const [referenceAssets, setReferenceAssets] = useState<ReferenceAsset[]>([]);
  const [cropQueue, setCropQueue] = useState<string[]>([]); // Queue of raw base64s waiting for crop
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [imageCount, setImageCount] = useState<number>(3);
  const [progressMessage, setProgressMessage] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [history, setHistory] = useState<AlbumSession[]>([]);
  
  // UI State
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [viewingHistorySession, setViewingHistorySession] = useState<AlbumSession | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'set' | 'unset'>('checking');
  const [storageSize, setStorageSize] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from Local Storage on Mount
  useEffect(() => {
    try {
      const savedAlbum = localStorage.getItem(STORAGE_KEYS.ALBUM);
      const savedAnalysis = localStorage.getItem(STORAGE_KEYS.ANALYSIS);
      const savedAssets = localStorage.getItem(STORAGE_KEYS.ASSETS);
      const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);

      if (savedAssets) setReferenceAssets(JSON.parse(savedAssets));
      if (savedAnalysis) {
        setAnalysis(JSON.parse(savedAnalysis));
        setState(AppState.READY_TO_GENERATE);
      }
      if (savedAlbum) {
         const images = JSON.parse(savedAlbum);
         setGeneratedImages(images);
         if (images.length > 0) setState(AppState.COMPLETE);
      }
      if (savedHistory) setHistory(JSON.parse(savedHistory));

      // Calculate storage usage
      setStorageSize(localStorage.getItem(STORAGE_KEYS.ALBUM)?.length || 0);

    } catch (e) {
      console.error("Failed to load from storage", e);
    }
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    // Check Local Storage First
    const manualKey = localStorage.getItem('qs_api_key');
    if (manualKey) {
      setApiKeyStatus('set');
      return;
    }

    // Check AI Studio
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      const hasKey = await aiStudio.hasSelectedApiKey();
      setApiKeyStatus(hasKey ? 'set' : 'unset');
      if (!hasKey) {
        setShowSettings(true); // Prompt user if no key
      }
    } else {
      // Fallback for env var
      setApiKeyStatus('set'); 
    }
  };

  // Save to Local Storage
  useEffect(() => {
    try {
      if (generatedImages.length > 0) localStorage.setItem(STORAGE_KEYS.ALBUM, JSON.stringify(generatedImages));
      if (analysis) localStorage.setItem(STORAGE_KEYS.ANALYSIS, JSON.stringify(analysis));
      if (referenceAssets.length > 0) localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(referenceAssets));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.warn("Storage quota exceeded or error", e);
    }
  }, [generatedImages, analysis, referenceAssets, history]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      // Convert FileList to Array
      const files = Array.from(event.target.files);
      processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = async (files: File[]) => {
    const readers = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    const results = await Promise.all(readers);
    
    // Add to queue. This triggers the CropInterface via useEffect or State check
    setCropQueue(prev => [...prev, ...results]);
    setState(AppState.CROPPING);
  };

  // PASTE HANDLER
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (state === AppState.CROPPING || showSettings) return; 
      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              processFiles([file]);
              e.preventDefault();
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [state, showSettings]);

  const saveCurrentSessionToHistory = () => {
    if (generatedImages.length === 0) return;
    
    const newSession: AlbumSession = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      images: [...generatedImages],
      referenceAssets: [...referenceAssets],
      analysisSummary: analysis ? analysis.outfit : 'Unknown Session'
    };

    setHistory(prev => [newSession, ...prev]);
  };

  const handleCropConfirm = (croppedBase64: string) => {
    // Get the current raw image being processed (first in queue)
    const currentRaw = cropQueue[0];
    if (!currentRaw) return;

    const newAsset: ReferenceAsset = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      originalBase64: currentRaw,
      croppedBase64: croppedBase64,
      timestamp: Date.now(),
      isPrimary: referenceAssets.length === 0 // First one uploaded is primary
    };

    setReferenceAssets(prev => [...prev, newAsset]);

    // Remove processed item from queue
    const newQueue = cropQueue.slice(1);
    setCropQueue(newQueue);

    if (newQueue.length === 0) {
      // All cropped!
      // If this was the FIRST upload ever, analyze immediately? 
      // OR, just go to Idle and let user click Analyze. 
      // Let's Auto-Analyze if it's the initial setup, otherwise just go to IDLE so they can see the stack.
      
      if (referenceAssets.length === 0) { 
        // This was the first one added
        analyzeSource([newAsset]);
      } else {
        setState(AppState.IDLE);
        // Should we re-analyze automatically if they added a new ref? 
        // Better to let them click "Update Analysis" or "Analyze" to save tokens.
      }
    }
    // If queue has more, CropInterface stays open for the next one automatically (handled by render)
  };

  const handleCropCancel = () => {
    // Skip current item
    const newQueue = cropQueue.slice(1);
    setCropQueue(newQueue);
    if (newQueue.length === 0) {
      setState(AppState.IDLE);
    }
  };

  const handleRemoveAsset = (id: string) => {
    setReferenceAssets(prev => {
      const filtered = prev.filter(a => a.id !== id);
      // If we deleted the primary, make the new first item primary
      if (filtered.length > 0 && !filtered.some(a => a.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const analyzeSource = async (assetsToAnalyze: ReferenceAsset[]) => {
    setState(AppState.ANALYZING);
    setProgressMessage(
      assetsToAnalyze.length > 1 
        ? `Fusing identity matrix from ${assetsToAnalyze.length} sources...` 
        : 'Scanning biometrics, angles & expression habits...'
    );
    
    try {
      const result = await analyzeImageIdentity(assetsToAnalyze, 'image/jpeg');
      setAnalysis(result);
      setState(AppState.READY_TO_GENERATE);
    } catch (error) {
      console.error(error);
      setState(AppState.ERROR);
      setProgressMessage('Scan interrupted. Please check your API Connection in Settings.');
    }
  };

  // MODIFIED: Automatically archives current session before generating new one
  const generateAlbum = async () => {
    if (!analysis || referenceAssets.length === 0) return;

    // 1. Archive existing if meaningful
    if (generatedImages.length > 0) {
      saveCurrentSessionToHistory();
    }

    // 2. Prepare for new generation
    setState(AppState.GENERATING);
    setGeneratedImages([]); 
    setCompletedCount(0);
    
    try {
      const poses = getRandomPoses(imageCount);
      
      // Find Primary Asset
      const primaryAsset = referenceAssets.find(a => a.isPrimary) || referenceAssets[0];
      const sourceBase64Data = primaryAsset.originalBase64.split(',')[1];
      
      const generateSingle = async (pose: typeof poses[0]) => {
        try {
          const url = await generateCharacterImage(
            analysis, 
            pose.prompt,
            sourceBase64Data 
          );
          
          const newImage: GeneratedImage = {
            id: Math.random().toString(36).substr(2, 9),
            url,
            prompt: pose.prompt,
            scenario: pose.id,
            timestamp: Date.now()
          };
          
          setGeneratedImages(prev => [...prev, newImage]);
          setCompletedCount(prev => prev + 1);
        } catch (e) {
          console.error("Failed one image", e);
        }
      };

      setProgressMessage(`Synthesizing Friend POV...`);
      
      for (const pose of poses) {
          await generateSingle(pose);
      }
      
      setState(AppState.COMPLETE);
    } catch (error) {
      console.error(error);
      setState(AppState.ERROR);
      setProgressMessage('Generation sequence interrupted. Check connectivity.');
    }
  };

  const resetApp = () => {
    if (generatedImages.length > 0) saveCurrentSessionToHistory();

    localStorage.removeItem(STORAGE_KEYS.ALBUM);
    localStorage.removeItem(STORAGE_KEYS.ANALYSIS);
    localStorage.removeItem(STORAGE_KEYS.ASSETS);

    setReferenceAssets([]);
    setCropQueue([]);
    setState(AppState.IDLE);
    setAnalysis(null);
    setGeneratedImages([]);
    setCompletedCount(0);
  };

  const handleFactoryReset = () => {
    if (window.confirm("WARNING: This will wipe all saved histories and settings. Proceed?")) {
      localStorage.clear();
      setHistory([]);
      resetApp();
      setShowSettings(false);
      window.location.reload();
    }
  };

  const handleConfigureApiKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      try {
        await aiStudio.openSelectKey();
        await checkApiKey();
      } catch (e) {
        console.error("Failed to select key", e);
      }
    }
  };

  const restoreSession = (session: AlbumSession) => {
     if (generatedImages.length > 0) saveCurrentSessionToHistory();

     setGeneratedImages(session.images);
     setReferenceAssets(session.referenceAssets); 
     setAnalysis({ outfit: session.analysisSummary } as AnalysisResult); 
     setState(AppState.COMPLETE);
     setShowHistoryModal(false);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const downloadImage = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `quantum_snap_${id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchDownload = async (images: GeneratedImage[]) => {
    if (images.length === 0) return;
    setIsBatchDownloading(true);
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      downloadImage(img.url, img.id);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    setIsBatchDownloading(false);
  };

  const navigateImage = (direction: number) => {
    if (viewingIndex === null) return;
    const collection = viewingHistorySession ? viewingHistorySession.images : generatedImages;
    const newIndex = viewingIndex + direction;
    if (newIndex >= 0 && newIndex < collection.length) {
      setViewingIndex(newIndex);
    }
  };

  const openLightbox = (index: number, session: AlbumSession | null = null) => {
    setViewingHistorySession(session);
    setViewingIndex(index);
  };

  return (
    <div className="min-h-screen bg-obsidian text-gray-100 selection:bg-neon-blue selection:text-black font-sans overflow-hidden">
      
      {/* CROP INTERFACE OVERLAY (Handles Queue) */}
      {state === AppState.CROPPING && cropQueue.length > 0 && (
        <CropInterface 
          imageUrl={cropQueue[0]} 
          onConfirm={handleCropConfirm} 
          onCancel={handleCropCancel} 
        />
      )}

      {/* SETTINGS MODAL */}
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        apiKeyStatus={apiKeyStatus}
        onConfigureKey={handleConfigureApiKey}
        onFactoryReset={handleFactoryReset}
        storageSize={storageSize}
      />

      {/* HISTORY MODAL */}
      <HistoryModal 
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={history}
        onRestore={restoreSession}
        onDelete={deleteHistoryItem}
      />

      {/* LIGHTBOX */}
      <Lightbox 
        viewingIndex={viewingIndex}
        generatedImages={viewingHistorySession ? viewingHistorySession.images : generatedImages}
        sourceImage={referenceAssets.find(a => a.isPrimary)?.originalBase64 || null}
        isComparing={isComparing}
        onClose={() => { setViewingIndex(null); setViewingHistorySession(null); }}
        onNavigate={navigateImage}
        onDownload={downloadImage}
        setIsComparing={setIsComparing}
      />

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-neon-blue/5 blur-[120px] animate-pulse-slow" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-neon-purple/5 blur-[120px] animate-pulse-slow" style={{ animationDelay: '3s' }} />
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-25 mix-blend-overlay" />
         <div className="absolute inset-0 bg-cyber-grid opacity-10 mask-image-gradient" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl h-screen flex flex-col">
        
        {/* Navbar */}
        <header className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-4 group cursor-default">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.1)] group-hover:shadow-[0_0_25px_rgba(0,243,255,0.4)] transition-all duration-500 relative">
              <div className="animate-float">
                <CameraIcon />
              </div>
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${apiKeyStatus === 'set' ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
                QuantumSnap <Badge color="neon-blue">STUDIO</Badge>
              </h1>
              <p className="text-xs text-gray-500 font-mono tracking-wider">AI IDENTITY PRESERVATION</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
               variant="ghost"
               onClick={() => setShowSettings(true)}
               className={`p-2 rounded-xl border border-white/10 ${apiKeyStatus === 'unset' ? 'text-red-400 bg-red-500/10 border-red-500/30' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            >
               <SettingsIcon />
            </Button>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 pb-4">
          
          {/* LEFT PANEL: Controls & Input */}
          <section className="lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto pr-2 scrollbar-hide">
            
            {/* Upload Card */}
            <div className="relative group shrink-0">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden" 
                multiple // Enable multi-file selection
              />
              
              {referenceAssets.length === 0 ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="glass-panel border-dashed border-2 border-white/10 hover:border-neon-blue/40 rounded-3xl h-80 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 group-hover:bg-white/5 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-neon-blue/0 via-neon-blue/5 to-neon-purple/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="w-24 h-24 rounded-full bg-black/50 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-2xl">
                     <UploadIcon />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Upload Reference(s)</h3>
                  <p className="text-sm text-gray-400 text-center px-8 font-light">
                    Drop one or multiple photos. <br/>I will fuse them to learn your vibe.
                  </p>
                </div>
              ) : (
                <div className="relative rounded-3xl overflow-hidden glass-panel border-neon-blue/30 shadow-[0_0_40px_rgba(0,243,255,0.15)] transition-all duration-500 flex flex-col p-4 gap-4">
                   
                   {/* Asset Stack Visualization */}
                   <AssetStack 
                      assets={referenceAssets} 
                      onRemove={handleRemoveAsset}
                      onAddClick={() => fileInputRef.current?.click()} 
                   />

                   {/* Main Preview (Primary) */}
                   <div className="relative h-48 w-full rounded-xl overflow-hidden border border-white/10 bg-black/50">
                      <img 
                        src={referenceAssets.find(a => a.isPrimary)?.originalBase64} 
                        alt="Primary Source" 
                        className="w-full h-full object-contain opacity-60" 
                      />
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-neon-blue border border-neon-blue/30">
                        PRIMARY ANCHOR
                      </div>
                   </div>

                   {/* Analysis Status */}
                   {state === AppState.ANALYZING && (
                     <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl">
                       <div className="w-full h-1 bg-neon-blue/80 shadow-[0_0_20px_#00f3ff] animate-scan absolute top-0" />
                       <div className="text-neon-blue font-mono text-xs animate-pulse mb-2 text-center px-4">
                         {progressMessage}
                       </div>
                     </div>
                   )}

                   {/* Re-Analyze Trigger (Only if idle and has assets) */}
                   {state === AppState.IDLE && referenceAssets.length > 0 && (
                      <Button 
                        variant="secondary" 
                        onClick={() => analyzeSource(referenceAssets)}
                        className="w-full py-2 text-xs"
                      >
                        Re-Analyze Fusion ({referenceAssets.length})
                      </Button>
                   )}
                </div>
              )}
            </div>

            {/* Configuration Panel */}
            {analysis && (
              <Card className="space-y-6 animate-[slideUp_0.6s_cubic-bezier(0.16,1,0.3,1)] border-neon-blue/20">
                <div className="flex flex-col gap-4 pb-6 border-b border-white/5">
                  <div className="flex items-center justify-between text-green-400">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Fusion Profile Ready</h3>
                    </div>
                    <button onClick={resetApp} className="text-[10px] px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-gray-300 transition-colors">
                        Reset
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-white/5 rounded-lg p-3 text-xs border border-white/5">
                       <div className="flex items-center gap-2 text-gray-400 mb-1 uppercase text-[10px] font-bold">
                         <LockIcon /> Identity Matrix
                       </div>
                       <p className="text-gray-200 line-clamp-4 leading-relaxed">
                          <span className="text-neon-blue">Style:</span> {analysis.photographicStyle}
                          <br/>
                          <span className="text-neon-purple">Vibe:</span> {analysis.vibeAnalysis}
                          <br/>
                          <span className="text-gray-400">Habits:</span> {analysis.consistencyNotes}
                       </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <QuantitySelector value={imageCount} onChange={setImageCount} />
                  
                  <Button 
                    className="w-full py-4 text-lg shadow-[0_0_30px_rgba(255,255,255,0.1)]" 
                    onClick={generateAlbum}
                    isLoading={state === AppState.GENERATING}
                    icon={<SparklesIcon />}
                  >
                    {state === AppState.GENERATING 
                      ? `Synthesizing...` 
                      : 'Generate Fusion Album'}
                  </Button>
                </div>
              </Card>
            )}
          </section>

          {/* RIGHT PANEL: Gallery & History Stream */}
          <section className="lg:col-span-8 flex flex-col h-full min-h-0 relative">
            
            {/* Status Bar */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                Active Session
                {generatedImages.length > 0 && <span className="text-sm font-normal text-gray-500">({generatedImages.length})</span>}
              </h2>
              
              <div className="flex items-center gap-3">
                {generatedImages.length > 0 && (
                  <Button 
                    variant="secondary" 
                    className="py-1.5 px-3 text-xs" 
                    onClick={() => handleBatchDownload(generatedImages)}
                    isLoading={isBatchDownloading}
                    icon={<LayersIcon />}
                  >
                    {isBatchDownloading ? 'Extracting...' : 'Download All'}
                  </Button>
                )}
                
                {state === AppState.GENERATING && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-neon-blue/5 rounded-full border border-neon-blue/20">
                    <div className="w-4 h-4 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono text-neon-blue animate-pulse">{progressMessage}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Feed: Current Session -> History */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide pb-20">
              
              {/* 1. ACTIVE SESSION GRID */}
              {generatedImages.length === 0 && state !== AppState.GENERATING ? (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02] mb-8">
                  <div className="w-20 h-20 mb-6 opacity-10 text-white">
                    <SparklesIcon />
                  </div>
                  <p className="text-gray-500 text-lg font-light">Ready to generate.</p>
                  {apiKeyStatus === 'unset' && (
                    <Button variant="secondary" onClick={() => setShowSettings(true)} className="mt-4">
                      Configure API to Start
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                  {generatedImages.map((img, idx) => (
                    <div 
                      key={img.id} 
                      className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-900 border border-white/10 shadow-lg cursor-pointer transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:z-10 hover:scale-[1.02]"
                      onClick={() => openLightbox(idx)}
                    >
                       <img 
                        src={img.url} 
                        alt="Generated" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                         <p className="text-[10px] text-gray-300 font-mono truncate w-full mb-3 opacity-80">{img.prompt}</p>
                         <div className="flex items-center justify-center w-full text-xs font-semibold text-white bg-white/20 backdrop-blur-sm py-2 rounded-lg hover:bg-white/30 transition-colors">
                            <MaximizeIcon /> <span className="ml-2">Expand</span>
                         </div>
                       </div>
                    </div>
                  ))}
                  {/* Loaders */}
                  {state === AppState.GENERATING && Array.from({ length: 1 }).map((_, i) => (
                     <div key={`loading-${i}`} className="aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/10 relative flex items-center justify-center animate-pulse">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-[scan_2s_linear_infinite]" />
                        <div className="text-center z-10 opacity-50">
                          <div className="text-xs font-mono text-neon-blue">GENERATING...</div>
                        </div>
                     </div>
                   ))}
                </div>
              )}

              {/* 2. HISTORY FEED (TIMELINE) */}
              {history.length > 0 && (
                <div className="animate-[fadeIn_0.5s_ease-out]">
                  <div className="flex items-center gap-4 mb-6">
                     <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                     <div className="text-xs font-mono text-gray-500 flex items-center gap-2">
                       <HistoryIcon /> TIMELINE ARCHIVE
                     </div>
                     <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>

                  <div className="space-y-8">
                    {history.map((session) => (
                      <div key={session.id} className="bg-white/5 rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-black overflow-hidden border border-white/10 relative">
                               {/* Use first available cropped thumb from asset list */}
                               <img src={session.referenceAssets?.[0]?.croppedBase64 || session.sourceImageStub} className="w-full h-full object-cover" alt="thumb" />
                               {session.referenceAssets?.length > 1 && (
                                 <div className="absolute bottom-0 right-0 bg-neon-purple text-black text-[8px] px-1 font-bold">+{session.referenceAssets.length - 1}</div>
                               )}
                            </div>
                            <div>
                              <div className="text-xs text-gray-400">{new Date(session.timestamp).toLocaleString()}</div>
                              <div className="text-sm text-white font-bold">{session.images.length} Photos Generated</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <Button 
                                variant="ghost" 
                                className="p-2 hover:text-red-400" 
                                onClick={(e) => deleteHistoryItem(session.id, e)}
                              >
                               <TrashIcon />
                             </Button>
                             <Button 
                               variant="secondary" 
                               className="text-xs py-1.5 px-3"
                               onClick={() => handleBatchDownload(session.images)}
                             >
                               Download Set
                             </Button>
                          </div>
                        </div>
                        
                        {/* Mini Grid for History Items */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                           {session.images.map((img, idx) => (
                             <div 
                               key={img.id} 
                               onClick={() => openLightbox(idx, session)}
                               className="aspect-[3/4] rounded-lg overflow-hidden bg-black/40 cursor-pointer hover:ring-2 hover:ring-neon-blue/50 transition-all relative group"
                             >
                                <img src={img.url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="history-item" />
                             </div>
                           ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </section>

        </main>
      </div>
      
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        .snap-x {
            scroll-snap-type: x mandatory;
        }
        .snap-start {
            scroll-snap-align: start;
        }
      `}</style>
    </div>
  );
