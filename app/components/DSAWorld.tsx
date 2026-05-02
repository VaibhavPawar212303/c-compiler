'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Map as MapIcon, 
  ChevronRight, 
  Star, 
  Lock, 
  Unlock,
  Layers,
  Container,
  GitGraph,
  Share2,
  Brain,
  Zap,
  Target,
  Trophy,
  Info,
  Network,
  Plus,
  BookOpen,
  Wrench,
  Search,
  Activity
} from 'lucide-react';
import roadmapData from '../data/dsa-roadmap.json';

interface RoadmapNode {
  id: string;
  title: string;
  district: string;
  description: string;
  status: 'locked' | 'unlocked' | 'completed';
  topics: string[];
  tips: string;
  color: string;
  icon: string;
  difficulty?: string;
  complexity?: string;
}

const ICON_MAP: Record<string, any> = {
  Building2,
  MapIcon,
  Layers,
  Container,
  GitGraph,
  Share2,
  Brain,
  Zap,
  Target,
  Trophy,
  Network,
  Map: MapIcon
};

export default function DSAWorld({ theme }: { theme: 'dark' | 'light' }) {
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);
  const [userLevel, setUserLevel] = useState(1);
  const [xp, setXp] = useState(250);

  const cardBg = theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-white';
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-black/10';
  const textColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const mutedText = theme === 'dark' ? 'text-slate-500' : 'text-slate-400';

  const nodes = roadmapData as RoadmapNode[];

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
      {/* Top Banner: Stats (Fixed) */}
      <div className={`p-6 border-b shrink-0 ${borderColor} flex items-center justify-between backdrop-blur-md z-30 shadow-xl ${theme === 'dark' ? 'bg-black/60' : 'bg-white/60'}`}>
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">City Rank</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-emerald-500">LVL_{userLevel}</span>
              <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '45%' }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Architect XP</span>
            <span className={`text-xl font-bold ${textColor}`}>{xp} <span className="text-xs opacity-40">PTS</span></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="hidden lg:flex items-center gap-2 mr-4 px-3 py-1.5 bg-black/20 border border-white/5 rounded-none">
             <Search size={14} className="opacity-30" />
             <input 
               type="text" 
               placeholder="Search districts..." 
               className="bg-transparent border-none text-[10px] font-mono focus:outline-none w-32 placeholder:opacity-20"
             />
           </div>
           <button className={`px-4 py-2 border ${borderColor} text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500/10 transition-all`}>
             <Trophy size={14} className="text-yellow-500" />
             Leaderboard
           </button>
           <button className={`px-4 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all`}>
             Begin Mission
           </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Roadmap Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar scroll-smooth relative bg-grid-slate-900/[0.04] dark:bg-grid-white/[0.02]">
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20 pointer-events-none z-0" />
          <div className="max-w-4xl mx-auto space-y-32 relative pb-48 px-4">
             {/* Background Path Line */}
             <div className="absolute left-1/2 top-4 bottom-32 w-0.5 bg-gradient-to-b from-emerald-500/50 via-blue-500/20 to-transparent -translate-x-1/2 hidden md:block" />

             {nodes.map((node, i) => {
                const IconComp = ICON_MAP[node.icon] || Building2;
                return (
                  <motion.div 
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    className={`flex items-center gap-12 relative z-10 ${i % 2 === 0 ? 'flex-row' : 'md:flex-row-reverse'}`}
                  >
                    <div className={`flex-1 ${i % 2 === 0 ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block p-1 px-3 mb-3 border ${borderColor} text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500`}>
                        District_{i + 1}
                      </div>
                      <h3 className={`text-2xl font-black uppercase tracking-tighter ${textColor}`}>{node.title}</h3>
                      <p className={`mt-2 text-xs leading-relaxed opacity-60 max-w-sm ${i % 2 === 0 ? 'ml-auto' : 'mr-auto'}`}>
                        {node.description}
                      </p>
                    </div>

                    <div className="relative group">
                      {/* Interactive Pulse Circle */}
                      {node.status === 'unlocked' && (
                        <div className="absolute inset-0 -m-8 bg-emerald-500/10 rounded-full animate-ping pointer-events-none" />
                      )}
                      
                      <button 
                        onClick={() => setSelectedNode(node)}
                        className={`w-24 h-24 rounded-none border-2 flex items-center justify-center transition-all relative z-10 ${
                          node.status === 'locked' 
                            ? 'border-white/5 bg-black/40 text-slate-700' 
                            : selectedNode?.id === node.id
                              ? 'border-white bg-white/20 text-white scale-125 z-20 shadow-[0_0_60px_rgba(255,255,255,0.3)]'
                              : `border-emerald-500 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.15)] text-emerald-500 scale-110`
                        } hover:scale-125 hover:shadow-[0_0_50px_rgba(16,185,129,0.3)] group-hover:z-20`}
                      >
                        {node.status === 'locked' ? <Lock size={28} /> : <IconComp size={40} />}
                        
                        <div className="absolute -top-4 -right-4 w-10 h-10 rounded-none border border-white/10 bg-black flex items-center justify-center shadow-lg">
                           {node.status === 'unlocked' ? (
                             <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                               <Zap size={18} className="text-yellow-500" />
                             </motion.div>
                           ) : node.status === 'locked' ? (
                             <div className="w-3 h-3 bg-slate-800" />
                           ) : (
                             <Star size={18} className="text-emerald-500" fill="currentColor" />
                           )}
                        </div>
                      </button>
                    </div>

                    <div className="flex-1" />
                  </motion.div>
                );
             })}
          </div>
        </div>

        {/* Sidebar Info Panel (Fixed right) */}
        <aside className={`w-[400px] border-l shrink-0 ${borderColor} ${cardBg} flex flex-col z-40 relative overflow-hidden`}>
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div 
                key={selectedNode.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="p-8 flex flex-col h-full overflow-y-auto custom-scrollbar"
              >
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/5 transition-colors z-50 text-slate-500"
                >
                  <Plus size={20} className="rotate-45" />
                </button>

                <div className="space-y-8 h-full">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       {(() => {
                         const Icon = ICON_MAP[selectedNode.icon] || Building2;
                         return <Icon className="text-emerald-500" size={24} />;
                       })()}
                       <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{selectedNode.district}</span>
                     </div>
                     <h2 className={`text-3xl font-black uppercase tracking-tighter ${textColor}`}>{selectedNode.title}</h2>
                     <div className="flex gap-2 mt-3">
                        <span className="px-2 py-1 bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-emerald-400">
                          {selectedNode.difficulty || 'Unranked'}
                        </span>
                        <span className="px-2 py-1 bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-blue-400">
                          {selectedNode.complexity || 'Calculating...'}
                        </span>
                     </div>
                     <p className="mt-4 text-xs leading-relaxed opacity-60 italic">"{selectedNode.description}"</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Layers size={14} /> Architecture_Components
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedNode.topics.map(topic => (
                        <div key={topic} className={`p-3 border ${borderColor} flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group`}>
                           <span className="text-[10px] font-bold uppercase">{topic}</span>
                           <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`p-6 border ${borderColor} bg-blue-500/5 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Info size={40} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3">Architect_Tips</h4>
                    <p className="text-xs leading-relaxed text-blue-200/70">
                      {selectedNode.tips}
                    </p>
                  </div>

                  <div className="pt-4 pb-8 space-y-4 mt-auto">
                    <button className="w-full py-4 bg-emerald-500 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors">
                       Open_Documentation <BookOpen size={16} />
                    </button>
                    <button className={`w-full py-4 border ${borderColor} font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-colors`}>
                       View_Practice_Problems
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full p-12 text-center space-y-6"
              >
                <div className="w-16 h-16 rounded-none border border-dashed border-white/20 flex items-center justify-center text-white/10">
                   <Building2 size={32} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">District_Intelligence</h3>
                  <p className="text-xs text-slate-500 font-mono leading-relaxed">
                    Select a sector on the map to visualize its data structures and algorithmic complexity.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
}

