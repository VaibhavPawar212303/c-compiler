'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Square, 
  FastForward, 
  RefreshCw, 
  Terminal, 
  Tv, 
  Activity, 
  Wrench,
  Cpu,
  Database,
  Layers,
  Grid,
  Pause,
  RotateCcw,
  Lock
} from 'lucide-react';
import CodeEditor from './CodeEditor';
import StackVisualizer from './StackVisualizer';
import HeapVisualizer from './HeapVisualizer';
import { StackFrame, HeapObject } from '../types/memory';

interface CompilerCoreProps {
  theme: 'dark' | 'light';
  code: string;
  setCode: (code: string) => void;
  currentLine: number;
  compilerTab: 'visualizer' | 'theory';
  setCompilerTab: (tab: 'visualizer' | 'theory') => void;
  stack: StackFrame[];
  heap: HeapObject[];
  globals: any[];
  history: string[];
  isAutoStepping: boolean;
  setIsAutoStepping: (val: boolean) => void;
  isAwaitingInput: boolean;
  userInput: string;
  setUserInput: (val: string) => void;
  inputTarget: { name: string; type: string } | null;
  handleInputSubmit: (e: React.FormEvent) => void;
  runCode: () => void;
  stepCode: () => void;
  resetCompiler: () => void;
  logEndRef: React.RefObject<HTMLDivElement | null>;
  freeHeap: (id: string) => void;
}

export default function CompilerCore({
  theme,
  code,
  setCode,
  currentLine,
  compilerTab,
  setCompilerTab,
  stack,
  heap,
  globals,
  history,
  isAutoStepping,
  setIsAutoStepping,
  isAwaitingInput,
  userInput,
  setUserInput,
  inputTarget,
  handleInputSubmit,
  runCode,
  stepCode,
  resetCompiler,
  logEndRef,
  freeHeap
}: CompilerCoreProps) {
  return (
    <motion.div 
      key="compiler"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex overflow-hidden"
    >
      {/* LEFT COLUMN: FULL HEIGHT SOURCE CODE TERMINAL */}
      <section className={`w-[480px] min-w-[450px] flex flex-col border-r transition-colors flex-shrink-0 ${
        theme === 'dark' ? 'border-white/10 bg-black/60 shadow-2xl' : 'border-black/10 bg-white shadow-xl'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between z-10 ${
          theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-black/5'
        }`}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500/80" />
              <div className="w-2 h-2 rounded-full bg-amber-500/80" />
              <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white/40' : 'text-slate-900/40'}`}>
              Source_Kernel.c
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-black/20 rounded-full p-1 border border-white/5">
              <button 
                onClick={() => setIsAutoStepping(!isAutoStepping)}
                disabled={isAwaitingInput}
                title={isAutoStepping ? "Halt" : "Auto Step"}
                className={`p-1.5 rounded-full transition-all ${
                  isAutoStepping ? 'bg-orange-500 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                {isAutoStepping ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button 
                onClick={stepCode}
                disabled={isAutoStepping || isAwaitingInput}
                title="Step Forward"
                className="p-1.5 text-white/40 hover:text-white disabled:opacity-20 active:scale-90"
              >
                <FastForward size={14} />
              </button>
            </div>
            <button 
              onClick={resetCompiler}
              title="Reset Simulation"
              className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors active:scale-95"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden group">
          <CodeEditor 
            code={code} 
            setCode={setCode} 
            currentLine={currentLine} 
            theme={theme}
          />
        </div>
      </section>

      {/* RIGHT SIDE: MEMORY + METRICS + CONSOLE */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP REGION: ARCHITECTURAL MEMORY MAP */}
        <section className={`flex-1 overflow-y-auto custom-scrollbar transition-colors relative ${
          theme === 'dark' ? 'bg-[#030303]' : 'bg-white'
        }`}>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
          
          <div className="p-8 space-y-12 relative">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* THE STACK */}
              <section className="flex flex-col h-[500px] relative">
                <div className={`sticky top-0 z-20 flex items-center justify-between border-b-2 border-blue-500/20 pb-4 shrink-0 ${
                  theme === 'dark' ? 'bg-[#030303]' : 'bg-white'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <Layers size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <h2 className={`text-sm font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Stack
                      </h2>
                      <p className="text-[9px] font-mono opacity-40 uppercase">Automatic_Storage</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-blue-400">0x7FFFFFFF</span>
                </div>
                <div className="flex-1 min-h-0 pt-6">
                  <StackVisualizer theme={theme} stack={stack} />
                </div>
              </section>

              {/* THE HEAP */}
              <section className="flex flex-col h-[500px] relative">
                <div className={`sticky top-0 z-20 flex items-center justify-between border-b-2 border-emerald-500/20 pb-4 shrink-0 ${
                  theme === 'dark' ? 'bg-[#030303]' : 'bg-white'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <Database size={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <h2 className={`text-sm font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Heap
                      </h2>
                      <p className="text-[9px] font-mono opacity-40 uppercase">Dynamic_Pool</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">0x00001000</span>
                </div>
                <div className="flex-1 min-h-0 pt-6">
                  <HeapVisualizer theme={theme} heap={heap} freeHeap={freeHeap} />
                </div>
              </section>
            </div>

            {/* STATIC DATA / GLOBALS */}
            {globals.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 pt-8 border-t border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Grid size={14} className="text-amber-400" />
                  </div>
                  <h2 className={`text-xs font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Data_Segment
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
                  {globals.map(g => (
                    <motion.div 
                      layoutId={`global-${g.id}`}
                      key={g.id} 
                      className={`p-3 rounded-xl border group transition-all relative overflow-hidden ${
                        theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-white border-black/5 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter">_{g.name}</span>
                        <span className="text-[8px] font-mono opacity-30">{g.address}</span>
                      </div>
                      <div className={`text-lg font-mono font-black tabular-nums ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {g.value}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}
          </div>
        </section>

        {/* BOTTOM PANEL: SYSTEM METRICS & CONSOLE */}
        <section className={`h-[300px] shrink-0 flex flex-col border-t transition-colors ${
          theme === 'dark' ? 'border-white/10 bg-black/80' : 'border-black/10 bg-slate-100'
        }`}>
          <div className={`px-5 py-2.5 border-b flex items-center justify-between shrink-0 ${
            theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-white border-black/5'
          }`}>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">SYSTEM_BOOT: READY</span>
              </div>
              <div className="h-3 w-[1px] bg-white/10" />
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-orange-500" />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40 text-white">System_Metrics</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Tv size={12} className="text-sky-500" />
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40 text-white">Console_Output</span>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden relative">
            {/* CONSOLE (FULL WIDTH) */}
            <div className="flex-1 p-4 bg-black/40 overflow-hidden relative flex flex-col">
              <div className={`flex-1 rounded-xl border flex flex-col overflow-hidden shadow-inner relative ${
                theme === 'dark' ? 'bg-[#080809] border-white/5' : 'bg-white border-slate-200'
              }`}>
                <div className="flex-1 p-5 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed">
                  {history.length === 0 && (
                    <div className="h-full flex items-center justify-center opacity-10">
                      <span className="text-[10px] uppercase font-black tracking-[0.4em]">_Awaiting_Data_Stream_</span>
                    </div>
                  )}
                  {history.map((msg, i) => (
                    <div key={i} className="flex gap-5 py-1.5 border-b border-white/[0.02] items-start group">
                      <span className="opacity-10 shrink-0 w-8 text-right tabular-nums group-hover:opacity-30 transition-opacity">{i + 1}</span>
                      <span className={`${
                        msg.includes('ERROR') ? 'text-red-400 font-bold' : 
                        msg.includes('STDOUT') ? 'text-sky-300' : 
                        'text-emerald-400'
                      }`}>
                        {msg}
                      </span>
                    </div>
                  ))}
                  <div ref={logEndRef} className="h-6" />
                </div>

                {/* DYNAMIC I/O OVERLAY */}
                <AnimatePresence>
                  {isAwaitingInput && (
                    <motion.div 
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 100, opacity: 0 }}
                      className="absolute bottom-0 left-0 w-full p-4 bg-orange-600/95 backdrop-blur-md border-t border-white/20 shadow-2xl z-20"
                    >
                      <div className="flex items-center gap-6 max-w-4xl mx-auto">
                        <div className="shrink-0">
                          <header className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Input_Required</span>
                            <span className="text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded text-white/70">ptr: {inputTarget?.name}</span>
                          </header>
                        </div>
                        <div className="flex-1 flex gap-3">
                          <input
                            type="text"
                            placeholder={`Enter ${inputTarget?.type} value...`}
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(e as any)}
                            autoFocus
                            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:ring-2 focus:ring-white/50 outline-none transition-all"
                          />
                          <button
                            onClick={(e) => handleInputSubmit(e as any)}
                            className="bg-white text-orange-600 px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 transition-colors shadow-lg active:scale-95"
                          >
                            Execute
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

      </div>
    </motion.div>
  );
}
