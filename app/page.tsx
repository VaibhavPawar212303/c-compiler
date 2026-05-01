'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Minus, 
  Tv, 
  Workflow, 
  Monitor,
  Wrench,
  Cpu,
  Database,
  Zap
} from 'lucide-react';
import PointerOverlay from './components/PointerOverlay';
import CodeEditor from './components/CodeEditor';
import StackVisualizer from './components/StackVisualizer';
import HeapVisualizer from './components/HeapVisualizer';
import { StackFrame, HeapObject, PointerLink, LoopState } from './types/memory';

// --- Constants ---

const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
];

export default function MemoryArchitect() {
  const [stack, setStack] = useState<StackFrame[]>([]);
  const [heap, setHeap] = useState<HeapObject[]>([]);
  const [activeTab, setActiveTab] = useState<'visualizer' | 'theory'>('visualizer');
  const [statusMessage, setStatusMessage] = useState("SYSTEM_BOOT: READY");
  const [isMounted, setIsMounted] = useState(false);
  const [pointerLinks, setPointerLinks] = useState<PointerLink[]>([]);
  const [isAutoStepping, setIsAutoStepping] = useState(false);
  const [isAwaitingInput, setIsAwaitingInput] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [inputTarget, setInputTarget] = useState<{name: string, type: string} | null>(null);
  const [loopStack, setLoopStack] = useState<LoopState[]>([]);
  
  const [code, setCode] = useState(`int main() {
  struct book {
    int bookPage;
    int bookPrice;
    char bookName;
  };
  
  struct book b[5];
  
  for(int i=0; i<5; i++) {
    printf("Processing Book %d", i);
    printf("Enter the value for book pages: ");
    scanf("%d", &b[i].bookPage);

    printf("Enter the value for book price: ");
    scanf("%d", &b[i].bookPrice);

    printf("Enter the value for book Name: ");
    scanf("%d", &b[i].bookName);
  }
  
  return 0;
}`);
  const [currentLine, setCurrentLine] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const pushFrame = useCallback((name: string) => {
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
          address: address,
          size: 8
        }
      ]
    };
    setStack(prev => [...prev, newFrame]);
    setStatusMessage(`PUSH: Stack pointer moved DOWN to ${address}. LIFO: Only this new frame is accessible.`);
  }, [stack.length]);

  const popFrame = useCallback(() => {
    setStack(prev => {
        if (prev.length === 0) return prev;
        const removed = prev[prev.length - 1];
        setStatusMessage(`POP: LIFO policy active. Removed top frame at ${removed.id}. Pointer moves UP.`);
        return prev.slice(0, -1);
    });
  }, []);

  const updateOrAddVariable = useCallback((name: string, value: string, type: 'value' | 'pointer' | 'struct' | 'array' = 'value') => {
    setStack(prev => {
      const updated = [...prev];
      if (updated.length === 0) return prev;
      
      const topFrameIndex = updated.length - 1;
      const frame = updated[topFrameIndex];
      
      // Handle array and member assignment (e.g., b[i].page)
      const isMemberAssignment = name.includes('.');
      const isArrayAccess = name.includes('[');
      
      let rootVarName = name;
      if (isMemberAssignment || isArrayAccess) {
        rootVarName = name.split(/[.\[]/)[0];
      }
      
      const varIndex = frame.variables.findIndex(v => v.name === rootVarName);
      
      if (varIndex > -1) {
        const newVars = [...frame.variables];
        const existingVar = newVars[varIndex];

        if (isMemberAssignment || isArrayAccess) {
          // Simplistic simulation of members/arrays
          let newValue = existingVar.value;
          if (newValue === '0x00 (UNINIT)') newValue = '{}';
          
          const subKey = name.replace(rootVarName, '');
          if (newValue.includes(subKey + ':')) {
             newValue = newValue.replace(new RegExp(`\\${subKey}:\\s*[^,}]+`), `${subKey}: ${value}`);
          } else {
             if (newValue === '{}') {
                newValue = `{${subKey}: ${value}}`;
             } else {
                newValue = newValue.replace('}', `, ${subKey}: ${value}}`);
             }
          }
          
          newVars[varIndex] = { ...existingVar, value: newValue, type: existingVar.type === 'array' ? 'array' : 'struct' };
        } else {
          newVars[varIndex] = { ...existingVar, value, type };
        }
        updated[topFrameIndex] = { ...frame, variables: newVars };
      } else {
        const currentSize = frame.variables.reduce((sum, v) => sum + v.size, 0);
        const size = type === 'pointer' ? 8 : (type === 'struct' ? 12 : type === 'array' ? 40 : 4);
        const baseAddr = parseInt(frame.id, 16);
        const varAddrNum = baseAddr - currentSize - size;
        const address = `0x${varAddrNum.toString(16).toUpperCase()}`;

        updated[topFrameIndex] = {
          ...frame,
          variables: [...frame.variables, {
            id: Math.random().toString(),
            name: rootVarName,
            type,
            value: (isMemberAssignment || isArrayAccess) ? `{${name.replace(rootVarName, '')}: ${value}}` : value,
            address,
            size
          }]
        };
      }
      return updated;
    });
  }, []);

  const evaluateExpression = useCallback((expr: string): string => {
    let replacedExpr = expr.trim();
    if (stack.length === 0) return replacedExpr;
    const currentFrame = stack[stack.length - 1];

    // 1. Resolve variables and complex accesses in the expression
    // Sort variables by name length descending to avoid partial matches
    const sortedVars = [...currentFrame.variables].sort((a, b) => b.name.length - a.name.length);

    let finalExpr = replacedExpr;
    
    // Pattern for complex access: b[i].page or b[0].page or b1.page
    // This loop resolves variables and their values before the final eval
    let iterations = 0;
    while (iterations < 20) {
      iterations++;
      // Match words that look like variables, potentially with [index] and .member
      const match = finalExpr.match(/(\b[a-zA-Z_]\w*\b)(?:\[([^\]]+)\])?(?:\.([\w]+))?/);
      if (!match) break;

      const [fullMatch, root, indexExpr, member] = match;
      
      // Keywords to ignore
      if (['int', 'char', 'void', 'struct', 'if', 'for', 'while', 'return', 'printf', 'scanf'].includes(root)) {
        finalExpr = finalExpr.replace(fullMatch, `__KEY__${fullMatch}__`);
        continue;
      }

      const v = sortedVars.find(v => v.name === root);
      
      if (v) {
        let resolvedValue = v.value;
        if (v.type === 'array' || v.type === 'struct') {
          // Resolve index if it's a variable or expression
          let index = indexExpr;
          if (index && isNaN(Number(index))) {
             index = evaluateExpression(index);
          }

          const lookupKey = `${index ? `[${index}]` : ''}${member ? `.${member}` : ''}`;
          // Extract specific value from the simulated structure/array string
          const valMatch = v.value.match(new RegExp(`\\${lookupKey}:\\s*([^,}]+)`));
          resolvedValue = valMatch ? valMatch[1].trim() : '0';
        }
        
        // Escape for regex and replace the specific variable instance
        const escaped = fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        finalExpr = finalExpr.replace(new RegExp(`\\b${escaped}\\b`), resolvedValue);
      } else {
        // Not a monitored variable, skip it to avoid infinite loop
        finalExpr = finalExpr.replace(fullMatch, `__SKIP__${fullMatch}__`);
      }
    }
    
    // Restore skipped parts
    finalExpr = finalExpr.replace(/__KEY__|__SKIP__|__/g, '');

    // Now it should be purely numeric/logic for evaluation
    try {
        // Simple logic transformations for JS eval compatibility
        const jsExpr = finalExpr
          .replace(/&&/g, ' && ')
          .replace(/\|\|/g, ' || ')
          .replace(/!/g, ' ! ');
          
        // eslint-disable-next-line no-eval
        const result = eval(jsExpr);
        return result !== undefined ? result.toString() : finalExpr;
    } catch (e) {
      return finalExpr;
    }
  }, [stack]);

  const stepCode = useCallback(() => {
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

    if (rawLine.startsWith('struct') && (rawLine.includes('{') || rawLine.endsWith('{')) && !rawLine.includes(';')) {
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

    // Special handling for lines: don't split by semicolon if it's a for loop header
    const line = rawLine.startsWith('for') ? rawLine : rawLine.split(';')[0].trim();
    
    // For Loop Logic
    if (line.match(/^for\s*\(/)) {
      const match = line.match(/for\s*\(([^;]*);\s*([^;]*);\s*([^)]*)\)/);
      if (match) {
        const [init, cond, incr] = [match[1].trim(), match[2].trim(), match[3].trim()];
        
        let depth = 0;
        let bodyEnd = -1;
        for (let i = currentLine; i < lines.length; i++) {
          if (lines[i].includes('{')) depth++;
          if (lines[i].includes('}')) depth--;
          if (depth === 0 && i !== currentLine) {
            bodyEnd = i;
            break;
          }
        }

        const existingLoop = loopStack.find(l => l.startLine === currentLine);
        
        if (!existingLoop) {
          if (init.includes('int ')) {
            const initMatch = init.match(/int\s+(\w+)\s*=\s*(.+)/);
            if (initMatch) updateOrAddVariable(initMatch[1], evaluateExpression(initMatch[2]), 'value');
          } else if (init.includes('=')) {
            const initMatch = init.match(/(\w+)\s*=\s*(.+)/);
            if (initMatch) updateOrAddVariable(initMatch[1], evaluateExpression(initMatch[2]), 'value');
          }
          
          setLoopStack(prev => [...prev, {
            type: 'for',
            startLine: currentLine,
            condition: cond,
            increment: incr,
            bodyEndLine: bodyEnd
          }]);
          setStatusMessage(`LOOP_INIT: Initialized '${init}'. Next: check '${cond}'.`);
          // Return early to allow state to settle before condition check
          return;
        } else {
          setStatusMessage(`LOOP_CYCLE: Re-evaluating condition '${cond}'...`);
        }

        const condVal = evaluateExpression(cond);
        // eslint-disable-next-line no-eval
        const isTrue = eval(condVal);
        
        if (isTrue) {
          setCurrentLine(prev => prev + 1);
          setStatusMessage(`LOOP: '${cond}' is TRUE. Next iteration...`);
        } else {
          setLoopStack(prev => prev.filter(l => l.startLine !== currentLine));
          setCurrentLine(bodyEnd + 1);
          setStatusMessage(`LOOP: '${cond}' is FALSE. Loop terminated.`);
        }
        return;
      }
    }

    if ((line.includes('void ') || line.includes('int ')) && line.includes('(') && !line.includes('=')) {
      const funcName = line.match(/(?:void|int)\s+(\w+)/)?.[1] || "main";
      pushFrame(funcName);
    } 
    else if ((line.includes('int ') || line.includes('char ')) && line.includes('=') && !line.includes('malloc')) {
      const match = line.match(/(?:int|char)\s+(\w+)\s*=\s*(.+)/);
      if (match && stack.length > 0) {
        const [, name, val] = match;
        updateOrAddVariable(name, evaluateExpression(val), 'value');
      }
    } 
    else if ((line.startsWith('struct ') || line.startsWith('int ') || line.startsWith('char ')) && !line.includes('=')) {
      const matchArray = line.match(/(?:struct\s+(\w+)|int|char)\s+(\w+)\[(\d+)\]/);
      const matchSimple = line.match(/(?:struct\s+(\w+)|int|char)\s+(\w+)/);
      
      if (matchArray && stack.length > 0) {
        const [, , name, size] = matchArray;
        updateOrAddVariable(name, '0x00 (UNINIT)', 'array');
        setStatusMessage(`ALLOC: Array '${name}' of space ${size} units.`);
      } else if (matchSimple && stack.length > 0) {
        const typeName = line.startsWith('struct ') ? 'struct' : 'value';
        const name = matchSimple[2] || matchSimple[1]; 
        updateOrAddVariable(name, '0x00 (UNINIT)', typeName);
      }
    }
    else if (line.includes('=') && !line.includes('malloc')) {
      const match = line.match(/([\w\.[\]]+)\s*=\s*(.+)/);
      if (match && stack.length > 0) {
        let name = match[1];
        const val = match[2];
        if (name.includes('[')) {
          const indexExpr = name.match(/\[([^\]]+)\]/)?.[1];
          if (indexExpr) {
            const indexValue = evaluateExpression(indexExpr);
            name = name.replace(/\[[^\]]+\]/, `[${indexValue}]`);
          }
        }
        updateOrAddVariable(name, evaluateExpression(val));
      }
    }
    else if (line.includes('malloc')) {
      const isArrayAddress = line.includes('char') || line.includes('byte');
      const ptrMatch = line.match(/\*?(\w+)\s*=/);
      const ptrName = ptrMatch ? ptrMatch[1] : undefined;
      allocateHeap(isArrayAddress ? 'array' : 'struct', ptrName);
    }
    else if (line.includes('free')) {
      if (heap.length > 0) {
        freeHeap(heap[heap.length - 1].id);
      }
    }
    else if (line.startsWith('printf')) {
      const match = line.match(/printf\("([^"]+)"(?:,\s*(.+))?\)/);
      if (match) {
        let content = match[1];
        const argsStr = match[2] || "";
        const args = argsStr.split(',').map(s => s.trim()).filter(Boolean);
        
        args.forEach(arg => {
          let resolvedVal = evaluateExpression(arg);
          if (arg.includes('.') || arg.includes('[')) {
             let lookupKey = arg;
             if (arg.includes('[')) {
                const indexExpr = arg.match(/\[([^\]]+)\]/)?.[1];
                if (indexExpr) lookupKey = arg.replace(/\[[^\]]+\]/, `[${evaluateExpression(indexExpr)}]`);
             }
             
             const root = lookupKey.split(/[.\[]/)[0];
             const frame = stack[stack.length - 1];
             const v = frame?.variables.find(v => v.name === root);
             if (v) {
                const subKey = lookupKey.replace(root, '');
                const valMatch = v.value.match(new RegExp(`\\${subKey}:\\s*([^,}]+)`));
                resolvedVal = valMatch ? valMatch[1] : '???';
             }
          }
          content = content.replace(/%d|%s|%c/, resolvedVal);
        });
        setStatusMessage(`STDOUT: "${content}"`);
      }
    }
    else if (line.startsWith('scanf')) {
      const match = line.match(/scanf\("[^"]+",\s*&?([\w\.[\]]+)\)/);
      if (match) {
        let varName = match[1];
        if (varName.includes('[')) {
          const indexExpr = varName.match(/\[([^\]]+)\]/)?.[1];
          if (indexExpr) {
            const indexValue = evaluateExpression(indexExpr);
            varName = varName.replace(/\[[^\]]+\]/, `[${indexValue}]`);
          }
        }
        setInputTarget({ name: varName, type: 'int' });
        setIsAwaitingInput(true);
        setIsAutoStepping(false);
        setStatusMessage(`WAIT_INPUT: Kernel requesting data for '${varName}'...`);
        return;
      }
    }
    else if (line.startsWith('return')) {
      popFrame();
    }
    else if (line.startsWith('}')) {
      const currentLoop = loopStack[loopStack.length - 1];
      if (currentLoop && currentLoop.bodyEndLine === currentLine) {
        if (currentLoop.increment) {
          const incr = currentLoop.increment;
          if (incr.includes('=')) {
            const match = incr.match(/(\w+)\s*=\s*(.+)/);
            if (match) updateOrAddVariable(match[1], evaluateExpression(match[2]));
          } else if (incr.includes('++')) {
             const varName = incr.replace('++', '').trim();
             const frame = stack[stack.length - 1];
             const v = frame?.variables.find(v => v.name === varName);
             if (v) {
                const newVal = (parseInt(v.value) + 1).toString();
                updateOrAddVariable(varName, newVal);
                setStatusMessage(`LOOP_INCR: '${varName}' is now ${newVal}. Re-evaluating condition...`);
             }
          } else if (incr.includes('--')) {
             const varName = incr.replace('--', '').trim();
             const frame = stack[stack.length - 1];
             const v = frame?.variables.find(v => v.name === varName);
             if (v) updateOrAddVariable(varName, (parseInt(v.value) - 1).toString());
          }
        }
        setCurrentLine(currentLoop.startLine);
        return;
      }
      
      if (stack.length > 0) popFrame();
    }

    setCurrentLine(prev => prev + 1);
  }, [code, currentLine, evaluateExpression, loopStack, stack, pushFrame, popFrame, updateOrAddVariable, heap]);

  useEffect(() => {
    if (isAutoStepping && currentLine >= 0) {
      stepTimerRef.current = setTimeout(() => {
        stepCode();
      }, 1000);
    } else {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    }
    return () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current); };
  }, [isAutoStepping, currentLine, stepCode]);

  const runCode = () => {
    setStack([]);
    setHeap([]);
    setLoopStack([]);
    setCurrentLine(0);
    setIsAutoStepping(true);
    setStatusMessage("COMPILING... KERNEL_START");
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTarget) return;
    updateOrAddVariable(inputTarget.name, userInput);
    setIsAwaitingInput(false);
    setUserInput("");
    setInputTarget(null);
    setCurrentLine(prev => prev + 1);
    setIsAutoStepping(true);
  };

  useEffect(() => {
    const logContainer = logEndRef.current?.parentElement;
    if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
  }, [statusMessage, stack]);

  useEffect(() => {
    const links: PointerLink[] = [];
    stack.forEach(frame => {
      frame.variables.forEach(v => {
        if (v.type === 'pointer' && v.targetId) {
          const target = heap.find(h => h.id === v.targetId);
          if (target) {
            links.push({ fromId: `ptr-src-${v.id}`, toId: `heap-dest-${v.targetId}`, color: target.color });
          }
        }
      });
    });
    setPointerLinks(links);
  }, [stack, heap]);

  const allocateHeap = useCallback((type: 'struct' | 'array' | 'image', ptrName?: string) => {
    if (stack.length === 0) return;
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
      if (updated.length === 0) return prev;
      const topFrameIndex = updated.length - 1;
      const frame = updated[topFrameIndex];
      const currentSize = frame.variables.reduce((sum, v) => sum + v.size, 0);
      const varAddrNum = parseInt(frame.id, 16) - currentSize - 8;
      const stackVarAddr = `0x${varAddrNum.toString(16).toUpperCase()}`;

      const newVars = [...frame.variables];
      newVars.push({
        id: Math.random().toString(),
        name: ptrName || `p_${type.charAt(0)}`,
        type: 'pointer',
        value: address,
        address: stackVarAddr,
        size: 8,
        targetId: objectId
      });
      updated[topFrameIndex] = { ...frame, variables: newVars };
      return updated;
    });
  }, [heap.length, stack.length]);

  const freeHeap = (id: string) => {
    setHeap(prev => prev.filter(obj => obj.id !== id));
    setStatusMessage(`FREE: Memory at target address released.`);
  };

  return (
    <div ref={containerRef} className="h-screen bg-[#070708] text-slate-300 font-sans selection:bg-blue-500/30 overflow-hidden relative">
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
              ARCHITECT.MEM <span className="text-blue-500 text-[10px] px-2 py-0.5 border border-blue-500/40 rounded bg-blue-500/5 font-mono">CORE_V2.5</span>
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
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="relative z-10 max-w-[1920px] mx-auto p-4 lg:p-8 h-[calc(100vh-72px)] overflow-y-auto custom-scrollbar">
        {activeTab === 'visualizer' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-6">
              <CodeEditor 
                code={code} setCode={setCode} currentLine={currentLine}
                runCode={runCode} stepCode={stepCode}
                isAutoStepping={isAutoStepping} setIsAutoStepping={setIsAutoStepping}
                isAwaitingInput={isAwaitingInput} userInput={userInput}
                setUserInput={setUserInput} inputTarget={inputTarget}
                handleInputSubmit={handleInputSubmit}
              />
              <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2 text-blue-400/80">
                  <Wrench size={12} /> Execution_Control
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => pushFrame(`worker_${stack.length}`)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all font-bold uppercase text-[11px]"
                  >
                    <span>Push Frame</span> <Plus size={16} />
                  </button>
                  <button 
                    onClick={popFrame}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-500/10 border border-white/10 text-slate-400 rounded-xl hover:bg-slate-500/20 transition-all font-bold uppercase text-[11px]"
                  >
                    <span>Pop Frame</span> <Minus size={16} />
                  </button>
                </div>
                <div className="mt-10">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2 text-emerald-400/80">
                    <Database size={12} /> Dyn_Allocation
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {['struct', 'array', 'image'].map(type => (
                      <button key={type} onClick={() => allocateHeap(type as any)} className="flex items-center justify-between px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all font-bold uppercase text-[11px]">
                        <span>Malloc_{type}</span> <Zap size={14} className="opacity-40" />
                      </button>
                    ))}
                  </div>
                </div>
              </section>
              <section className="bg-black border border-white/5 rounded-2xl p-6 overflow-hidden relative shadow-2xl">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">Console_Kernel</h3>
                <div className="space-y-1 h-36 overflow-y-auto custom-scrollbar pr-2 font-mono text-[10px]">
                  <div className="flex gap-2 text-blue-400/60 pb-1 border-b border-white/5 mb-2">
                    <span className="opacity-40 uppercase">Timestamp</span> <span className="uppercase">Event_Log</span>
                  </div>
                  <div className="flex gap-2 items-start py-0.5">
                    <span className="opacity-30">[{isMounted ? new Date().toLocaleTimeString() : '--:--'}]</span>
                    <span className="text-blue-400">{statusMessage}</span>
                  </div>
                  <div ref={logEndRef} className="h-0" />
                </div>
              </section>
            </div>
            <StackVisualizer stack={stack} />
            <HeapVisualizer heap={heap} freeHeap={freeHeap} />
          </div>
        ) : (
          <div className="text-center py-20 opacity-30 italic"><Tv size={48} className="mx-auto mb-4" /><p>System Manual in offline mode.</p></div>
        )}
      </main>
    </div>
  );
}
