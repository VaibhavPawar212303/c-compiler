'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Play, SkipForward, ArrowRight, Zap } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  currentLine: number;
  theme?: 'dark' | 'light';
}

const CodeEditor = ({
  code,
  setCode,
  currentLine,
  theme = 'dark'
}: CodeEditorProps) => {
  return (
    <section className={`flex-1 flex flex-col overflow-hidden transition-colors ${
      theme === 'dark' ? 'bg-[#0a0a0b]' : 'bg-white'
    }`}>
      {/* Editor Content Area */}
      <div className="flex-1 relative font-mono text-[13px] overflow-hidden">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`w-full h-full bg-transparent p-6 pl-14 resize-none focus:outline-none custom-scrollbar leading-[22px] relative z-10 selection:bg-blue-500/30 ${
            theme === 'dark' ? 'text-blue-100/90' : 'text-slate-800'
          }`}
          spellCheck={false}
        />

        {/* Line Number Gutter */}
        <div className={`absolute top-0 left-0 bottom-0 w-12 border-r pointer-events-none flex flex-col pt-6 items-center z-20 ${
          theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-black/5'
        }`}>
          {code.split('\n').map((_, i) => (
            <span 
              key={i} 
              className={`text-[10px] w-full h-[22px] flex items-center justify-center transition-colors ${
                i === currentLine 
                  ? (theme === 'dark' ? 'text-blue-400 font-bold bg-blue-500/20' : 'text-blue-600 font-bold bg-blue-500/10') 
                  : (theme === 'dark' ? 'text-slate-600' : 'text-slate-400')
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
            className={`absolute left-0 right-0 h-[22px] pointer-events-none z-0 border-y ${
              theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-500/5 border-blue-500/20'
            }`}
            initial={false}
            animate={{ top: currentLine * 22 + 24 }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          </motion.div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className={`px-4 py-2 border-t text-[10px] flex justify-between items-center ${
        theme === 'dark' ? 'bg-black/40 border-white/5 text-slate-500' : 'bg-slate-100 border-black/5 text-slate-500'
      }`}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold tracking-tight">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
            LN {currentLine + 1}
          </span>
          <span className="tracking-widest uppercase opacity-40">UTF-8</span>
          <span className="tracking-widest uppercase opacity-40">C (GCC)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 w-[1px] bg-slate-300/20" />
          <span className="opacity-60 uppercase tracking-widest font-mono">Kernel_v2.0</span>
        </div>
      </div>
    </section>
  );
};

export default CodeEditor;
