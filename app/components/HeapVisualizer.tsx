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
    <div className="lg:col-span-4 flex flex-col">
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
                    <div className="flex items-center gap-2">
                       <div className="flex items-center gap-2 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                         <span className="text-[7px] font-mono text-emerald-400 opacity-70">
                           [ ADDR: {obj.address} ]
                         </span>
                         <span className="text-[9px] font-bold text-white tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: obj.color }} />
                            ALLOC: {obj.name}
                         </span>
                       </div>
                    </div>
                    <button 
                      onClick={() => freeHeap(obj.id)}
                      className="p-1 hover:bg-red-500/10 text-red-500/40 hover:text-red-500 transition-colors rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  
                  <div className="flex-1 p-4 flex flex-col justify-center gap-4 overflow-hidden">
                    <div className="flex flex-col gap-1.5 mt-2 bg-black/40 p-3 rounded-xl border border-white/5 max-h-[140px] overflow-y-auto custom-scrollbar transition-all group-hover:border-emerald-500/20">
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Memory_Storage:</span>
                      <div className="text-[10px] font-mono text-slate-300">
                        {obj.value && obj.value.startsWith('{') ? (
                          <div className="space-y-1">
                            {renderHierarchy(obj.value, obj.address)}
                          </div>
                        ) : (
                          <span className="text-emerald-400 font-bold">{obj.value || '0x00'}</span>
                        )}
                      </div>
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

interface TreeNode {
  key: string;
  label: string;
  value?: string;
  address: string;
  children: Map<string, TreeNode>;
  isIndex: boolean;
}

const renderHierarchy = (valueStr: string, baseAddr: string) => {
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
      <div key={child.key + cIdx} className="space-y-0.5">
        <div 
          className="flex items-center justify-between group/line py-0.5 border-l border-white/5 hover:border-emerald-500/20"
          style={{ marginLeft: `${depth * 12}px`, paddingLeft: '8px' }}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[7px] font-mono text-slate-600 transition-opacity whitespace-nowrap">
              [ ADDR: {child.address} ]
            </span>
            <div className="flex items-center gap-1 overflow-hidden">
               {depth > 0 && <span className="text-slate-700 text-[8px]">├─</span>}
               <span className={`text-[9px] font-mono truncate ${child.isIndex ? 'text-slate-500' : 'text-emerald-500/80 font-bold'}`}>
                 {child.isIndex ? 'ELEMENT:' : 'MEMBER:'} {child.label}
               </span>
            </div>
          </div>
          {child.value !== undefined && (
            <span className="text-white text-[9px] font-bold ml-2 tabular-nums">
              = {child.value}
            </span>
          )}
        </div>
        {child.children.size > 0 && (
           <div className="space-y-0.5 border-l border-white/5 ml-2">
             {renderRecursive(child, depth + 1)}
           </div>
        )}
      </div>
    ));
  };

  return <div className="space-y-0.5">{renderRecursive(root)}</div>;
};

export default HeapVisualizer;
