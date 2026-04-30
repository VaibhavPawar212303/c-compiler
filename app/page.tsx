'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  Database, 
  Trash2, 
  Plus, 
  Minus, 
  Info, 
  Tv, 
  ArrowRight,
  AlertTriangle,
  Zap,
  Warehouse,
  Wrench,
  Cpu,
  Monitor,
  Workflow,
  Terminal,
  Play,
  SkipForward
} from 'lucide-react';

// --- Types ---

interface StackFrame {
  id: string;
  functionName: string;
  variables: Variable[];
}

interface Variable {
  id: string;
  name: string;
  type: 'value' | 'pointer' | 'struct';
  value: string;
  address: string;
  size: number;
  targetId?: string;
  isMember?: boolean;
}

interface HeapObject {
  id: string;
  name: string;
  size: number;
  type: 'struct' | 'array' | 'image';
  color: string;
  address: string;
}

// --- Constants ---

const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
];

// --- Components ---

const PointerOverlay = ({ links, containerRef }: { links: {fromId: string, toId: string, color: string}[], containerRef: React.RefObject<HTMLDivElement | null> }) => {
  const [paths, setPaths] = useState<{d: string, color: string, id: string}[]>([]);

  useEffect(() => {
    let animationFrameId: number;

    const updatePaths = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();

      const newPaths = links.map(link => {
        const srcEl = document.getElementById(link.fromId);
        const destEl = document.getElementById(link.toId);

        if (srcEl && destEl) {
          const srcRect = srcEl.getBoundingClientRect();
          const destRect = destEl.getBoundingClientRect();

          // Offset from container's top-left
          const startX = srcRect.right - containerRect.left;
          const startY = srcRect.top + (srcRect.height / 2) - containerRect.top;
          const endX = destRect.left - containerRect.left;
          const endY = destRect.top + (destRect.height / 2) - containerRect.top;

          // Control points for a smooth S-curve
          const dist = Math.abs(endX - startX);
          const cpX = startX + dist * 0.4;

          return {
            id: `${link.fromId}-${link.toId}`,
            d: `M ${startX} ${startY} C ${cpX} ${startY}, ${endX - dist * 0.4} ${endY}, ${endX} ${endY}`,
            color: link.color
          };
        }
        return null;
      }).filter(Boolean) as {d: string, color: string, id: string}[];

      setPaths(newPaths);
      animationFrameId = requestAnimationFrame(updatePaths);
    };

    animationFrameId = requestAnimationFrame(updatePaths);
    return () => cancelAnimationFrame(animationFrameId);
  }, [links, containerRef]);

  return (
    <svg className="absolute inset-0 pointer-events-none z-[60] w-full h-full overflow-visible">
      <defs>
        {paths.map((p) => (
          <filter key={`glow-${p.id}`} id={`glow-${p.id}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        ))}
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orientation="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
        </marker>
      </defs>
      {paths.map((path) => (
        <g key={path.id}>
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.5 }}
            d={path.d}
            stroke={path.color}
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="4 4"
            filter={`url(#glow-${path.id})`}
            className="opacity-40"
          />
          <circle 
            cx={path.d.split(' ').pop()?.split(',')[0]} 
            cy={path.d.split(' ').pop()} 
            r="3" 
            fill={path.color}
            className="animate-pulse"
          />
        </g>
      ))}
    </svg>
  );
};

export default function MemoryArchitect() {
  const [stack, setStack] = useState<StackFrame[]>([]);
  const [heap, setHeap] = useState<HeapObject[]>([]);
  const [activeTab, setActiveTab] = useState<'visualizer' | 'theory'>('visualizer');
  const [statusMessage, setStatusMessage] = useState("SYSTEM_BOOT: READY");
  const [isMounted, setIsMounted] = useState(false);
  const [pointerLinks, setPointerLinks] = useState<{fromId: string, toId: string, color: string}[]>([]);
  const [isAutoStepping, setIsAutoStepping] = useState(false);
  const [code, setCode] = useState(`int main() {
  struct book {
    int bookPage;
    int bookPrice;
  };

  struct book b1;
  b1.bookPage = 42;

  int *ptr = malloc(8);
  free(ptr);

  return 0;
}`);
  const [currentLine, setCurrentLine] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-step logic
  useEffect(() => {
    if (isAutoStepping && currentLine >= 0) {
      stepTimerRef.current = setTimeout(() => {
        const lines = code.split('\n');
        if (currentLine < lines.length) {
          stepCode();
        } else {
          setIsAutoStepping(false);
        }
      }, 1000);
    } else {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    }
    return () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current); };
  }, [isAutoStepping, currentLine]);

  const runCode = () => {
    setStack([]);
    setHeap([]);
    setCurrentLine(0);
    setIsAutoStepping(true);
    setStatusMessage("COMPILING... KERNEL_EXECUTION_START");
    
    if (code.includes('void main') && code.includes('return 0')) {
      setStatusMessage("WARNING: Detected 'void main' with 'return 0'. This is a C syntax conflict.");
    }
  };

  const stepCode = () => {
    const lines = code.split('\n');
    if (currentLine < 0 || currentLine >= lines.length) {
      setIsAutoStepping(false);
      return;
    }

    const rawLine = lines[currentLine].trim();
    if (rawLine === '' || rawLine.startsWith('//')) {
      setCurrentLine(prev => prev + 1);
      return;
    }

    // Fix: Skip struct definition bodies
    if (rawLine.startsWith('struct') && (rawLine.includes('{') || rawLine.endsWith('{'))) {
      let depth = 0;
      let skipTo = -1;
      for (let i = currentLine; i < lines.length; i++) {
        const l = lines[i];
        if (l.includes('{')) depth++;
        if (l.includes('}')) depth--;
        if (depth === 0 && i !== currentLine) {
          skipTo = i;
          break;
        }
      }
      if (skipTo !== -1) {
        setCurrentLine(skipTo + 1);
        setStatusMessage("SKIP: Template defined. No memory allocated for pure definitions.");
        return;
      }
    }

    const line = rawLine.split(';')[0].trim();
    
    // 1. Function Entry
    if ((line.includes('void ') || line.includes('int ')) && line.includes('(') && !line.includes('=')) {
      const funcName = line.match(/(?:void|int)\s+(\w+)/)?.[1] || "main";
      pushFrame(funcName);
      setStatusMessage(`PUSH: New Stack Frame for ${funcName}(). Return address stored.`);
    } 
    // 2. Declaration with Assignment
    else if ((line.includes('int ') || line.includes('char ')) && line.includes('=') && !line.includes('malloc')) {
      const match = line.match(/(?:int|char)\s+(\w+)\s*=\s*(.+)/);
      if (match && stack.length > 0) {
        const [, name, val] = match;
        updateOrAddVariable(name, val, 'value');
        setStatusMessage(`INIT: Variable '${name}' assigned value ${val}.`);
      }
    } 
    // 3. Struct or Simple Declaration
    else if ((line.startsWith('struct ') || line.startsWith('int ') || line.startsWith('char ')) && !line.includes('=')) {
      const match = line.match(/(?:struct\s+(\w+)|int|char)\s+(\w+)/);
      if (match && stack.length > 0) {
        const typeName = line.startsWith('struct ') ? 'struct' : 'value';
        const name = match[2] || match[1]; 
        updateOrAddVariable(name, '0x00 (UNINIT)', typeName);
        setStatusMessage(`ALLOC: Stack space reserved for '${name}'. Memory contains garbage.`);
      }
    }
    // 4. Direct Assignment / Member Assignment (b1.bookPage = 10)
    else if (line.includes('=') && !line.includes('malloc')) {
      const match = line.match(/([\w\.]+)\s*=\s*(.+)/);
      if (match && stack.length > 0) {
        const [, name, val] = match;
        updateOrAddVariable(name, val);
        setStatusMessage(`WRITE: Stack write. '${name}' updated to ${val}.`);
      }
    }
    // 5. Malloc
    else if (line.includes('malloc')) {
      const isArray = line.includes('char') || line.includes('byte');
      const ptrMatch = line.match(/\*?(\w+)\s*=/);
      const ptrName = ptrMatch ? ptrMatch[1] : undefined;
      allocateHeap(isArray ? 'array' : 'struct', ptrName);
    }
    // 6. Free
    else if (line.includes('free')) {
      if (heap.length > 0) {
        const idToFree = heap[heap.length - 1].id;
        freeHeap(idToFree);
        setStatusMessage("FREE: Memory block marked as available in Heap pool.");
      }
    }
    // 7. Return
    else if (line.startsWith('return')) {
      const retVal = line.match(/return\s+(.+)/)?.[1];
      const currentFrame = stack[stack.length - 1];
      if (currentFrame?.functionName === 'main' && retVal) {
        if (code.includes('void main')) {
          setStatusMessage("ERROR: 'void' function 'main' attempted to return a value.");
          setCurrentLine(prev => prev + 1);
          return;
        }
      }
      if (stack.length > 0) {
        popFrame();
        setStatusMessage(`EXIT: Function returned ${retVal || ''}. Stack shrunk.`);
      }
    }
    // 8. Scope End
    else if (line === '}') {
      if (stack.length > 0) {
        popFrame();
        setStatusMessage("EXIT: Reaching end of scope. Reclaiming automatic storage.");
      }
    }

    setCurrentLine(prev => prev + 1);
  };

  const updateOrAddVariable = (name: string, value: string, type: 'value' | 'pointer' | 'struct' = 'value') => {
    setStack(prev => {
      const updated = [...prev];
      const topFrameIndex = updated.length - 1;
      const frame = updated[topFrameIndex];
      
      // Handle member assignment (e.g., b1.page)
      const isMemberAssignment = name.includes('.');
      const rootVarName = isMemberAssignment ? name.split('.')[0] : name;
      
      const varIndex = frame.variables.findIndex(v => v.name === rootVarName);
      
      if (varIndex > -1) {
        const newVars = [...frame.variables];
        if (isMemberAssignment) {
          // If it's a member assignment, we update the existing variable's value to reflect state
          // For simplicity in visualizer, we replace the value or append it
          const memberKey = name.split('.')[1];
          const currentValue = newVars[varIndex].value;
          let newValue = value;
          if (currentValue.includes('{')) {
            // Better parsing of struct display for visualization
            if (currentValue.includes(`${memberKey}:`)) {
              newValue = currentValue.replace(new RegExp(`${memberKey}:\\s*[^,}]+`), `${memberKey}: ${value}`);
            } else {
              newValue = currentValue.replace(' }', `, ${memberKey}: ${value} }`);
            }
          } else {
             newValue = `{ ${memberKey}: ${value} }`;
          }
          newVars[varIndex] = { ...newVars[varIndex], value: newValue, type: 'struct' };
        } else {
          newVars[varIndex] = { ...newVars[varIndex], value, type };
        }
        updated[topFrameIndex] = { ...frame, variables: newVars };
      } else {
        // Calculate address: start from frame ID (base) and subtract total size of existing variables
        const currentSize = frame.variables.reduce((sum, v) => sum + v.size, 0);
        const size = type === 'pointer' ? 8 : (type === 'struct' ? 12 : 4);
        // address of new variable = frame base address - currentSize - size
        const baseAddr = parseInt(frame.id, 16);
        const varAddrNum = baseAddr - currentSize - size;
        const address = `0x${varAddrNum.toString(16).toUpperCase()}`;

        updated[topFrameIndex] = {
          ...frame,
          variables: [...frame.variables, {
            id: Math.random().toString(),
            name: rootVarName,
            type,
            value: isMemberAssignment ? `{ ${name.split('.')[1]}: ${value} }` : value,
            address,
            size
          }]
        };
      }
      return updated;
    });
  };

  // Auto-scroll logs internally (not the whole page)
  useEffect(() => {
    const logContainer = logEndRef.current?.parentElement;
    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }, [statusMessage, stack]);

  // Sync pointer links whenever stack or heap changes
  useEffect(() => {
    const links: {fromId: string, toId: string, color: string}[] = [];
    stack.forEach(frame => {
      frame.variables.forEach(v => {
        if (v.type === 'pointer' && v.targetId) {
          const target = heap.find(h => h.id === v.targetId);
          if (target) {
            links.push({
              fromId: `ptr-src-${v.id}`,
              toId: `heap-dest-${v.targetId}`,
              color: target.color
            });
          }
        }
      });
    });
    setPointerLinks(links);
  }, [stack, heap]);
  
  const pushFrame = (name: string) => {
    // Stack grows from high addresses down
    const baseAddress = 0x7FFFFFFF;
    const offset = stack.length * 0x1000;
    const address = `0x${(baseAddress - offset).toString(16).toUpperCase()}`;
    
    const newFrame: StackFrame = {
      id: address,
      functionName: name,
      variables: [
        { 
          id: Math.random().toString(), 
          name: 'ret_addr', 
          type: 'value', 
          value: '0x400' + Math.floor(Math.random() * 99),
          address: address, // ret_addr is at the frame pointer
          size: 8
        }
      ]
    };
    setStack(prev => [...prev, newFrame]);
    setStatusMessage(`PUSH: Stack pointer moved DOWN to ${address}. LIFO: Only this new frame is accessible.`);
  };

  const popFrame = () => {
    if (stack.length === 0) return;
    const removed = stack[stack.length - 1];
    setStack(prev => prev.slice(0, -1));
    setStatusMessage(`POP: LIFO policy active. Removed top frame at ${removed.id}. Pointer moves UP.`);
  };

  const allocateHeap = (type: 'struct' | 'array' | 'image', ptrName?: string) => {
    if (stack.length === 0) {
      setStatusMessage("ERROR: NO_STACK_CONTEXT. Allocation requires active stack pointer.");
      return;
    }

    // Heap grows from low addresses up
    const baseAddress = 0x10000000;
    const offset = heap.length * 0x1000;
    const address = `0x${(baseAddress + offset).toString(16).toUpperCase()}`;

    const objectId = Math.random().toString(36).substr(2, 6);
    const newHeapObj: HeapObject = {
      id: objectId,
      name: type === 'struct' ? 'Object_Obj' : type === 'array' ? 'Buffer_Arr' : 'Asset_Img',
      size: type === 'struct' ? 1 : type === 'array' ? 2 : 3,
      type,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      address
    };

    setHeap(prev => [...prev, newHeapObj]);

    setStack(prev => {
      const updated = [...prev];
      const topFrameIndex = updated.length - 1;
      const frame = updated[topFrameIndex];
      const currentSize = frame.variables.reduce((sum, v) => sum + v.size, 0);
      const baseAddr = parseInt(frame.id, 16);
      const varAddrNum = baseAddr - currentSize - 8;
      const stackVarAddr = `0x${varAddrNum.toString(16).toUpperCase()}`;

      updated[topFrameIndex].variables.push({
        id: Math.random().toString(),
        name: ptrName || `p_${type.charAt(0)}`,
        type: 'pointer',
        value: address, // Correctly use heap address from outer scope
        address: stackVarAddr,
        size: 8,
        targetId: objectId
      });
      return updated;
    });

    setStatusMessage(`MALLOC: Heap expanded UP to ${address}. Remote control linked.`);
  };

  const freeHeap = (id: string) => {
    setHeap(prev => prev.filter(obj => obj.id !== id));
    setStatusMessage(`FREE: Memory at target address released to pool.`);
  };

  return (
    <div ref={containerRef} className="h-screen bg-[#070708] text-slate-300 font-sans selection:bg-blue-500/30 overflow-hidden relative">
      {/* Enhanced Background Architecture */}
      <div className="fixed inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none opacity-[0.15]" />
      <div className="fixed inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(7,7,8,0.8))] pointer-events-none" />

      {isMounted && <PointerOverlay links={pointerLinks} containerRef={containerRef} />}

      <header className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/50 rounded-lg flex items-center justify-center">
            <Cpu className="text-blue-400" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tighter text-white flex items-center gap-2 font-sans">
              ARCHITECT.MEM <span className="text-blue-500 text-[10px] px-2 py-0.5 border border-blue-500/40 rounded bg-blue-500/5 font-mono">STABLE_V2.0</span>
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-mono">Kernel Status: Online</p>
            </div>
          </div>
        </div>

        <nav className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          {[
            { id: 'visualizer', label: 'Monitor', icon: Monitor },
            { id: 'theory', label: 'Manual', icon: Workflow }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="relative z-10 max-w-[1800px] mx-auto p-4 lg:p-8 h-[calc(100vh-72px)] overflow-y-auto custom-scrollbar">
        {activeTab === 'visualizer' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* --- Controls Column --- */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* C-Code Simulator Editor */}
              <section className="bg-black/40 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[400px] backdrop-blur-xl group">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Terminal size={12} /> Live_C_Kernel
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={runCode}
                      className={`p-1.5 rounded transition-colors group/run ${isAutoStepping ? 'text-blue-500 bg-blue-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                      title="Run / Restart"
                    >
                      <Play size={14} className={`${isAutoStepping ? 'animate-pulse' : ''} group-active/run:scale-90 transition-transform`} />
                    </button>
                    <button 
                      onClick={() => { setIsAutoStepping(false); stepCode(); }}
                      disabled={currentLine === -1 || currentLine >= code.split('\n').length}
                      className="p-1.5 hover:bg-blue-500/10 text-blue-400 rounded transition-colors disabled:opacity-30 group/step"
                      title="Next Step"
                    >
                      <SkipForward size={14} className="group-active/step:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 relative font-mono text-[11px] overflow-hidden">
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-full bg-transparent p-4 pl-10 text-emerald-500/80 resize-none focus:outline-none custom-scrollbar leading-relaxed"
                    spellCheck={false}
                  />
                  {/* Line Number Gutter */}
                  <div className="absolute top-0 left-0 bottom-0 w-8 bg-black/40 border-r border-white/5 pointer-events-none flex flex-col pt-4 items-center gap-[4.5px] opacity-40">
                    {code.split('\n').map((_, i) => (
                      <span key={i} className={`text-[8px] ${i === currentLine ? 'text-blue-500 font-bold' : ''}`}>{i + 1}</span>
                    ))}
                  </div>
                  {/* Execution Pointer Overlay */}
                  {currentLine >= 0 && (
                    <motion.div 
                      layoutId="execution-pointer"
                      className="absolute left-0 right-0 h-[17.5px] bg-blue-500/10 border-y border-blue-500/20 pointer-events-none z-0"
                      initial={false}
                      animate={{ top: currentLine * 17.5 + 16 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
                <div className="p-3 bg-black/60 border-t border-white/5 text-[9px] text-slate-500 flex justify-between items-center italic">
                  <span>Target: x86_64_Kernel</span>
                  <span className="text-blue-500/50 uppercase tracking-tighter">Interpreter: Active</span>
                </div>
              </section>

              <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2 text-blue-400/80">
                  <Wrench size={12} /> Execution_Control
                </h3>
                
                <div className="space-y-3">
                    <div className="group relative">
                      <button 
                        onClick={() => pushFrame(`worker_${stack.length}`)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-500/20 active:scale-[0.98] transition-all font-bold group"
                      >
                        <span className="text-[11px] uppercase tracking-wider">Push Frame</span>
                        <Plus size={16} />
                      </button>
                      <div className="absolute bottom-full left-0 mb-4 w-64 p-4 bg-[#0d0d0f] border border-blue-500/30 rounded-xl text-[10px] opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 pointer-events-none z-[100] shadow-[0_20px_60px_rgba(0,0,0,0.9)] leading-relaxed backdrop-blur-xl">
                          <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold uppercase tracking-[0.2em] border-b border-blue-500/20 pb-1 font-mono">
                            <Info size={10} /> Instruction_Set
                          </div>
                          Pushes a new frame. Local variables are automatically managed in the <span className="text-blue-300 font-bold">LIFO Workbench</span>.
                      </div>
                    </div>

                  <button 
                    onClick={popFrame}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-500/10 border border-white/10 text-slate-400 rounded-xl hover:bg-slate-500/20 transition-all font-bold uppercase tracking-wider text-[11px]"
                  >
                    <span>Pop Frame</span>
                    <Minus size={16} />
                  </button>
                </div>

                <div className="mt-10">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2 text-emerald-400/80">
                    <Database size={12} /> Dyn_Allocation
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {['struct', 'array', 'image'].map(type => (
                      <button 
                        key={type}
                        onClick={() => allocateHeap(type as any)}
                        className="flex items-center justify-between px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all font-bold uppercase text-[11px] tracking-wider"
                      >
                        <span>Malloc_{type}</span>
                        <Zap size={14} className="opacity-40" />
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="bg-black border border-white/5 rounded-2xl p-6 overflow-hidden relative shadow-2xl">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Info size={48} />
                </div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  Console_Kernel
                </h3>
                <div className="space-y-1 h-36 overflow-y-auto custom-scrollbar pr-2 font-mono text-[10px]">
                  <div className="flex gap-2 text-blue-400/60 pb-1 border-b border-white/5 mb-2">
                    <span className="opacity-40">TIMESTAMP</span>
                    <span>EVENT_LOG</span>
                  </div>
                  <div className="flex gap-2 items-start py-0.5">
                    <span className="opacity-30 whitespace-nowrap">[{isMounted ? new Date().toLocaleTimeString() : '--:--:--'}]</span>
                    <span className="text-blue-400 break-words leading-tight">{statusMessage}</span>
                  </div>
                  {stack.length > 5 && (
                    <div className="flex gap-2 items-start py-0.5 text-red-500 animate-pulse bg-red-500/10 px-1 rounded">
                       <span className="opacity-30 whitespace-nowrap">!!:!!:!!</span>
                       <span className="font-bold uppercase">CRITICAL: STACK_NEAR_CAPACITY_LIMIT</span>
                    </div>
                  )}
                  <div ref={logEndRef} className="h-0" />
                </div>
              </section>
            </div>

            {/* --- The Stack (Workbench) --- */}
            <div className="lg:col-span-4 relative flex flex-col">
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              
              {/* Stack Growth Indicator (Improved Positioning) */}
              <div className="absolute -left-12 top-20 bottom-20 w-8 flex flex-col items-center justify-between pointer-events-none hidden sm:flex">
                <div className="text-[10px] text-blue-500/60 font-mono -rotate-90 origin-center whitespace-nowrap mb-12 uppercase tracking-[0.3em] border border-blue-500/20 px-2 py-0.5 rounded bg-blue-500/5 backdrop-blur-sm">0x7FFFFFFF</div>
                <div className="flex-1 w-[1px] bg-gradient-to-b from-blue-500/40 via-blue-500/10 to-transparent relative mx-auto">
                   <div className="absolute -bottom-1 -left-[4.5px] border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-blue-500/60" />
                </div>
                <div className="text-[10px] text-blue-500/40 font-mono rotate-90 origin-center whitespace-nowrap mt-16 uppercase tracking-[0.3em] font-bold">Stack Pointer</div>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-3xl h-[700px] flex flex-col overflow-hidden backdrop-blur-md flex-1 shadow-2xl">
                <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                   <span className="flex items-center gap-3 text-sm font-bold text-white tracking-widest">
                     <Layers className="text-blue-500" size={18} /> THE_STACK
                   </span>
                   <span className="text-[9px] px-2 py-0.5 border border-blue-500/30 text-blue-400 rounded-md uppercase font-bold tracking-tighter">LIFO_AUTO</span>
                </div>

                <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed custom-scrollbar">
                  <AnimatePresence initial={false}>
                    {stack.map((frame, index) => (
                      <motion.div
                        key={frame.id}
                        initial={{ y: -40, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ x: 50, opacity: 0, filter: 'blur(10px)' }}
                        className={`relative rounded-2xl border p-5 transition-all ${
                          index === stack.length - 1 
                            ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_20px_rgba(37,99,235,0.1)] z-10' 
                            : 'bg-white/[0.01] border-white/5 grayscale opacity-30 shadow-inner'
                        }`}
                      >
                        {index === stack.length - 1 && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-[8px] font-bold rounded-md border border-blue-400/50 shadow-[0_0_15px_#3b82f6]">
                            ACTIVE_FRAME
                          </div>
                        )}
                        <div className="absolute top-0 right-0 p-3 opacity-20">
                          <span className="text-[8px] font-mono uppercase tracking-widest">{frame.id}</span>
                        </div>
                        <h4 className="text-xs font-bold text-blue-400 mb-5 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                          {frame.functionName}()
                        </h4>
                        <div className="space-y-4">
                          {frame.variables.map((v, i) => {
                            const isPadded = i > 0 && frame.variables[i-1].type === 'value' && v.type === 'pointer';
                            return (
                              <React.Fragment key={v.id}>
                                {isPadded && (
                                  <div className="flex items-center gap-2 px-3 py-1 bg-red-500/5 border border-dashed border-red-500/20 rounded text-[8px] text-red-500/40 font-mono">
                                    [+4B PADDING_GAP]
                                  </div>
                                )}
                                <div 
                                  id={`ptr-src-${v.id}`}
                                  className="flex flex-col gap-2 p-3 rounded-xl bg-black/40 border border-white/5 group relative hover:border-blue-500/30 transition-all shadow-inner overflow-hidden"
                                >
                                  {/* Header: Name and Metadata */}
                                  <div className="flex items-center justify-between border-b border-white/[0.03] pb-2 mb-1">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]" />
                                      <span className="text-[10px] font-bold text-slate-300 tracking-tighter">var <span className="text-blue-400">'{v.name}'</span></span>
                                    </div>
                                    <span className="text-[8px] font-mono px-1.5 py-0.5 bg-blue-500/10 text-blue-500/60 rounded uppercase tracking-tighter">
                                      {v.type === 'pointer' ? 'PTR_64' : v.type === 'struct' ? 'STRUCT' : 'INT_32'}
                                    </span>
                                  </div>
                                  
                                  {/* Address and Value Row */}
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between px-2 py-1 bg-black/40 rounded border border-white/5">
                                      <span className="text-[9px] font-mono text-slate-500 italic">ADDR:</span>
                                      <span className="text-[9px] font-mono text-blue-400 font-bold">{v.address}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between px-2 py-1 bg-black/40 rounded border border-white/5">
                                      <span className="text-[9px] font-mono text-slate-500 italic">VAL:</span>
                                      <div className="flex items-center gap-2">
                                        {v.type === 'pointer' && <ArrowRight size={10} className="text-blue-500/60" />}
                                        <span className={`text-[10px] font-bold font-mono ${v.type === 'pointer' ? 'text-blue-400' : 'text-slate-200'}`}>
                                          {v.value}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Byte Cell Visualization */}
                                  <div className="mt-2">
                                    <div className="text-[7px] text-slate-600 uppercase mb-1 flex justify-between">
                                      <span>Byte Layout ({v.type === 'pointer' ? '8B' : '4B'})</span>
                                      <span>low-endian</span>
                                    </div>
                                    <div className="flex gap-1">
                                      {Array.from({length: v.type === 'pointer' ? 8 : 4}).map((_, bi) => (
                                        <div 
                                          key={bi} 
                                          className={`flex-1 h-3 rounded-sm border border-white/10 ${v.type === 'pointer' ? 'bg-blue-500/10' : 'bg-slate-500/5'} flex items-center justify-center`}
                                        >
                                          <div className={`w-1 h-1 rounded-full ${v.type === 'pointer' ? 'bg-blue-400/40' : 'bg-slate-400/20'}`} />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {stack.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-10">
                      <Layers size={80} strokeWidth={0.5} />
                      <p className="mt-4 text-[10px] font-bold tracking-[0.3em] uppercase">No_Active_Context</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* --- The Heap (Warehouse) --- */}
            <div className="lg:col-span-5 relative flex flex-col">
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              {/* Heap Growth Indicator (Improved Positioning) */}
              <div className="absolute -right-12 top-20 bottom-20 w-8 flex flex-col items-center justify-between pointer-events-none hidden sm:flex">
                <div className="text-[10px] text-emerald-500/60 font-mono -rotate-90 origin-center whitespace-nowrap mb-12 uppercase tracking-[0.3em] font-bold">Heap Pointer</div>
                <div className="flex-1 w-[1px] bg-gradient-to-t from-emerald-500/40 via-emerald-500/10 to-transparent relative">
                   <div className="absolute -top-1 -left-[4.5px] border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-emerald-500/60" />
                </div>
                <div className="text-[10px] text-emerald-500/40 font-mono rotate-90 origin-center whitespace-nowrap mt-16 uppercase tracking-[0.3em] border border-emerald-500/20 px-2 py-0.5 rounded bg-emerald-500/5 backdrop-blur-sm">0x10000000</div>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-3xl h-[700px] flex flex-col overflow-hidden backdrop-blur-md flex-1 shadow-2xl">
                <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                   <span className="flex items-center gap-3 text-sm font-bold text-white tracking-widest">
                     <Database className="text-emerald-500" size={18} /> THE_HEAP_STORAGE
                   </span>
                   <span className="text-[9px] px-2 py-0.5 border border-emerald-500/30 text-emerald-400 rounded-md uppercase font-bold tracking-tighter">DYNAMIC_MANUAL</span>
                </div>

                <div className="flex-1 p-8 overflow-y-auto bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] flex flex-col-reverse gap-6 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-6">
                    <AnimatePresence>
                      {heap.map((obj) => (
                        <motion.div
                          key={obj.id}
                          id={`heap-dest-${obj.id}`}
                          layout
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
                          className="relative group"
                          style={{ gridColumn: obj.size > 2 ? 'span 2' : 'span 1' }}
                        >
                          <div className="absolute inset-0 bg-black/40 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                          <div className="relative rounded-2xl border border-white/10 p-5 overflow-hidden min-h-[150px] flex flex-col justify-between group-hover:border-white/20 transition-all"
                               style={{ borderColor: `${obj.color}40`, background: `linear-gradient(135deg, ${obj.color}15 0%, transparent 100%)` }}>
                            
                            <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                              {obj.type === 'struct' ? <Tv size={64} /> : <Database size={64} />}
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-[9px] font-mono px-2 py-0.5 bg-black/50 rounded-md border border-white/10 text-white/50 tracking-tighter">{obj.address}</span>
                                <span className="text-[8px] opacity-30 font-mono">#{obj.id}</span>
                              </div>
                              <h5 className="text-[11px] font-bold text-white mb-1 uppercase tracking-[0.2em]">{obj.name}</h5>
                              <p className="text-[10px] text-slate-500 italic">Scope: GLOBAL</p>
                            </div>

                            <button 
                              onClick={() => freeHeap(obj.id)}
                              className="self-end mt-4 p-2 bg-black/40 border border-white/5 rounded-lg hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all group/btn shadow-lg"
                            >
                              <Trash2 size={14} className="group-active/btn:scale-95 transition-transform" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {heap.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-10">
                      <Warehouse size={80} strokeWidth={0.5} />
                      <p className="mt-4 text-[10px] font-bold tracking-[0.3em] uppercase">Warehouse_Vacant</p>
                    </div>
                  )}
                </div>

                {/* Leak Indicator Overlay */}
                {heap.length > 0 && stack.length === 0 && (
                  <div className="mx-8 mb-8 p-5 bg-red-500/10 border border-red-500/40 rounded-2xl flex items-center gap-4 animate-pulse backdrop-blur-md shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                    <AlertTriangle className="text-red-500" size={24} />
                    <div>
                      <p className="text-xs font-bold text-red-400 tracking-widest uppercase">Memory_Leak_Critical</p>
                      <p className="text-[10px] text-red-500/70 mt-1">Pointer lost. Data remains in Warehouse with no way to access or delete.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white/[0.02] border border-white/10 rounded-3xl p-10 flex flex-col backdrop-blur-sm shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <Layers size={120} />
              </div>
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <Layers className="text-blue-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-6 tracking-tight flex items-center gap-3">
                The Workbench <span className="text-blue-500 font-mono text-sm border border-blue-500/20 px-2 py-0.5 rounded bg-blue-500/5 tracking-tighter">BASE::STACK</span>
              </h2>
              <div className="space-y-6 text-slate-400 text-sm leading-relaxed flex-1 relative z-10">
                <p><strong className="text-blue-400 font-mono">DYNAMIC_CONTEXT:</strong> Scoped memory allocated per function call. Fast, rigid, and predictable.</p>
                <p><strong className="text-blue-400 font-mono">LIFO_MODULE:</strong> Last-In, First-Out. Automatically reclaimed when a function returns.</p>
                <div className="p-4 bg-blue-500/5 border-l-2 border-blue-500 rounded-r-xl italic font-mono text-[11px] text-blue-300/80">
                  "Exceeding stack depth results in STACK_OVERFLOW_EXC."
                </div>
              </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="bg-white/[0.02] border border-white/10 rounded-3xl p-10 flex flex-col backdrop-blur-sm shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <Warehouse size={120} />
              </div>
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <Warehouse className="text-emerald-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-6 tracking-tight flex items-center gap-3">
                The Warehouse <span className="text-emerald-500 font-mono text-sm border border-emerald-500/20 px-2 py-0.5 rounded bg-emerald-500/5 tracking-tighter">BASE::HEAP</span>
              </h2>
              <div className="space-y-6 text-slate-400 text-sm leading-relaxed flex-1 relative z-10">
                <p><strong className="text-emerald-400 font-mono">GLOBAL_STORE:</strong> Unstructured persistent memory. Shared across all functions until freed.</p>
                <p><strong className="text-emerald-400 font-mono">MANUAL_ALLOC:</strong> Requester must manage lifecycle. Slower search-and-allocate pattern.</p>
                <div className="p-4 bg-emerald-500/5 border-l-2 border-emerald-500 rounded-r-xl italic font-mono text-[11px] text-emerald-300/80">
                  "Forgotten references cause MEMORY_LEAK_ERR."
                </div>
              </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="bg-gradient-to-br from-blue-900/40 to-indigo-950/40 border border-white/10 rounded-3xl p-10 text-white flex flex-col shadow-2xl backdrop-blur-md"
            >
              <h2 className="text-2xl font-bold mb-8 tracking-tighter uppercase font-sans">System_Specs</h2>
              <div className="space-y-6 flex-1 font-mono">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                   <span className="text-[10px] uppercase opacity-40">PROPERTY</span>
                   <span className="text-[10px] font-bold opacity-60">STACK / HEAP</span>
                </div>
                {[
                  { m: 'Access_Speed', s: 'INSTANT', h: 'INDEXED' },
                  { m: 'Allocation', s: 'STATIC', h: 'DYNAMIC' },
                  { m: 'Lifetime', s: 'SCOPED', h: 'PERSISTENT' },
                  { m: 'Integrity', s: 'HIGH', h: 'FRAGILE' }
                ].map(row => (
                  <div key={row.m} className="flex items-center justify-between text-[11px] py-1 border-b border-white/[0.03]">
                    <span className="opacity-50 uppercase">{row.m}</span>
                    <span className="font-bold text-blue-400">{row.s} <span className="opacity-20 mx-1">|</span> <span className="text-emerald-400">{row.h}</span></span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-white/10">
                <p className="text-[10px] leading-relaxed opacity-60 italic font-mono">
                  "The pointer on the Stack is the control link to the data payload in the Warehouse."
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </main>

      <footer className="relative z-10 p-12 border-t border-white/5 text-center">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Diagnostic_Environment</p>
        <p className="text-[9px] text-slate-700 italic">Localhost rendering at port:3000. All memory addresses are emulated logical offsets.</p>
      </footer>
    </div>
  );
}
