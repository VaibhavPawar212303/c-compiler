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
    <div className="relative flex flex-col group">
      <div className={`border rounded-2xl flex flex-col overflow-hidden backdrop-blur-md flex-1 relative transition-all ${
        theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-black/5'
      }`}>
        {/* Memory Decoration */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
          theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-600/20'
        }`} />

        <div className="flex-1 p-6 flex flex-col gap-6 relative z-10 overflow-y-auto custom-scrollbar min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {heap.map((obj) => (
                <motion.div
                  key={obj.id}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.05, opacity: 0 }}
                  className={`relative rounded-xl border flex flex-col overflow-hidden transition-all shadow-sm hover:shadow-md ${
                    theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white border-black/10'
                  }`}
                  style={{ borderLeft: `3px solid ${obj.color}` }}
                >
                  <div className={`px-4 py-2 flex items-center justify-between border-b ${
                    theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-slate-50'
                  }`}>
                    <div className="flex items-center gap-2">
                       <Database size={12} style={{ color: obj.color }} />
                       <h4 className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white/80' : 'text-slate-900/80'}`}>
                         {obj.name}
                       </h4>
                    </div>
                    <span className="text-[8px] font-mono opacity-30 tabular-nums">0x{obj.address.toUpperCase()}</span>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className={`p-3 rounded-lg min-h-[60px] ${
                      theme === 'dark' ? 'bg-[#050505] border border-white/5 shadow-inner' : 'bg-slate-50 border border-black/5 shadow-inner'
                    }`}>
                      {obj.value && obj.value.startsWith('{') ? (
                        <div className="max-h-40 overflow-y-auto custom-scrollbar">
                          {renderHierarchy(obj.value, obj.address, theme)}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between h-full opacity-60">
                          <span className="text-[11px] font-mono font-bold" style={{ color: obj.color }}>{obj.value || '0x00'}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <div className="flex-1 max-w-[120px] h-1 bg-black/20 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((obj.size / 64) * 100, 100)}%` }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: obj.color }}
                        />
                      </div>
                      <button 
                        onClick={() => freeHeap(obj.id)}
                        className={`text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded transition-colors border ${
                          theme === 'dark' ? 'border-red-500/20 text-red-500/80 hover:bg-red-500 hover:text-white' : 'border-red-600/20 text-red-600/80 hover:bg-red-600 hover:text-white'
                        }`}
                      >
                        free()
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {heap.length === 0 && (
              <div className="col-span-1 md:col-span-2 py-12 flex flex-col items-center justify-center opacity-10">
                <Database size={32} className="mb-2" />
                <p className="text-[8px] font-black uppercase tracking-[0.4em]">Heap_Pool_Available</p>
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
