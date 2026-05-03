'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowUp, 
  ArrowDown, 
  Hash, 
  Database, 
  Activity, 
  Terminal,
  Eraser,
  RefreshCw,
  Info
} from 'lucide-react';

interface StackItem {
  id: string;
  value: string;
  color: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'system' | 'action' | 'result';
}

const COLORS = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
];

export default function InteractiveStack({ theme }: { theme: 'dark' | 'light' }) {
  const [stack, setStack] = useState<StackItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [lastAction, setLastAction] = useState<string>('IDLE');
  const [peeked, setPeeked] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const initialLogs: LogEntry[] = [
      { id: '1', timestamp: new Date().toLocaleTimeString(), message: 'STACK_INIT: SUCCESS', type: 'system' },
      { id: '2', timestamp: new Date().toLocaleTimeString(), message: 'MEMORY_ALLOC: 512KB', type: 'system' }
    ];
    setLogs(initialLogs);
  }, []);

  const addLog = (message: string, type: LogEntry['type'] = 'action') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const push = () => {
    if (!inputValue.trim()) return;
    const newItem: StackItem = {
      id: Math.random().toString(36).substr(2, 9),
      value: inputValue,
      color: COLORS[stack.length % COLORS.length],
    };
    setStack(prev => [newItem, ...prev]);
    setInputValue('');
    const actionMsg = `PUSH("${inputValue}")`;
    setLastAction(actionMsg);
    addLog(actionMsg);
    setPeeked(false);
  };

  const pop = () => {
    if (stack.length === 0) return;
    const popped = stack[0];
    setStack(prev => prev.slice(1));
    const actionMsg = `POP() -> "${popped.value}"`;
    setLastAction(actionMsg);
    addLog(actionMsg);
    setPeeked(false);
  };

  const peek = () => {
    if (stack.length === 0) return;
    setPeeked(true);
    const actionMsg = `PEEK() -> "${stack[0].value}"`;
    setLastAction(actionMsg);
    addLog(actionMsg, 'result');
    setTimeout(() => setPeeked(false), 2000);
  };

  const clear = () => {
    setStack([]);
    setLastAction('STACK_CLEAR');
    addLog('STACK_CLEAR', 'system');
    setPeeked(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') push();
  };

  const bgColor = theme === 'dark' ? 'bg-[#050505]' : 'bg-slate-50';
  const cardBg = theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-white';
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-black/10';
  const textColor = theme === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor} overflow-hidden font-sans`}>
      {/* Header */}
      <div className={`p-6 border-b ${borderColor} flex items-center justify-between backdrop-blur-md z-10 ${theme === 'dark' ? 'bg-black/40' : 'bg-white/40'}`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Database className="text-blue-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">LIFO_WAREHOUSE</h1>
            <div className="flex items-center gap-2 opacity-40">
              <span className="text-[10px] font-mono uppercase tracking-widest">Stack Data Structure</span>
              <div className="w-1 h-1 bg-white/20" />
              <span className="text-[10px] font-mono uppercase tracking-widest">O(1) Operations</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Stack Depth</span>
            <span className="text-2xl font-mono font-bold">{stack.length}</span>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Status</span>
            <span className={`text-xs font-black uppercase tracking-widest ${stack.length === 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {stack.length === 0 ? 'Empty' : 'Active'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Visualizer Area */}
        <div className="flex-1 relative flex flex-col items-center justify-end p-12 overflow-hidden bg-grid-white/[0.02]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          
          {/* The Actual Stack Container */}
          <div className={`relative w-80 border-x-4 border-b-4 ${borderColor} ${theme === 'dark' ? 'bg-white/[0.02]' : 'bg-black/[0.02]'} min-h-[500px] flex flex-col justify-end p-4 gap-2 transition-all`}>
            <div className="absolute -top-8 left-0 right-0 flex justify-center">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20">Admission_Top</span>
            </div>

            <AnimatePresence initial={false}>
              {stack.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ y: -200, opacity: 0, scale: 0.8 }}
                  animate={{ 
                    y: 0, 
                    opacity: 1, 
                    scale: 1,
                    boxShadow: index === 0 && peeked ? '0 0 30px rgba(59, 130, 246, 0.5)' : 'none'
                  }}
                  exit={{ x: 200, opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className={`w-full h-16 ${item.color} border-2 border-white/20 flex items-center justify-between px-6 relative group`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black opacity-30">[{stack.length - 1 - index}]</span>
                    <span className="text-lg font-black uppercase tracking-tight text-white">{item.value}</span>
                  </div>
                  
                  {index === 0 && (
                    <motion.div 
                      layoutId="top-indicator"
                      className="absolute -left-20 flex items-center gap-2"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Top_Pointer</span>
                      <ArrowRight size={14} className="text-blue-500" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {stack.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10">
                <Database size={64} />
                <span className="text-sm font-black uppercase tracking-widest mt-4">Buffer_Null</span>
              </div>
            )}
          </div>
        </div>

        {/* Control Panel */}
        <aside className={`w-[400px] border-l ${borderColor} ${cardBg} p-8 flex flex-col gap-8`}>
          {/* Operation Input */}
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-50">
              <Activity size={14} /> System_Operations
            </h2>
            
            <div className="relative">
              <input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter value..."
                className={`w-full bg-black/20 border ${borderColor} p-4 text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors uppercase`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
                <Hash size={16} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={push}
                className="py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                Push <ArrowDown size={16} />
              </button>
              <button 
                onClick={pop}
                disabled={stack.length === 0}
                className="py-4 border-2 border-red-500/50 hover:bg-red-500/10 text-red-500 font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
              >
                Pop <ArrowUp size={16} />
              </button>
            </div>
            
            <button 
              onClick={peek}
              disabled={stack.length === 0}
              className={`w-full py-4 border ${borderColor} hover:bg-white/5 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-30`}
            >
              Peek_Top <Info size={16} />
            </button>
          </div>

          {/* Console Log */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-50">
              <Terminal size={14} /> Operation_Log
            </h2>
            <div className={`flex-1 bg-black p-4 font-mono text-[10px] overflow-hidden relative border ${borderColor}`}>
              <div className="flex items-center gap-2 mb-4 p-2 bg-white/5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-500/70 font-bold uppercase">Kernel_Active</span>
              </div>
              
              <div className="space-y-2 opacity-60">
                {mounted ? (
                  <>
                    {logs.map((log) => (
                      <div key={log.id} className={
                        log.type === 'system' ? 'text-slate-500' : 
                        log.type === 'result' ? 'text-yellow-500 font-bold' : 
                        'text-blue-400'
                      }>
                        {`[${log.timestamp}] ${log.message}`}
                      </div>
                    ))}
                    <div className="animate-pulse">_</div>
                  </>
                ) : (
                  <div>[--:--:--] BOOTING_SYSTEM...</div>
                )}
              </div>
            </div>

            <button 
              onClick={clear}
              className="py-4 border border-white/5 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
            >
              Reset_Memory <RefreshCw size={12} />
            </button>
          </div>

          {/* Theory card */}
          <div className={`p-6 border border-dashed ${borderColor} bg-white/5 opacity-50`}>
             <h4 className="text-[9px] font-black uppercase tracking-[0.2em] mb-2 text-blue-400">Architect_Note</h4>
             <p className="text-[10px] leading-relaxed italic">
               "A stack is a linear data structure that follows the Last-In, First-Out (LIFO) principle. Think of it as a stack of cafeteria plates."
             </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ArrowRight({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
