'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers } from 'lucide-react';
import { StackFrame } from '../types/memory';

interface StackVisualizerProps {
  stack: StackFrame[];
}

const StackVisualizer = ({ stack }: StackVisualizerProps) => {
  return (
    <div className="lg:col-span-4 relative flex flex-col">
      <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Stack Growth Indicator */}
      <div className="absolute -left-12 top-20 bottom-20 w-8 flex flex-col items-center justify-between pointer-events-none hidden sm:flex">
        <div className="text-[10px] text-blue-500/60 font-mono -rotate-90 origin-center whitespace-nowrap mb-12 uppercase tracking-[0.3em] border border-blue-500/20 px-2 py-0.5 rounded bg-blue-500/5 backdrop-blur-sm">0x7FFFFFFF</div>
        <div className="flex-1 w-[1px] bg-gradient-to-b from-blue-500/40 via-blue-500/10 to-transparent relative mx-auto">
           <div className="absolute -bottom-1 -left-[4.5px] border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-blue-500/60" />
        </div>
        <div className="text-[10px] text-blue-500/40 font-mono rotate-90 origin-center whitespace-nowrap mt-16 uppercase tracking-[0.3em] font-bold">Stack Pointer</div>
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-3xl h-[750px] flex flex-col overflow-hidden backdrop-blur-md flex-1 shadow-2xl">
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
           <span className="flex items-center gap-3 text-sm font-bold text-white tracking-widest">
             <Layers className="text-blue-500" size={18} /> THE_STACK
           </span>
           <span className="text-[9px] px-2 py-0.5 border border-blue-500/30 text-blue-400 rounded-md uppercase font-bold tracking-tighter">LIFO_AUTO</span>
        </div>

        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
          <AnimatePresence initial={false}>
            {[...stack].reverse().map((frame, index) => (
              <motion.div
                key={frame.id}
                initial={{ y: -40, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ x: 50, opacity: 0, filter: 'blur(10px)' }}
                className={`relative rounded-2xl border p-5 transition-all ${
                  index === 0 
                    ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_20px_rgba(37,99,235,0.1)] z-10' 
                    : 'bg-white/[0.01] border-white/5 grayscale opacity-30 shadow-inner'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Frame: <span className="text-white">{frame.functionName}()</span></span>
                  </div>
                  <span className="text-[9px] font-mono text-blue-500/60 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/20">{frame.id}</span>
                </div>

                <div className="space-y-3">
                  {frame.variables.map((v, i) => (
                    <motion.div 
                      key={v.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="group relative"
                    >
                      <div className="flex flex-col gap-2 p-3 bg-black/40 rounded-xl border border-white/5 group-hover:border-blue-500/30 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-300 tracking-tighter">var <span className="text-blue-400">'{v.name}'</span></span>
                          </div>
                          <span className="text-[8px] font-mono px-1.5 py-0.5 bg-blue-500/10 text-blue-500/60 rounded uppercase tracking-tighter">
                            {v.type === 'pointer' ? 'PTR_64' : v.type === 'struct' ? 'STRUCT' : v.type === 'array' ? 'ARRAY' : 'INT_32'}
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between px-2 py-1 bg-black/40 rounded border border-white/5">
                            <span className="text-[9px] font-mono text-slate-500 italic">ADDR:</span>
                            <span className="text-[9px] font-mono text-blue-400 font-bold">{v.address}</span>
                          </div>
                          
                          <div className="flex items-center justify-between px-2 py-1 bg-black/40 rounded border border-white/5" id={v.type === 'pointer' ? `ptr-src-${v.id}` : undefined}>
                            <span className="text-[9px] font-mono text-slate-500 italic">DATA:</span>
                            <div className={`text-[10px] font-mono font-bold flex-1 text-right pl-4 ${v.type === 'pointer' ? 'text-emerald-400 underline decoration-emerald-500/30 underline-offset-4' : 'text-slate-200'}`}>
                              {v.value.startsWith('{') ? (
                                <div className="text-left bg-black/30 p-3 rounded-xl border border-white/5 space-y-1.5 mt-2 max-h-48 overflow-y-auto custom-scrollbar shadow-inner">
                                  {v.value.replace(/[{}]/g, '').split(',').map((part, idx) => {
                                    const pair = part.split(':');
                                    if (pair.length < 2) return null;
                                    const key = pair[0].trim();
                                    const val = pair.slice(1).join(':').trim();
                                    
                                    // Clean up key: remove leading '.' or '[]'
                                    let displayKey = key;
                                    let isIndex = false;
                                    
                                    if (key.startsWith('[')) {
                                      const match = key.match(/^\[(\d+)\](.*)/);
                                      if (match) {
                                        isIndex = true;
                                        displayKey = match[2] ? `${match[1]}${match[2]}` : match[1];
                                      }
                                    } else if (key.startsWith('.')) {
                                      displayKey = key.substring(1);
                                    }

                                    return (
                                      <div key={idx} className="flex justify-between items-center border-b border-white/5 last:border-0 pb-1 group/item">
                                        <div className="flex items-center gap-1.5">
                                          <div className={`w-1 h-1 rounded-sm ${isIndex ? 'bg-slate-600' : 'bg-blue-500/40'}`} />
                                          <span className={`text-[9px] font-mono ${isIndex ? 'text-slate-500' : 'text-blue-400/80 font-bold'}`}>
                                            {isIndex ? `[${displayKey}]` : displayKey}
                                          </span>
                                        </div>
                                        <span className="text-emerald-400 text-[10px] tabular-nums font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                                          {val || '0'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                v.value
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {stack.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20 filter grayscale">
              <Layers size={64} className="mb-4 text-slate-400" />
              <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Stack_Empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StackVisualizer;
