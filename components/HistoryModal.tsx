import React from 'react';
import { AlbumSession } from '../types';
import { HistoryIcon, XIcon, TrashIcon } from './Icons';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: AlbumSession[];
  onRestore: (session: AlbumSession) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onRestore,
  onDelete
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="h-full w-full max-w-md bg-charcoal border-l border-white/10 shadow-2xl p-6 flex flex-col animate-[shimmer_0.3s_ease-out]">
         <div className="flex justify-between items-center mb-8">
           <h2 className="text-xl font-bold text-neon-blue flex items-center gap-2">
             <HistoryIcon /> MEMORY BANK
           </h2>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><XIcon /></button>
         </div>
         
         <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {history.length === 0 ? (
              <div className="text-center text-gray-500 py-10 font-mono text-sm">
                NO ARCHIVED SESSIONS FOUND
              </div>
            ) : (
              history.map(session => (
                <div 
                  key={session.id} 
                  onClick={() => onRestore(session)}
                  className="group relative glass-panel p-3 rounded-xl cursor-pointer hover:bg-white/5 hover:border-neon-blue/30 transition-all flex gap-4 items-start"
                >
                   <div className="w-16 h-16 rounded-lg bg-black overflow-hidden shrink-0 border border-white/10">
                     <img src={session.referenceDeck?.[0]?.crop || (session as any).sourceImageStub} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" alt="thumb" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start">
                       <span className="text-xs font-mono text-neon-blue">{new Date(session.timestamp).toLocaleDateString()}</span>
                       <button onClick={(e) => onDelete(session.id, e)} className="text-gray-600 hover:text-red-400"><TrashIcon /></button>
                     </div>
                     <h4 className="font-bold text-sm text-white truncate mt-1">{session.images.length} Photos Generated</h4>
                     <p className="text-[10px] text-gray-400 truncate mt-1">{session.analysisSummary}</p>
                   </div>
                </div>
              ))
            )}
         </div>
      </div>
    </div>
  );
};