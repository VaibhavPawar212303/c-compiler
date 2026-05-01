'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Trash2 } from 'lucide-react';
import { HeapObject } from '../types/memory';

interface HeapVisualizerProps {
  heap: HeapObject[];
  freeHeap: (id: string) => void;
}

const HeapVisualizer = ({ heap, freeHeap }: HeapVisualizerProps) => {
  return (
    <div className="lg:col-span-12 xl:col-span-4 flex flex-col">
      <div className="bg-white/[0.02] border border-white/10 rounded-3xl h-[750px] flex flex-col overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
           <span className="flex items-center gap-3 text-sm font-bold text-white tracking-widest">
             <Database className="text-emerald-500" size={18} /> THE_HEAP_STORAGE
           </span>
           <span className="text-[9px] px-2 py-0.5 border border-emerald-500/30 text-emerald-400 rounded-md uppercase font-bold tracking-tighter">Dynamic_Manual</span>
        </div>

        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-6">
            <AnimatePresence>
              {heap.map((obj) => (
                <motion.div
                  key={obj.id}
                  id={`heap-dest-${obj.id}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.1, opacity: 0, filter: 'brightness(2)' }}
                  className="relative group h-48 rounded-2xl border flex flex-col overflow-hidden shadow-lg transition-all hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                  style={{ borderColor: `${obj.color}44`, background: `${obj.color}08` }}
                >
                  <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/20">
                    <span className="text-[9px] font-bold text-white tracking-widest flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full" style={{ background: obj.color }} />
                       {obj.name}
                    </span>
                    <button 
                      onClick={() => freeHeap(obj.id)}
                      className="p-1 hover:bg-red-500/10 text-red-500/40 hover:text-red-500 transition-colors rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  
                  <div className="flex-1 p-4 flex flex-col justify-center gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-mono text-slate-500 uppercase">Memory_Addr</span>
                      <span className="text-[10px] font-mono text-slate-300 font-bold tracking-wider">{obj.address}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 rounded-full bg-black/40 overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(obj.size / 3) * 100}%` }}
                          className="h-full rounded-full"
                          style={{ background: obj.color }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">{obj.size}MB</span>
                    </div>
                  </div>

                  <div className="p-2 bg-black/40 text-[8px] font-mono text-slate-600 flex justify-center border-t border-white/5 italic">
                    {obj.type.toUpperCase()}_ALLOC_SUCCESS
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {heap.length === 0 && (
              <div className="col-span-2 h-full flex flex-col items-center justify-center py-20 opacity-20 grayscale">
                <Database size={64} className="mb-4 text-slate-400" />
                <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Warehouse_Vacant</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeapVisualizer;
