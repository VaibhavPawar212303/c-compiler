'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Zap } from 'lucide-react';
import { StackFrame } from '../types/memory';

interface StackVisualizerProps {
  stack: StackFrame[];
  theme?: 'dark' | 'light';
}

const StackVisualizer = ({ stack, theme = 'dark' }: StackVisualizerProps) => {
  return (
    <div className="relative flex flex-col group">
      <div className={`border rounded-2xl flex flex-col overflow-hidden backdrop-blur-md flex-1 relative transition-all ${
        theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-black/5'
      }`}>
        {/* Memory Addresses Gutter Decoration */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
          theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-600/20'
        }`} />

        <div className="flex-1 p-6 flex flex-col gap-4 relative z-10 overflow-y-auto custom-scrollbar min-h-0">
          <AnimatePresence initial={false}>
            {[...stack].reverse().map((frame, index) => (
              <motion.div
                key={frame.id}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ x: 50, opacity: 0 }}
                className={`relative rounded-xl border p-5 transition-all ${
                  index === 0 
                    ? (theme === 'dark' ? 'bg-blue-500/10 border-blue-500/40 shadow-2xl ring-1 ring-blue-500/20' : 'bg-blue-50 border-blue-500 shadow-xl ring-1 ring-blue-200') 
                    : (theme === 'dark' ? 'bg-white/[0.01] border-white/5 opacity-40 grayscale' : 'bg-slate-50 border-slate-200 opacity-40')
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${
                      theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-500 text-blue-600'
                    }`}>
                      <Layers size={14} />
                    </div>
                    <div>
                      <h4 className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {frame.functionName}()
                      </h4>
                      <p className="text-[7px] font-mono opacity-40 uppercase tracking-tighter">Stack_Memory_Block</p>
                    </div>
                  </div>
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    theme === 'dark' ? 'bg-black/40 border-white/10 text-slate-500' : 'bg-slate-100 border-black/10 text-slate-400'
                  }`}>
                    {frame.id}
                  </span>
                </div>

                <div className={`space-y-1 pt-4 border-t ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
                  {frame.variables.map((v, i) => (
                    <motion.div 
                      key={v.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="group/var relative"
                    >
                      <div 
                        className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                          theme === 'dark' ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Address */}
                        <div className="w-[80px] shrink-0">
                          <code className={`text-[9px] font-mono block ${theme === 'dark' ? 'text-blue-400/60' : 'text-blue-600/60'}`}>
                            {v.address.toUpperCase()}
                          </code>
                        </div>

                        {/* Variable Name */}
                        <div className="min-w-[80px] shrink-0">
                          <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {v.name}
                          </span>
                        </div>
                        
                        {/* Value display */}
                        <div 
                          className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-md relative min-h-[32px] ${
                            theme === 'dark' ? 'bg-black/40 border border-white/5 shadow-inner' : 'bg-white border border-black/5 shadow-inner'
                          }`} 
                        >
                          {v.value.startsWith('{') ? (
                            <div className="w-full py-1">
                               {renderHierarchy(v.value, v.address, theme)}
                            </div>
                          ) : (
                            <>
                              <span 
                                className={`text-[11px] font-mono font-bold tracking-tight truncate ${
                                  v.type === 'pointer' ? 'text-emerald-400' : (theme === 'dark' ? 'text-white' : 'text-slate-900')
                                }`}
                              >
                                {v.value}
                              </span>
                              {v.type === 'pointer' && (
                                <Zap size={10} className="text-emerald-500/40 animate-pulse" />
                              )}
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
            <div className="py-12 flex flex-col items-center justify-center opacity-10">
              <Layers size={32} className="mb-2" />
              <p className="text-[8px] font-black uppercase tracking-[0.4em]">Stack_Buffer_Empty</p>
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
