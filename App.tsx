
import React, { useState, useRef, useEffect } from 'react';
import { AppState, GeneratedImage, AnalysisResult, AlbumSession, ReferenceImage } from './types';
import { analyzeImageIdentity, generateCharacterImage } from './services/geminiService';
import { getRandomPoses } from './constants';
import { Button, Card, Badge, QuantitySelector, ReferenceThumbnail } from './components/UIComponents';
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
  ALBUM: 'qs_album_v1',
  ANALYSIS: 'qs_analysis_v1',
  DECK: 'qs_deck_v1', // New key for reference deck
  HISTORY: 'qs_history_v1',
  CROP: 'qs_crop_v1' // Added to fix missing property error
};

export default function App() {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  
  // NEW: Reference Deck State (Array of images)
  const [referenceDeck, setReferenceDeck] = useState<ReferenceImage[]>([]);
  
  // Temporary state for the image currently being processed/cropped
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null); 

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
      const savedDeck = localStorage.getItem(STORAGE_KEYS.DECK);
      const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);

      if (savedDeck) {
        setReferenceDeck(JSON.parse(savedDeck));
      }
      if (savedAnalysis) {
        setAnalysis(JSON.parse(savedAnalysis));
        // If we have analysis and deck, we are ready
        if (JSON.parse(savedDeck || '[]').length > 0) {
           setState(AppState.READY_TO_GENERATE);
        }
      }
      if (savedAlbum) {
         const images = JSON.parse(savedAlbum);
         setGeneratedImages(images);
         if (images.length > 0 && state === AppState.IDLE) setState(AppState.COMPLETE);
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
      // Fallback for env var - SAFE CHECK
      let hasEnvKey = false;
      try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
          hasEnvKey = true;
        }
      } catch (e) {
        // Ignore process error
      }
      
      setApiKeyStatus(hasEnvKey ? 'set' : 'unset');
      if (!hasEnvKey) setShowSettings(true);
    }
  };

  // Save to Local Storage
  useEffect(() => {
    try {
      if (generatedImages.length > 0) localStorage.setItem(STORAGE_KEYS.ALBUM, JSON.stringify(generatedImages));
      if (analysis) localStorage.setItem(STORAGE_KEYS.ANALYSIS, JSON.stringify(analysis));
      if (referenceDeck.length > 0) localStorage.setItem(STORAGE_KEYS.DECK, JSON.stringify(referenceDeck));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.warn("Storage quota exceeded or error", e);
      // Fallback: Try to save only history and deck, skip big album
    }
  }, [generatedImages, analysis, referenceDeck, history]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setRawImageForCrop(base64);
      setState(AppState.CROPPING);
    };
    reader.readAsDataURL(file);
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
              processFile(file);
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
      referenceDeck: [...referenceDeck],
      analysisSummary: analysis ? analysis.outfit : 'Unknown Session'
    };

    setHistory(prev => [newSession, ...prev]);
  };

  // Triggered when user finishes cropping ONE image
  const handleCropConfirm = (croppedBase64: string) => {
    if (!rawImageForCrop) return;
    
    const newReference: ReferenceImage = {
      id: Date.now().toString(),
      original: rawImageForCrop,
      crop: croppedBase64,
      timestamp: Date.now()
    };

    // Add to deck
    const newDeck = [...referenceDeck, newReference];
    setReferenceDeck(newDeck);
    setRawImageForCrop(null);
    setState(AppState.IDLE);
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropCancel = () => {
    setRawImageForCrop(null);
    setState(AppState.IDLE);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFromDeck = (id: string) => {
    const newDeck = referenceDeck.filter(ref => ref.id !== id);
    setReferenceDeck(newDeck);
    if (newDeck.length === 0) {
      setAnalysis(null); // Clear analysis if no data
    }
  };

  // Analyzes ALL images in the deck
  const startCompositeAnalysis = async () => {
    if (referenceDeck.length === 0) return;

    setState(AppState.ANALYZING);
    const msg = referenceDeck.length === 1 
      ? "Analyzing single reference identity..." 
      : `Analyzing ${referenceDeck.length} reference inputs for composite identity...`;
    setProgressMessage(msg);
    
    try {
      // 1. Archive existing session if we are starting a fresh analysis sequence
      if (generatedImages.length > 0) {
          saveCurrentSessionToHistory();
          setGeneratedImages([]);
          setCompletedCount(0);
      }

      const result = await analyzeImageIdentity(referenceDeck);
      setAnalysis(result);
      setState(AppState.READY_TO_GENERATE);
    } catch (error) {
      console.error(error);
      setState(AppState.ERROR);
      setProgressMessage('Analysis failed. Please check your API Key in Settings.');
    }
  };

  const generateAlbum = async () => {
    if (!analysis || referenceDeck.length === 0) return;

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
      
      const generateSingle = async (pose: typeof poses[0]) => {
        try {
          const url = await generateCharacterImage(
            analysis, 
            pose.prompt,
            referenceDeck // Pass the entire deck, service handles picking the best refs
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

      setProgressMessage(`Synthesizing photos...`);
      
      for (const pose of poses) {
          await generateSingle(pose);
      }
      
      setState(AppState.COMPLETE);
    } catch (error) {
      console.error(error);
      setState(AppState.ERROR);
      setProgressMessage('Generation sequence interrupted. Check API Key.');
    }
  };

  const resetApp = () => {
    if (generatedImages.length > 0) {
       saveCurrentSessionToHistory();
    }

    localStorage.removeItem(STORAGE_KEYS.ALBUM);
    localStorage.removeItem(STORAGE_KEYS.ANALYSIS);
    localStorage.removeItem(STORAGE_KEYS.DECK);
    localStorage.removeItem(STORAGE_KEYS.CROP); // Cleanup legacy key

    setReferenceDeck([]);
    setRawImageForCrop(null);
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
     // Check if this is a legacy session (single stub) or new (array)
     if (session.referenceDeck) {
       setReferenceDeck(session.referenceDeck);
     } else if ((session as any).sourceImageStub) {
        // Legacy support
        const legacyStub = (session as any).sourceImageStub;
        setReferenceDeck([{
           id: 'legacy',
           crop: legacyStub,
           original: legacyStub, // We don't have original in legacy, use stub
           timestamp: session.timestamp
        }]);
     }

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
      
      {/* CROP INTERFACE OVERLAY */}
      {state === AppState.CROPPING && rawImageForCrop && (
        <CropInterface 
          imageUrl={rawImageForCrop} 
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
        sourceImage={referenceDeck.length > 0 ? referenceDeck[0].original : null} // Show first ref as fallback in comparison
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
              {/* Status Indicator Dot */}
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${apiKeyStatus === 'set' ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
                QuantumSnap <Badge color="neon-blue">STUDIO</Badge>
              </h1>
              <p className="text-xs text-gray-500 font-mono tracking-wider">MULTI-REFERENCE ANALYSIS</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* SETTINGS TOGGLE */}
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
          
          {/* LEFT PANEL: Reference Deck & Controls */}
          <section className="lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto pr-2 scrollbar-hide">
            
            {/* Reference Deck Area */}
            <div className="space-y-4">
               <div className="flex justify-between items-end">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <LayersIcon /> Reference Deck ({referenceDeck.length})
                  </h3>
                  {referenceDeck.length > 0 && (
                     <button onClick={resetApp} className="text-[10px] text-red-400 hover:text-red-300 transition-colors">
                       Clear All
                     </button>
                  )}
               </div>

               {/* Grid of Uploaded Images */}
               {referenceDeck.length > 0 && (
                 <div className="flex gap-3 flex-wrap">
                    {referenceDeck.map((ref) => (
                       <ReferenceThumbnail 
                          key={ref.id} 
                          image={ref.original} 
                          crop={ref.crop}
                          onDelete={() => removeFromDeck(ref.id)}
                       />
                    ))}
                    
                    {/* Add Button (Small) */}
                    {referenceDeck.length < 5 && (
                       <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg border border-dashed border-white/20 hover:border-neon-blue hover:bg-neon-blue/5 flex items-center justify-center transition-all group"
                       >
                          <div className="w-6 h-6 text-gray-500 group-hover:text-neon-blue transition-colors"><UploadIcon /></div>
                       </button>
                    )}
                 </div>
               )}

               {/* Main Upload Area (Shows only if deck is empty) */}
               {referenceDeck.length === 0 && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="glass-panel border-dashed border-2 border-white/10 hover:border-neon-blue/40 rounded-3xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 group hover:bg-white/5 relative overflow-hidden"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-neon-blue/0 via-neon-blue/5 to-neon-purple/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-16 h-16 rounded-full bg-black/50 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 shadow-2xl">
                       <UploadIcon />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Add Reference Photo</h3>
                    <p className="text-xs text-gray-400 text-center px-8">
                       Upload 1 or more photos. (Multiple photos improve accuracy).
                    </p>
                  </div>
               )}
            </div>

            {/* Actions Panel */}
            <div className="space-y-6">
              
              {/* Analysis Trigger */}
              {referenceDeck.length > 0 && !analysis && (
                 <Card className="border-neon-blue/20 animate-slideUp">
                    <div className="text-center space-y-4">
                       <p className="text-xs text-gray-300">
                         {referenceDeck.length} photo{referenceDeck.length > 1 ? 's' : ''} ready for analysis.
                       </p>
                       <Button 
                         onClick={startCompositeAnalysis} 
                         className="w-full shadow-[0_0_20px_rgba(0,243,255,0.2)]"
                         isLoading={state === AppState.ANALYZING}
                         icon={<EyeIcon />}
                       >
                         {state === AppState.ANALYZING 
                            ? 'Analyzing...' 
                            : referenceDeck.length > 1 
                                ? 'Analyze Composite Identity' 
                                : 'Analyze Identity'}
                       </Button>
                    </div>
                 </Card>
              )}

              {/* Generation Panel (Only after Analysis) */}
              {analysis && (
                <Card className="space-y-6 animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)] border-neon-blue/20 relative overflow-hidden">
                  {/* Loading Overlay for Analyzing */}
                  {state === AppState.ANALYZING && (
                     <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                       <div className="w-full h-1 bg-neon-blue/80 shadow-[0_0_20px_#00f3ff] animate-scan absolute top-0" />
                       <div className="text-neon-blue font-mono text-xs animate-pulse mb-2">BUILDING BIOMETRIC PROFILE...</div>
                     </div>
                   )}

                  <div className="flex flex-col gap-4 pb-6 border-b border-white/5">
                    <div className="flex items-center justify-between text-green-400">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">Profile Locked</h3>
                      </div>
                      <Badge color="neon-purple">{referenceDeck.length} SOURCE{referenceDeck.length > 1 ? 'S' : ''}</Badge>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-3 text-xs border border-white/5">
                       <div className="flex items-center gap-2 text-gray-400 mb-1 uppercase text-[10px] font-bold">
                         <LockIcon /> {referenceDeck.length > 1 ? 'Consistent Traits' : 'Identified Traits'}
                       </div>
                       <p className="text-gray-200 line-clamp-3 leading-relaxed">
                          <span className="text-neon-blue">Vibe:</span> {analysis.photographicStyle}
                          <br/>
                          <span className="text-neon-purple">Look:</span> {analysis.outfit}
                       </p>
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
                        : 'Generate Album'}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
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
                  <p className="text-gray-500 text-lg font-light">Build your reference deck to start.</p>
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
                            {/* Stacked Thumbs for History */}
                            <div className="flex -space-x-4">
                                {(session.referenceDeck || ((session as any).sourceImageStub ? [{crop: (session as any).sourceImageStub}] : [])).slice(0,3).map((ref: any, i: number) => (
                                   <div key={i} className="w-10 h-10 rounded-full bg-black overflow-hidden border border-white/10 relative z-0 hover:z-10 transition-all">
                                      <img src={ref.crop} className="w-full h-full object-cover" alt="thumb" />
                                   </div>
                                ))}
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
      `}</style>
    </div>
  );
}
