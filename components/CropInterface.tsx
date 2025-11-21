
import React, { useState, useRef } from 'react';
import { Button } from './UIComponents';
import { XIcon } from './Icons';

interface CropInterfaceProps {
  imageUrl: string;
  onConfirm: (croppedBase64: string) => void;
  onCancel: () => void;
}

export const CropInterface: React.FC<CropInterfaceProps> = ({ imageUrl, onConfirm, onCancel }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleSave = () => {
    if (!imageRef.current || !containerRef.current) return;
    
    const canvas = document.createElement('canvas');
    const size = 512; 
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, size, size);
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const ratio = size / containerRect.width;
      
      ctx.translate(size/2, size/2);
      ctx.scale(scale, scale);
      
      const drawX = position.x * ratio;
      const drawY = position.y * ratio;
      
      ctx.setTransform(1,0,0,1,0,0); // Reset
      ctx.translate(size/2, size/2);
      ctx.translate(position.x * ratio, position.y * ratio); // Pan
      ctx.scale(scale, scale); // Zoom
      
      // Draw Image Centered
      const uiImgWidth = imageRef.current.width * ratio; 
      const uiImgHeight = imageRef.current.height * ratio;
      
      ctx.drawImage(
        imageRef.current, 
        -uiImgWidth / 2, 
        -uiImgHeight / 2, 
        uiImgWidth, 
        uiImgHeight
      );
    }
    
    onConfirm(canvas.toDataURL('image/jpeg', 0.95));
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-[fadeIn_0.3s_ease-out]">
      
      {/* Header */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-neon-blue font-bold text-xl tracking-tighter flex items-center gap-2">
             <div className="w-2 h-2 bg-neon-blue rounded-full animate-pulse" />
             TARGET ACQUISITION
          </h2>
          <p className="text-xs text-gray-400 font-mono">MANUAL OVERRIDE: ADJUST FOCUS</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <XIcon />
        </button>
      </div>

      {/* Main Crop Area */}
      <div className="relative group">
        {/* Viewport/Frame */}
        <div 
          ref={containerRef}
          className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-2xl overflow-hidden relative border-2 border-neon-blue/50 shadow-[0_0_50px_rgba(0,243,255,0.15)] cursor-move bg-black/50"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid Overlay (Static) */}
          <div className="absolute inset-0 z-20 pointer-events-none opacity-30">
            <div className="w-full h-full border-none bg-[linear-gradient(rgba(0,243,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.5)_1px,transparent_1px)] bg-[size:33%_33%]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-neon-blue rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-neon-blue/20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-[1px] bg-neon-blue/20" />
          </div>

          {/* The Image */}
          <div 
             className="w-full h-full flex items-center justify-center"
             style={{ 
               transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
               transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.1, 0.7, 1.0, 0.1)' 
             }}
          >
             <img 
               ref={imageRef}
               src={imageUrl} 
               alt="Crop Target" 
               className="max-w-none max-h-none object-contain pointer-events-none select-none opacity-90"
               style={{ width: 'auto', height: '100%', minWidth: '100%', minHeight: '100%' }}
               draggable={false}
             />
          </div>
        </div>

        {/* Corner Brackets */}
        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-neon-blue pointer-events-none" />
        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-neon-blue pointer-events-none" />
        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-neon-blue pointer-events-none" />
        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-neon-blue pointer-events-none" />
      </div>

      {/* Controls */}
      <div className="mt-8 w-[300px] sm:w-[400px] space-y-6">
         <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-neon-blue">
               <span>ZOOM LEVEL</span>
               <span>{Math.round(scale * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="3" 
              step="0.1" 
              value={scale} 
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-neon-blue [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_#00f3ff]"
            />
         </div>
         
         <div className="flex gap-4">
           <Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
           <Button 
             variant="primary" 
             onClick={handleSave} 
             className="flex-1 shadow-[0_0_20px_rgba(0,243,255,0.3)]"
             icon={<div className="w-2 h-2 bg-black rounded-full animate-pulse" />}
           >
             LOCK TARGET
           </Button>
         </div>
      </div>
      
      <div className="mt-4 text-[10px] text-gray-500 font-mono">
        DRAG TO PAN • USE SLIDER TO ZOOM • CENTER THE FACE
      </div>
    </div>
  );
};
