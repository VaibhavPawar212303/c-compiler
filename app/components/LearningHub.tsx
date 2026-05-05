'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  Cpu, 
  Workflow, 
  Database, 
  Tv, 
  Zap 
} from 'lucide-react';
import learningHubData from '../data/learning-hub.json';

const LEARNING_ICONS: Record<string, React.ElementType> = {
  Cpu,
  Workflow,
  Database,
  Tv,
  Zap
};

interface LearningHubProps {
  theme: 'dark' | 'light';
  selectedChapter: number | null;
  setSelectedChapter: (id: number | null) => void;
  onDeployModule: (revisionId: string) => void;
}

export default function LearningHub({ 
  theme, 
  selectedChapter, 
  setSelectedChapter,
  onDeployModule
}: LearningHubProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="flex-1 overflow-y-auto p-12 custom-scrollbar"
    >
      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {selectedChapter === null ? (
            <motion.div 
              key="index"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <h2 className={`text-4xl font-black tracking-tighter uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  C_Learning_Path
                </h2>
                <p className="text-sm opacity-60 font-mono uppercase tracking-[0.2em]">
                  Master the foundations of system programming through structured modules.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {learningHubData.chapters.map((card) => {
                  const IconComp = LEARNING_ICONS[card.icon] || Zap;
                  return (
                    <button
                      key={card.id}
                      onClick={() => setSelectedChapter(card.id)}
                      className={`group p-8 border text-left transition-all hover:scale-[1.02] active:scale-95 ${
                        theme === 'dark' 
                          ? 'bg-black/60 border-white/5 hover:border-indigo-500/40 shadow-2xl' 
                          : 'bg-white border-black/10 shadow-lg hover:shadow-xl'
                      }`}
                    >
                       <div className="flex items-start justify-between mb-8">
                          <div className={`p-4 border ${theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-600/10 border-indigo-600/20'}`}>
                            <IconComp className="text-indigo-500" size={32} />
                          </div>
                          <span className="text-[10px] font-black opacity-20 uppercase tracking-[0.3em]">CHAPTER_0{card.id}</span>
                       </div>
                       <h3 className={`text-2xl font-black mb-4 group-hover:text-indigo-500 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {card.title}
                       </h3>
                       <p className="text-sm opacity-50 mb-8 leading-relaxed">{card.desc}</p>
                       <div className="flex items-center gap-2 text-indigo-500">
                          <span className="text-[10px] font-black uppercase tracking-widest">Start_Learning</span>
                          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chapter"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
               {(() => {
                 const chapter = learningHubData.chapters.find(c => c.id === selectedChapter);
                 if (!chapter) return null;

                 return (
                   <>
                     <button 
                       onClick={() => setSelectedChapter(null)}
                       className="flex items-center gap-3 text-emerald-500 group"
                     >
                       <div className="rotate-180"><ChevronRight size={20} /></div>
                       <span className="text-xs font-black uppercase tracking-widest">Back_to_Index</span>
                     </button>

                     <div className={`p-1 overflow-hidden border ${theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-white border-black/10 shadow-2xl'}`}>
                        <div className={`p-8 border-b ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-slate-50'}`}>
                           <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500 mb-4 block">MODULE_ANALYSIS_VIEW</span>
                           <h2 className={`text-5xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {chapter.fullTitle}
                           </h2>
                        </div>

                        <div className="p-12 space-y-16">
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                              <div className="space-y-8">
                                 <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">01_Conceptual_Framework</h4>
                                    <p className="text-lg opacity-80 leading-relaxed font-medium">
                                      {chapter.framework}
                                    </p>
                                 </div>
                                 <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">02_Key_Mechanics</h4>
                                    <ul className="space-y-4">
                                       {learningHubData.mechanics.map((item, idx) => (
                                         <li key={idx} className="flex gap-4 items-center text-sm opacity-60">
                                            <div className="w-1.5 h-1.5 bg-emerald-500" />
                                            {item}
                                         </li>
                                       ))}
                                    </ul>
                                 </div>
                              </div>

                              <div className={`p-8 border font-mono text-xs overflow-x-auto ${theme === 'dark' ? 'bg-black border-white/5' : 'bg-slate-900 text-white'}`}>
                                 <div className="flex justify-between mb-8 opacity-40">
                                    <span>EX_SYNTAX_REF.c</span>
                                    <span>UTF-8</span>
                                 </div>
                                 <pre className="space-y-1">
                                    {chapter.codeSnippet}
                                 </pre>
                              </div>
                           </div>

                           <div className={`flex flex-col md:flex-row items-center justify-between p-10 border ${theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-600/5 border-emerald-600/20'}`}>
                              <div className="mb-6 md:mb-0">
                                 <h4 className="text-xl font-black text-emerald-500 mb-2 italic tracking-tight">Ready for a live simulation?</h4>
                                 <p className="text-xs opacity-50 uppercase tracking-widest">Load related blueprint into the compiler core</p>
                              </div>
                              <button 
                                onClick={() => onDeployModule(chapter.relatedRevisionId)}
                                className="bg-emerald-500 hover:bg-emerald-400 text-black px-10 py-4 font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-95"
                              >
                                Deploy_Module
                              </button>
                           </div>
                        </div>
                     </div>
                   </>
                 );
               })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
