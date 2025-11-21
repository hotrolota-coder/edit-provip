
import React, { useEffect } from 'react';
import { GeneratedImage } from '../types';
import { Button } from './UIComponents';
import { XIcon, DownloadIcon, CompareIcon, ChevronLeft, ChevronRight } from './Icons';

interface LightboxProps {
  viewingIndex: number | null;
  generatedImages: GeneratedImage[];
  sourceImage: string | null;
  isComparing: boolean;
  onClose: () => void;
  onNavigate: (direction: number) => void;
  onDownload: (url: string, id: string) => void;
  setIsComparing: (val: boolean) => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  viewingIndex,
  generatedImages,
  sourceImage,
  isComparing,
  onClose,
  onNavigate,
  onDownload,
  setIsComparing
}) => {
  
  // Internal keyboard handling specific to lightbox interactions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewingIndex === null) return;
      if (e.key === 'ArrowLeft') onNavigate(-1);
      if (e.key === 'ArrowRight') onNavigate(1);
      if (e.key === 'Escape') onClose();
      if (e.code === 'Space') {
         e.preventDefault();
         setIsComparing(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsComparing(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [viewingIndex, generatedImages, onNavigate, onClose, setIsComparing]);

  if (viewingIndex === null || !generatedImages[viewingIndex]) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-[fadeIn_0.2s_ease-out]">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
         <div className="flex flex-col">
            <span className="text-white/50 text-xs font-mono uppercase">Viewing Shot</span>
            <span className="text-white font-bold text-lg">{viewingIndex + 1} <span className="text-white/30">/</span> {generatedImages.length}</span>
         </div>
         <div className="flex gap-3">
           <Button variant="secondary" className="py-2 px-4 text-sm" 
              onMouseDown={() => setIsComparing(true)} 
              onMouseUp={() => setIsComparing(false)}
              onMouseLeave={() => setIsComparing(false)}
              onTouchStart={() => setIsComparing(true)}
              onTouchEnd={() => setIsComparing(false)}
              icon={<CompareIcon />}
           >
             Hold to Compare
           </Button>
           <Button variant="primary" className="py-2 px-4 text-sm" onClick={(e) => { e.stopPropagation(); onDownload(generatedImages[viewingIndex].url, generatedImages[viewingIndex].id); }} icon={<DownloadIcon />}>
             Download
           </Button>
           <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white">
             <XIcon />
           </button>
         </div>
      </div>

      {/* Navigation */}
      <button 
        className="absolute left-4 z-50 p-4 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-all disabled:opacity-20"
        onClick={(e) => { e.stopPropagation(); onNavigate(-1); }}
        disabled={viewingIndex === 0}
      >
        <ChevronLeft />
      </button>

      <button 
        className="absolute right-4 z-50 p-4 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-all disabled:opacity-20"
        onClick={(e) => { e.stopPropagation(); onNavigate(1); }}
        disabled={viewingIndex === generatedImages.length - 1}
      >
        <ChevronRight />
      </button>

      {/* Main Image / Compare View */}
      <div className="relative w-full h-full p-12 flex items-center justify-center" onClick={onClose}>
         <div className="relative max-h-full max-w-full animate-zoom-in" onClick={(e) => e.stopPropagation()}>
           
           {/* The Generated Image */}
           <img 
             src={generatedImages[viewingIndex].url} 
             alt="Generated View" 
             className={`max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 transition-opacity duration-200 ${isComparing ? 'opacity-0' : 'opacity-100'}`}
           />

           {/* The Source Image (Overlay for comparison) */}
           {sourceImage && (
             <img 
               src={sourceImage} 
               alt="Original Source"
               className={`absolute inset-0 m-auto max-h-[85vh] max-w-[90vw] object-contain rounded-lg transition-opacity duration-200 pointer-events-none ${isComparing ? 'opacity-100' : 'opacity-0'}`}
             />
           )}

           {isComparing && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-neon-blue text-black px-3 py-1 rounded-full text-xs font-bold z-20 shadow-[0_0_15px_#00f3ff]">
               SHOWING ORIGINAL
             </div>
           )}
           
           {!isComparing && (
             <div className="absolute bottom-[-3rem] left-0 right-0 text-center">
                <p className="text-sm text-gray-400 font-light bg-black/50 inline-block px-4 py-1 rounded-full backdrop-blur-md border border-white/5">
                  {generatedImages[viewingIndex].prompt}
                </p>
                <p className="text-[10px] text-gray-600 mt-1">Hold Spacebar to compare with original</p>
             </div>
           )}
         </div>
      </div>
    </div>
  );
};
