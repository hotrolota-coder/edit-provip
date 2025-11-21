
import React from 'react';
import { XIcon } from './Icons';

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

export const ReferenceThumbnail: React.FC<{ 
  image: string; 
  crop: string; 
  onDelete: () => void; 
}> = ({ image, crop, onDelete }) => (
  <div className="relative group w-16 h-20 sm:w-20 sm:h-24 rounded-lg overflow-hidden border border-white/10 hover:border-neon-blue/50 transition-all bg-black shadow-lg">
    <img src={image} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" alt="ref" />
    
    {/* Mini crop overlay */}
    <div className="absolute bottom-0 right-0 w-8 h-8 border-t border-l border-white/20 bg-black">
       <img src={crop} className="w-full h-full object-cover" alt="crop" />
    </div>

    <button 
      onClick={(e) => { e.stopPropagation(); onDelete(); }}
      className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all transform scale-75 group-hover:scale-100"
    >
      <XIcon />
    </button>
  </div>
);
