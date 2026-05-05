'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  Cpu, 
  Workflow, 
  Network, 
  BookOpen, 
  Zap, 
  Moon, 
  Sun 
} from 'lucide-react';

interface TopNavigationProps {
  theme: 'dark' | 'light';
  setTheme: React.Dispatch<React.SetStateAction<'dark' | 'light'>>;
  mainTab: 'compiler' | 'dsa' | 'revision' | 'learning';
  setMainTab: (tab: 'compiler' | 'dsa' | 'revision' | 'learning') => void;
  enableBeta?: boolean;
}

export default function TopNavigation({ 
  theme, 
  setTheme, 
  mainTab, 
  setMainTab,
  enableBeta = false
}: TopNavigationProps) {
  return (
    <header className={`relative z-40 border-b px-8 py-5 flex items-center justify-between backdrop-blur-3xl ${
      theme === 'dark' ? 'border-white/5 bg-black/60' : 'border-black/5 bg-white/70 shadow-sm'
    }`}>
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-5">
          <div className={`w-12 h-12 flex items-center justify-center border-l-2 ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-blue-600/10 border-blue-600 text-blue-600'}`}>
            <Cpu size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tighter uppercase leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Kernel_Trace <span className="text-[10px] font-mono text-blue-500 ml-2 tracking-widest opacity-60">RUNTIME_ENV_V2</span>
            </h1>
            <p className="text-[9px] font-mono opacity-40 uppercase tracking-[0.4em] mt-2">Physical Memory Allocation Visualizer</p>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-2 border-l border-white/5 pl-10 h-10">
          <button 
            onClick={() => setMainTab('compiler')}
            className={`px-6 h-full text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 group ${
              mainTab === 'compiler' 
                ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-600') 
                : (theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
            }`}
          >
            <Workflow size={14} className="group-hover:rotate-12 transition-transform" />
            Compiler_Core
            {mainTab === 'compiler' && (
              <motion.div layoutId="navIndicator" className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-blue-500" />
            )}
          </button>

          <button 
            onClick={() => setMainTab('revision')}
            className={`px-6 h-full text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 group ${
              mainTab === 'revision' 
                ? (theme === 'dark' ? 'text-amber-400' : 'text-amber-600') 
                : (theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
            }`}
          >
            <BookOpen size={14} className="group-hover:scale-110 transition-transform" />
            Revision_Lab
            {mainTab === 'revision' && (
              <motion.div layoutId="navIndicator" className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-amber-500" />
            )}
          </button>

          {/* {enableBeta && (
            <>
              <button 
                onClick={() => setMainTab('dsa')}
                className={`px-6 h-full text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 group ${
                  mainTab === 'dsa' 
                    ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600') 
                    : (theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                }`}
              >
                <Network size={14} className="group-hover:scale-110 transition-transform" />
                World_Space
                {mainTab === 'dsa' && (
                  <motion.div layoutId="navIndicator" className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-emerald-500" />
                )}
              </button>
              <button 
                onClick={() => setMainTab('learning')}
                className={`px-6 h-full text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 group ${
                  mainTab === 'learning' 
                    ? (theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600') 
                    : (theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                }`}
              >
                <Zap size={14} className="group-hover:scale-110 transition-transform" />
                Learning_Hub
                {mainTab === 'learning' && (
                  <motion.div layoutId="navIndicator" className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-indigo-500" />
                )}
              </button>
            </>
          )} */}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button 
           onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
           className={`p-2 rounded-none border transition-all hover:bg-opacity-80 active:scale-95 ${
             theme === 'dark' 
               ? 'border-white/10 text-yellow-500 bg-white/5' 
               : 'border-black/10 text-orange-600 bg-slate-50'
           }`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
