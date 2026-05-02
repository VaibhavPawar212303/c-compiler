'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers } from 'lucide-react';
import { StackFrame } from '../types/memory';

interface StackVisualizerProps {
  stack: StackFrame[];
  theme?: 'dark' | 'light';
}

const StackVisualizer = ({ stack, theme = 'dark' }: StackVisualizerProps) => {
  return (
    <div className="relative flex flex-col group min-h-[750px]">
      <div className={`absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-20 ${
        theme === 'dark' ? 'bg-blue-600/30' : 'bg-blue-400/20'
      }`} />
      
      {/* Visual Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-none border ${
            theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-600/10 border-blue-600/20 text-blue-600'
          }`}>
            <Layers size={18} />
          </div>
          <div>
             <h3 className={`text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>The_Stack</h3>
             <p className="text-[9px] font-mono opacity-50 uppercase tracking-widest">LIFO Memory Allocation</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-none border text-[9px] font-black uppercase tracking-widest ${
          theme === 'dark' ? 'border-blue-500/30 text-blue-400 bg-blue-500/5' : 'border-blue-600/20 text-blue-600 bg-blue-600/5'
        }`}>
          Automatic_Storage
        </div>
      </div>

      <div className={`border rounded-none flex flex-col overflow-hidden backdrop-blur-md flex-1 shadow-2xl relative transition-all ${
        theme === 'dark' ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'
      }`}>
        {/* Memory Addresses Gutter */}
        <div className={`absolute right-4 top-10 bottom-10 w-[1px] ${
          theme === 'dark' ? 'bg-gradient-to-b from-blue-500/40 via-blue-500/10 to-transparent' : 'bg-gradient-to-b from-blue-600/30 via-blue-600/5 to-transparent'
        }`} />

        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar relative z-10">
          <AnimatePresence initial={false}>
            {[...stack].reverse().map((frame, index) => (
              <motion.div
                key={frame.id}
                initial={{ y: -40, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ x: 50, opacity: 0, filter: 'blur(10px)' }}
                className={`relative rounded-none border p-6 transition-all ${
                  index === 0 
                    ? (theme === 'dark' ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_40px_rgba(37,99,235,0.15)] ring-1 ring-blue-500/20' : 'bg-blue-50 border-blue-500 shadow-xl ring-1 ring-blue-200') 
                    : (theme === 'dark' ? 'bg-white/[0.01] border-white/5 opacity-40 grayscale-[0.8]' : 'bg-slate-50 border-slate-200 opacity-40')
                }`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-none animate-pulse ${theme === 'dark' ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-blue-600 shadow-[0_0_8px_#2563eb]'}`} />
                    <span className={`text-[11px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      CPU_Frame : <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}>{frame.functionName}()</span>
                    </span>
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-none border ${
                    theme === 'dark' ? 'bg-blue-500/5 border-blue-500/20 text-blue-500/60' : 'bg-blue-400/5 border-blue-400/20 text-blue-600'
                  }`}>
                    UID::{frame.id.substring(0, 8)}
                  </span>
                </div>

                <div className="space-y-4">
                  {frame.variables.map((v, i) => (
                    <motion.div 
                      key={v.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="group relative"
                    >
                      <div 
                        id={`p-addr-${v.address.toUpperCase()}`}
                        className={`flex flex-col gap-3 p-4 rounded-none border transition-all ${
                          theme === 'dark' ? 'bg-black/40 border-white/5 hover:border-blue-500/30' : 'bg-white border-black/5 hover:border-blue-500 shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-none border ${
                            theme === 'dark' ? 'bg-blue-500/5 border-white/5' : 'bg-blue-50/50 border-blue-100'
                          }`}>
                            <span className="text-[8px] font-mono opacity-50 uppercase tracking-tighter">0x{v.address.toUpperCase()}</span>
                            <span className={`text-[10px] font-bold tracking-tight ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                              <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}>{v.name}</span>
                            </span>
                          </div>
                          <span className={`text-[8px] font-black px-2 py-1 rounded-none uppercase tracking-widest ${
                            v.type === 'pointer' ? 'bg-emerald-500/10 text-emerald-500' : (theme === 'dark' ? 'bg-white/5 text-slate-500' : 'bg-slate-200 text-slate-600')
                          }`}>
                            {v.type}
                          </span>
                        </div>
                        
                        <div className={`flex items-center justify-between px-3 py-2 rounded-none relative ${
                          theme === 'dark' ? 'bg-black/60' : 'bg-slate-50'
                        }`} id={v.type === 'pointer' ? `p-src-${v.id}` : undefined}>
                          {v.value.startsWith('{') ? (
                            <div className="w-full">
                               <div className={`p-4 rounded-none border space-y-1.5 transition-colors overflow-hidden ${
                                 theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-black/5 shadow-inner'
                               }`}>

                                 {renderHierarchy(v.value, v.address, theme)}
                               </div>
                            </div>
                          ) : (
                            <>
                              <span className="text-[9px] font-mono opacity-30 uppercase tracking-widest">DATA_BUF::</span>
                              <span className={`text-xs font-mono font-bold ${
                                v.type === 'pointer' ? 'text-emerald-500 animate-pulse' : (theme === 'dark' ? 'text-white' : 'text-slate-900')
                              }`}>
                                {v.value}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {stack.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center pt-20 opacity-20 filter grayscale">
              <Layers size={64} className="mb-4 text-slate-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Stack_Empty</p>
            </div>
          )}
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
            theme === 'dark' ? 'border-white/5 hover:border-blue-500/30' : 'border-black/5 hover:border-blue-600'
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
                   : (theme === 'dark' ? 'text-blue-400' : 'text-blue-600 font-bold')
               }`}>
                 {child.isIndex ? 'IDX:' : 'MEM:'} <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}>{child.label}</span>
               </span>
            </div>
          </div>
          {child.value !== undefined && (
            <span className={`text-[10px] font-black border-b border-dashed tabular-nums ${
              theme === 'dark' ? 'text-emerald-400/80 border-emerald-500/20' : 'text-emerald-600 border-emerald-600/30'
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

export default StackVisualizer;
