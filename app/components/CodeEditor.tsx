'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Play, SkipForward, ArrowRight, Zap } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  currentLine: number;
  runCode: () => void;
  stepCode: () => void;
  isAutoStepping: boolean;
  setIsAutoStepping: (val: boolean) => void;
  isAwaitingInput: boolean;
  userInput: string;
  setUserInput: (val: string) => void;
  inputTarget: { name: string; type: string } | null;
  handleInputSubmit: (e: React.FormEvent) => void;
}

const CodeEditor = ({
  code,
  setCode,
  currentLine,
  runCode,
  stepCode,
  isAutoStepping,
  setIsAutoStepping,
  isAwaitingInput,
  userInput,
  setUserInput,
  inputTarget,
  handleInputSubmit
}: CodeEditorProps) => {
  return (
    <section className="bg-black/60 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[750px] backdrop-blur-2xl group relative ring-1 ring-white/5">
      {/* Editor Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-white/[0.03] to-transparent">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5 px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.3)]" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
            <Terminal size={12} className="text-blue-400" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">main.c</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="h-6 w-[1px] bg-white/10 mx-2" />
          <button 
            onClick={runCode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all group/run shadow-lg ${
              isAutoStepping 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
            title="Run / Restart"
          >
            <Play size={12} className={`${isAutoStepping ? 'animate-pulse' : ''}`} />
            <span className="text-[9px] font-bold uppercase tracking-tight">{isAutoStepping ? 'Executing...' : 'Run'}</span>
          </button>
          
          <button 
            onClick={() => { setIsAutoStepping(false); stepCode(); }}
            disabled={currentLine === -1 || currentLine >= code.split('\n').length}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-xl hover:bg-blue-500/30 transition-all disabled:opacity-20 group/step shadow-lg"
            title="Step Over (F10)"
          >
            <SkipForward size={12} className="group-active/step:translate-x-0.5 transition-transform" />
            <span className="text-[9px] font-bold uppercase tracking-tight">Step</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 relative font-mono text-[12px] overflow-hidden bg-black/20">
        <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-overlay opacity-20">
          <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-blue-500/20 to-transparent" />
        </div>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-full bg-transparent p-4 pl-12 text-blue-100/90 resize-none focus:outline-none custom-scrollbar leading-[20px] relative z-10 selection:bg-blue-500/30"
          spellCheck={false}
        />

        {/* Line Number Gutter */}
        <div className="absolute top-0 left-0 bottom-0 w-10 bg-black/40 border-r border-white/5 pointer-events-none flex flex-col pt-4 items-center gap-0 z-20">
          {code.split('\n').map((_, i) => (
            <span 
              key={i} 
              className={`text-[9px] w-full h-[20px] flex items-center justify-center transition-colors ${
                i === currentLine ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-slate-600'
              }`}
            >
              {i + 1}
            </span>
          ))}
        </div>

        {/* Execution Pointer Overlay */}
        {currentLine >= 0 && (
          <motion.div 
            layoutId="execution-pointer"
            className="absolute left-0 right-0 h-[20px] bg-blue-500/15 border-y border-blue-500/30 pointer-events-none z-0"
            initial={false}
            animate={{ top: currentLine * 20 + 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          </motion.div>
        )}

        {/* Scanf Input Overlay */}
        <AnimatePresence>
          {isAwaitingInput && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md z-40 flex items-center justify-center p-6 border border-blue-500/20 m-2 rounded-2xl shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-emerald-500/5 pointer-events-none" />
              <motion.form 
                initial={{ scale: 0.9, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                onSubmit={handleInputSubmit} 
                className="w-full max-w-[280px] space-y-5 relative z-10"
              >
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full mb-2">
                    <Zap size={10} className="text-blue-400" />
                    <span className="text-[9px] text-blue-400 font-bold uppercase tracking-[0.2em]">StdIn_Request</span>
                  </div>
                  <p className="text-white text-sm font-medium">Input for <span className="text-blue-400 font-mono">'{inputTarget?.name}'</span></p>
                  <p className="text-slate-500 text-[10px] italic">Execution paused by kernel...</p>
                </div>

                <div className="relative group">
                  <input 
                    autoFocus
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Enter value..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-emerald-400 font-mono text-base focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700 shadow-inner"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400/30">
                    <ArrowRight size={18} />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 group"
                >
                  Confirm Input <Zap size={12} className="group-hover:rotate-12 transition-transform" />
                </button>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info Bar */}
      <div className="px-4 py-2 bg-black/80 border-t border-white/5 text-[10px] text-slate-500 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold tracking-tight">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
            LN {currentLine + 1}
          </span>
          <span className="tracking-widest uppercase opacity-40">UTF-8</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-emerald-500/60 font-bold uppercase tracking-tighter italic">C_INTERPRETER_ACTIVE</span>
          <div className="h-3 w-[1px] bg-white/10" />
          <span className="text-blue-500/50 uppercase tracking-[0.2em]">x86_64</span>
        </div>
      </div>
    </section>
  );
};


export default CodeEditor;
