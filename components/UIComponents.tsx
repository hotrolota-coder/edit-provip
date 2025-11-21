
import React from 'react';
import { ReferenceAsset } from '../types';
import { TrashIcon, SparklesIcon } from './Icons';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  icon, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "relative overflow-hidden font-semibold transition-all duration-300 ease-out rounded-xl flex items-center justify-center gap-2 px-6 py-3 group disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  
  const variants = {
    primary: "bg-white text-black hover:bg-neon-blue hover:text-black hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] border border-transparent",
    secondary: "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/30 backdrop-blur-md hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]",
    ghost: "text-gray-400 hover:text-white hover:bg-white/5",
    danger: "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
      ) : icon}
      <span className="relative z-10">{children}</span>
      
      {variant === 'primary' && (
        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent z-0" />
      )}
    </button>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'neon-blue' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-${color}/10 text-${color} border border-${color}/20 shadow-[0_0_10px_rgba(0,243,255,0.1)]`}>
    {children}
  </span>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`glass-panel rounded-2xl p-6 ${className} transition-all duration-500 hover:border-white/20`}>
    {children}
  </div>
);

interface QuantitySelectorProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({ value, onChange, min = 1, max = 10 }) => {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <label className="text-xs font-mono text-neon-blue uppercase tracking-wider">Album Size</label>
        <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded">{value} PHOTOS</span>
      </div>
      <div className="relative h-12 bg-black/40 rounded-xl border border-white/10 flex items-center px-2 group hover:border-neon-blue/50 transition-colors">
        {/* Custom tick marks */}
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none px-1">
          {Array.from({ length: max }).map((_, i) => (
            <div key={i} className={`w-0.5 h-2 rounded-full transition-colors ${i < value ? 'bg-neon-blue' : 'bg-gray-800'}`} />
          ))}
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-full opacity-0 cursor-pointer z-10 relative"
        />
        {/* Progress Fill */}
        <div 
          className="absolute left-2 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full pointer-events-none transition-all duration-200"
          style={{ width: `${((value - 1) / (max - 1)) * 96}%` }}
        />
        {/* Knob */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 h-6 w-6 bg-white rounded-full shadow-[0_0_15px_rgba(0,243,255,0.8)] pointer-events-none transition-all duration-200 flex items-center justify-center text-[10px] font-bold text-black"
          style={{ left: `calc(${((value - 1) / (max - 1)) * 95}% + 4px)` }}
        >
          {value}
        </div>
      </div>
    </div>
  );
};

interface AssetStackProps {
  assets: ReferenceAsset[];
  onRemove: (id: string) => void;
  onAddClick: () => void;
}

export const AssetStack: React.FC<AssetStackProps> = ({ assets, onRemove, onAddClick }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Identity Matrix ({assets.length})</label>
        {assets.length > 1 && <Badge color="neon-purple">Multi-Ref Fusion Active</Badge>}
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
        {/* Add Button */}
        <button 
          onClick={onAddClick}
          className="snap-start shrink-0 w-20 h-24 rounded-xl border border-dashed border-white/20 hover:border-neon-blue hover:bg-white/5 flex flex-col items-center justify-center gap-2 transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="text-xl text-white font-light">+</span>
          </div>
          <span className="text-[9px] text-gray-400 uppercase font-bold">Add Ref</span>
        </button>

        {/* Asset List */}
        {assets.map((asset, idx) => (
          <div key={asset.id} className="snap-start shrink-0 relative group w-20 h-24">
            <div className={`w-full h-full rounded-xl overflow-hidden border ${asset.isPrimary ? 'border-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.3)]' : 'border-white/10'}`}>
              <img src={asset.croppedBase64} alt={`ref-${idx}`} className="w-full h-full object-cover" />
              
              {/* Primary Badge */}
              {asset.isPrimary && (
                <div className="absolute bottom-0 inset-x-0 bg-neon-blue/90 text-black text-[8px] font-bold text-center py-0.5">
                  ANCHOR
                </div>
              )}
            </div>

            {/* Remove Button */}
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(asset.id); }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 z-10"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
