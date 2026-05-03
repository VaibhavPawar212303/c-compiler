'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Trash2 } from 'lucide-react';
import { HeapObject } from '../types/memory';

interface HeapVisualizerProps {
  heap: HeapObject[];
  freeHeap: (id: string) => void;
  theme?: 'dark' | 'light';
}

const HeapVisualizer = ({ heap, freeHeap, theme = 'dark' }: HeapVisualizerProps) => {
  return (
    <div className="relative flex flex-col group min-h-[750px]">
      <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-20 ${
        theme === 'dark' ? 'bg-emerald-600/30' : 'bg-emerald-400/20'
      }`} />

      {/* Visual Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-none border ${
            theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-600/10 border-emerald-600/20 text-emerald-600'
          }`}>
            <Database size={18} />
          </div>
          <div>
             <h3 className={`text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>The_Heap</h3>
             <p className="text-[9px] font-mono opacity-50 uppercase tracking-widest">Manual Segment Management</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-none border text-[9px] font-black uppercase tracking-widest ${
          theme === 'dark' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-emerald-600/20 text-emerald-600 bg-emerald-600/5'
        }`}>
          Runtime_Storage
        </div>
      </div>

      <div className={`border rounded-none flex flex-col overflow-hidden backdrop-blur-md flex-1 shadow-2xl relative transition-all ${
        theme === 'dark' ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'
      }`}>
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {heap.map((obj) => (
                <motion.div
                  key={obj.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.1, opacity: 0, filter: 'brightness(2)' }}
                  className={`relative group h-auto min-h-[160px] rounded-none border flex flex-col overflow-hidden shadow-lg transition-all hover:shadow-[0_10px_40px_rgba(0,0,0,0.2)] ${
                    theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-white border-black/5'
                  }`}
                  style={{ borderLeft: `4px solid ${obj.color}` }}
                >
                  <div className={`p-4 border-b flex items-center justify-between ${
                    theme === 'dark' ? 'border-white/5 bg-black/40' : 'border-black/5 bg-slate-50 border-t'
                  }`}>
                    <div className="flex items-center gap-4">
                       <div className="w-8 h-8 flex items-center justify-center border border-white/10 bg-black/20" style={{ color: obj.color }}>
                          <Database size={14} />
                       </div>
                       <div>
                          <h4 className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {obj.name}
                          </h4>
                          <span className="text-[8px] font-mono opacity-30 block">ID: {obj.id}</span>
                       </div>
                    </div>
                    <div className="flex flex-col items-end">
                       <span 
                         id={`p-addr-${obj.address.toUpperCase()}`}
                         className="text-[9px] font-mono opacity-50 tabular-nums"
                       >
                         0x{obj.address.toUpperCase()}
                       </span>
                       <button 
                         onClick={() => freeHeap(obj.id)}
                         className={`mt-1 text-[8px] font-black uppercase tracking-tighter transition-all px-1.5 py-0.5 border ${
                           theme === 'dark' ? 'border-red-500/20 text-red-500/60 hover:text-red-500 hover:bg-red-500/10' : 'border-red-600/20 text-red-600/60 hover:text-red-600 hover:bg-red-600/10'
                         }`}
                       >
                         release();
                       </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-6 flex flex-col gap-6">
                    <div className={`p-5 min-h-[80px] transition-all relative ${
                      theme === 'dark' ? 'bg-black/40 border border-white/5 shadow-inner' : 'bg-slate-50 border border-black/5'
                    }`}>
                      {obj.value && obj.value.startsWith('{') ? (
                        <div className="max-h-60 overflow-y-auto custom-scrollbar pr-3">
                          {renderHierarchy(obj.value, obj.address, theme)}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between h-full">
                          <span className="text-[10px] font-mono opacity-20 uppercase tracking-widest italic">_raw_segment_</span>
                          <span className={`text-sm font-mono font-black ${
                             theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                          }`}>
                            {obj.value || '0x00'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                       <div className="flex items-center justify-between px-1">
                          <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest font-bold">Allocation_Pressure</span>
                          <span className="text-[9px] font-mono font-black">{obj.size} Bytes</span>
                       </div>
                       <div className={`h-1.5 rounded-none overflow-hidden ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${Math.min((obj.size / 32) * 100, 100)}%` }} // Normalized to 32B for viz
                           className="h-full rounded-none transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                           style={{ backgroundColor: obj.color }}
                         />
                       </div>
                    </div>
                  </div>

                  <div className={`p-2 text-center border-t text-[8px] font-bold uppercase tracking-[0.2em] ${
                    theme === 'dark' ? 'bg-black/40 border-white/5 text-slate-700' : 'bg-slate-50 border-black/5 text-slate-300'
                  }`}>
                    {obj.type}_Segment_Active
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {heap.length === 0 && (
              <div className="col-span-1 md:col-span-2 h-full flex flex-col items-center justify-center py-24 opacity-20 grayscale">
                <Database size={64} className="mb-4 text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Heap_Empty_Buffer</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TreeNode {
  key: string;
  label: string;
  value?: string;
  address: string;
  children: Map<string, TreeNode>;
  isIndex: boolean;
}

const renderHierarchy = (valueStr: string, baseAddr: string, theme: 'dark' | 'light' = 'dark') => {
  const clean = valueStr.replace(/[{}]/g, '');
  if (!clean.trim()) return <div className="text-slate-600 italic text-[8px]">Empty</div>;

  const root: TreeNode = { key: 'root', label: 'root', address: baseAddr, children: new Map(), isIndex: false };
  const baseNum = parseInt(baseAddr, 16);

  clean.split(',').forEach((part, idx) => {
    const pair = part.split(':');
    if (pair.length < 2) return;
    const fullKey = pair[0].trim();
    const val = pair.slice(1).join(':').trim();

    const segments = fullKey.match(/\[\d+\]|\.[\w]+/g) || [fullKey];
    let currentNode = root;

    segments.forEach((seg, sIdx) => {
      if (!currentNode.children.has(seg)) {
        const siblingCount = currentNode.children.size;
        const subAddr = '0x' + (baseNum + (siblingCount * 4) + (idx * 4)).toString(16).toUpperCase();
        
        currentNode.children.set(seg, {
          key: seg,
          label: seg.startsWith('.') ? seg.substring(1) : seg,
          address: subAddr,
          children: new Map(),
          isIndex: seg.startsWith('['),
          value: sIdx === segments.length - 1 ? val : undefined
        });
      }
      currentNode = currentNode.children.get(seg)!;
    });
  });

  const renderRecursive = (node: TreeNode, depth: number = 0) => {
    return Array.from(node.children.values()).map((child, cIdx) => (
      <div key={child.key + cIdx} className="space-y-1">
        <div 
          className={`flex items-center justify-between group/line py-1 border-l transition-colors ${
            theme === 'dark' ? 'border-white/5 hover:border-emerald-500/30' : 'border-black/5 hover:border-emerald-600'
          }`}
          style={{ marginLeft: `${depth * 12}px`, paddingLeft: '12px' }}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="text-[8px] font-mono opacity-20 tracking-tighter tabular-nums whitespace-nowrap">
              0x{child.address.substring(2).toUpperCase()}
            </span>
            <div className="flex items-center gap-2">
               {depth > 0 && <span className="opacity-20 text-[10px]">└─</span>}
               <span className={`text-[10px] font-mono truncate ${
                 child.isIndex 
                   ? (theme === 'dark' ? 'text-slate-500' : 'text-slate-400') 
                   : (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600 font-bold')
               }`}>
                 {child.isIndex ? 'IDX:' : 'MEM:'} <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}>{child.label}</span>
               </span>
            </div>
          </div>
          {child.value !== undefined && (
            <span className={`text-[10px] font-black border-emerald-500/20 border-b border-dashed tabular-nums ${
              theme === 'dark' ? 'text-emerald-400/80' : 'text-emerald-600'
            }`}>
              {child.value}
            </span>
          )}
        </div>
        {child.children.size > 0 && (
          <div className="space-y-1">
            {renderRecursive(child, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  return <div className="space-y-0.5">{renderRecursive(root)}</div>;
};

export default HeapVisualizer;
