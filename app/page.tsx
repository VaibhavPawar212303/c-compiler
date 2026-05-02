'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Minus, 
  Tv, 
  Workflow, 
  Monitor,
  Wrench,
  Cpu,
  Database,
  Zap,
  Play, 
  Square, 
  FastForward, 
  RefreshCw, 
  Terminal, 
  History, 
  BookOpen,
  Moon,
  Sun,
  Activity
} from 'lucide-react';
import PointerOverlay from './components/PointerOverlay';
import CodeEditor from './components/CodeEditor';
import StackVisualizer from './components/StackVisualizer';
import HeapVisualizer from './components/HeapVisualizer';
import { StackFrame, HeapObject, LoopState } from './types/memory';

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
  const [history, setHistory] = useState<string[]>(["SYSTEM_BOOT: READY"]);
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
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
  const stepTimerRef = useRef<NodeJS.Timeout|null>(null);

  const logMessage = useCallback((msg: string) => {
    setHistory(prev => [...prev, msg].slice(-50)); // Keep last 50 messages
  }, []);

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
    logMessage(`PUSH: Stack pointer moved DOWN to ${address}. LIFO: Only this new frame is accessible.`);
  }, [stack.length, logMessage]);

  const popFrame = useCallback(() => {
    setStack(prev => {
        if (prev.length === 0) return prev;
        const removed = prev[prev.length - 1];
        logMessage(`POP: LIFO policy active. Removed top frame at ${removed.id}. Pointer moves UP.`);
        return prev.slice(0, -1);
    });
  }, [logMessage]);

  const resetCompiler = useCallback(() => {
    setStack([]);
    setHeap([]);
    setCurrentLine(-1);
    setIsAutoStepping(false);
    setIsAwaitingInput(false);
    setLoopStack([]);
    logMessage("SYSTEM_RESET: Memory cleared. Waiting for execution buffer.");
  }, [logMessage]);

  const updateOrAddVariable = useCallback((name: string, value: string, type: 'value' | 'pointer' | 'struct' | 'array' = 'value') => {
    // Check if we are updating a heap object via dereference (e.g., p->x or *p)
    const normalizedName = name.replace('->', '.');
    const isPtrAccess = name.includes('->') || name.startsWith('*');
    
    if (isPtrAccess) {
      let ptrRoot = normalizedName.split('.')[0];
      if (ptrRoot.startsWith('*')) ptrRoot = ptrRoot.substring(1);
      
      const currentFrame = stack[stack.length - 1];
      const ptrVar = currentFrame?.variables.find(v => v.name === ptrRoot);
      
      if (ptrVar && ptrVar.type === 'pointer') {
         const targetAddr = ptrVar.value;
         const heapObj = heap.find(h => h.address === targetAddr);
         if (heapObj) {
           setHeap(prev => prev.map(h => {
             if (h.id === heapObj.id) {
               const subKey = normalizedName.replace(ptrRoot, '');
               if (!subKey) return { ...h, value };
               
               let newValue = h.value;
               if (newValue === '{}' || newValue === '0') newValue = '{}';
               
               const escapedSub = subKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
               const entryRegex = new RegExp(`\\${escapedSub}:\\s*[^,}]+`);
               
               if (newValue.match(entryRegex)) {
                 newValue = newValue.replace(entryRegex, `${subKey}: ${value}`);
               } else {
                 if (newValue === '{}') newValue = `{${subKey}: ${value}}`;
                 else newValue = newValue.replace('}', `, ${subKey}: ${value}}`);
               }
               return { ...h, value: newValue };
             }
             return h;
           }));
           return;
         }
      }
    }

    setStack(prev => {
      const updated = [...prev];
      if (updated.length === 0) return prev;
      
      const topFrameIndex = updated.length - 1;
      const frame = updated[topFrameIndex];
      
      // Handle array and member assignment (e.g., b[i].page or p->x)
      const isMemberAssignment = normalizedName.includes('.');
      const isArrayAccess = normalizedName.includes('[');
      
      let rootVarName = normalizedName;
      if (isMemberAssignment || isArrayAccess) {
        rootVarName = normalizedName.split(/[.\[]/)[0];
      }
      
      const varIndex = frame.variables.findIndex(v => v.name === rootVarName);
      
      if (varIndex > -1) {
        const newVars = [...frame.variables];
        const existingVar = newVars[varIndex];

        if (isMemberAssignment || isArrayAccess) {
          let newValue = existingVar.value;
          if (newValue === '0x00 (UNINIT)' || newValue === '0') newValue = '{}';
          
          const subKey = normalizedName.replace(rootVarName, '');
          
          // Improved replacement logic to handle nested keys and avoid redundancy
          const escapedSub = subKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const entryRegex = new RegExp(`\\${escapedSub}:\\s*[^,}]+`);
          
          if (newValue.match(entryRegex)) {
            newValue = newValue.replace(entryRegex, `${subKey}: ${value}`);
          } else {
            // Check if we are replacing a parent placeholder (e.g. [0]: 0 with [0].prop: val)
            const parentKey = subKey.match(/^(\[[^\]]+\]|\.[\w]+)/)?.[1];
            if (parentKey) {
                const parentPlaceholder = new RegExp(`\\${parentKey}:\\s*0(?=[,}]|$)`);
                if (newValue.match(parentPlaceholder)) {
                    newValue = newValue.replace(parentPlaceholder, `${subKey}: ${value}`);
                } else if (newValue === '{}') {
                    newValue = `{${subKey}: ${value}}`;
                } else {
                    newValue = newValue.replace('}', `, ${subKey}: ${value}}`);
                }
            } else if (newValue === '{}') {
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
            value: (isMemberAssignment || isArrayAccess) ? `{${normalizedName.replace(rootVarName, '')}: ${value}}` : value,
            address,
            size
          }]
        };
      }
      return updated;
    });
  }, [heap, stack]);

  const evaluateExpression = useCallback((expr: string): string => {
    if (!expr || expr.trim() === "") return "0";
    let replacedExpr = expr.trim();
    if (stack.length === 0) return replacedExpr;
    const currentFrame = stack[stack.length - 1];

    // 1. Resolve variables and complex accesses in the expression
    // Sort variables by name length descending to avoid partial matches
    const sortedVars = [...currentFrame.variables].sort((a, b) => b.name.length - a.name.length);

    let finalExpr = replacedExpr;
    
    // Pattern for complex access: b[i].page or b[0].page or b1.page
    let iterations = 0;
    while (iterations < 40) {
      iterations++;

      // Handle dereference explicitly: *(address) or *address
      const derefMatch = finalExpr.match(/\*(\(0x[0-9A-Fa-f]+\)|0x[0-9A-Fa-f]+)/);
      if (derefMatch) {
         const fullDeref = derefMatch[0];
         const targetAddr = derefMatch[1].replace(/[()]/g, '');
         const heapTarget = heap.find(h => h.address === targetAddr);
         const stackTarget = [...stack].reverse().flatMap(f => f.variables).find(v => v.address === targetAddr);
         const targetValue = heapTarget ? heapTarget.value : (stackTarget ? stackTarget.value : '0');
         finalExpr = finalExpr.replace(fullDeref, targetValue);
         continue;
      }

      // Match variables with optional & prefix and chain of accessors
      const match = finalExpr.match(/(&)?(\b[a-zA-Z_]\w*\b)((?:\[[^\]]+\]|\.[\w]+|->[\w]+)*)/);
      if (!match) break;

      const [fullMatch, isAddress, root, tail] = match;
      
      // Keywords to ignore
      if (['int', 'char', 'float', 'double', 'void', 'struct', 'if', 'for', 'while', 'return', 'printf', 'scanf', 'malloc', 'free', 'sizeof', 'NULL'].includes(root)) {
        if (root === 'NULL') {
          finalExpr = finalExpr.replace(fullMatch, '0');
        } else {
          finalExpr = finalExpr.replace(fullMatch, `__KEY__${fullMatch}__`);
        }
        continue;
      }

      const v = sortedVars.find(v => v.name === root);
      
      if (v) {
        let resolvedValue = isAddress ? v.address : v.value;
        if (!isAddress && (v.type === 'array' || v.type === 'struct' || v.type === 'pointer') && tail) {
          const normalizedTail = tail.replace(/->/g, '.');
          // Resolve indices if they are variables or expressions in the tail
          let resolvedTail = normalizedTail;
          const indexMatches = Array.from(normalizedTail.matchAll(/\[([^\]]+)\]/g));
          for (const m of indexMatches) {
            const idxExpr = m[1];
            if (isNaN(Number(idxExpr))) {
               const resolvedIdx = evaluateExpression(idxExpr);
               resolvedTail = resolvedTail.replace(`[${idxExpr}]`, `[${resolvedIdx}]`);
            }
          }

          // Try flat lookup first (e.g., [0][1]: value)
          const searchKey = `${resolvedTail}:`;
          if (v.value.includes(searchKey)) {
            const startIdx = v.value.indexOf(searchKey) + searchKey.length;
            let depth = 0;
            let actualEnd = -1;
            for (let i = startIdx; i < v.value.length; i++) {
               if (v.value[i] === '{' || v.value[i] === '[') depth++;
               if (v.value[i] === '}' || v.value[i] === ']') depth--;
               if (depth < 0 || (depth === 0 && (v.value[i] === ',' || v.value[i] === '}'))) {
                  actualEnd = i;
                  break;
               }
            }
            if (actualEnd !== -1) {
              resolvedValue = v.value.substring(startIdx, actualEnd).trim();
            }
          } else {
            // Recursive lookup for nested structures
            const accessors = resolvedTail.match(/\[\d+\]|\.[\w]+/g) || [];
            let currentData = v.value;
            for (const acc of accessors) {
               const accKey = `${acc}:`;
               if (currentData.includes(accKey)) {
                  const startIdx = currentData.indexOf(accKey) + accKey.length;
                  let depth = 0;
                  let actualEnd = -1;
                  for (let i = startIdx; i < currentData.length; i++) {
                     if (currentData[i] === '{' || currentData[i] === '[') depth++;
                     if (currentData[i] === '}' || currentData[i] === ']') depth--;
                     if (depth < 0 || (depth === 0 && (currentData[i] === ',' || currentData[i] === '}'))) {
                        actualEnd = i;
                        break;
                     }
                  }
                  if (actualEnd !== -1) {
                     currentData = currentData.substring(startIdx, actualEnd).trim();
                  } else {
                     currentData = '0';
                     break;
                  }
               } else {
                  currentData = '0';
                  break;
               }
            }
            resolvedValue = currentData;
          }
        }
        
        // Escape for regex and replace the specific variable instance
        const escaped = fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const boundaryRegex = new RegExp(`(^|\\W)${escaped}(\\W|$)`);
        finalExpr = finalExpr.replace(boundaryRegex, (match, p1, p2) => (p1 || '') + resolvedValue + (p2 || ''));
      } else {
        // Not a monitored variable
        finalExpr = finalExpr.replace(fullMatch, `__SKIP__${fullMatch}__`);
      }
    }
    
    // Restore skipped parts
    finalExpr = finalExpr.replace(/__KEY__|__/g, '');
    finalExpr = finalExpr.replace(/__SKIP__(\w+)__/g, '0');

    try {
        const cleanedExpr = finalExpr.replace(/!/g, ' ! ').replace(/&&/g, ' && ').replace(/\|\|/g, ' || ');
        // eslint-disable-next-line no-eval
        const result = eval(cleanedExpr);
        return result !== undefined ? result.toString() : finalExpr;
    } catch (e) {
      return finalExpr;
    }
  }, [stack, heap]);


  const stepCode = useCallback(() => {
    try {
      if (currentLine === -1) {
        setStack([]);
        setHeap([]);
        setLoopStack([]);
        setCurrentLine(0);
        logMessage("INITIALIZING... KERNEL_START_PAUSED");
        return;
      }

      if (currentLine >= code.split('\n').length) {
        setIsAutoStepping(false);
        logMessage("EXECUTION_COMPLETE: Kernel gracefully exited.");
        return;
      }

      const lines = code.split('\n');
      const rawLine = lines[currentLine].trim();
      
      if (!rawLine || rawLine.startsWith('//') || rawLine.startsWith('#')) {
        setCurrentLine(prev => prev + 1);
        return;
      }

      // Special handling for struct definitions (skip them)
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
          logMessage("SKIP: Template defined. No memory allocated for pure definitions.");
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
            logMessage(`LOOP_INIT: Initialized with '${init}'. Next: '${cond}'.`);
            return; // Wait for state to settle
          }

          const condVal = evaluateExpression(cond);
          // eslint-disable-next-line no-eval
          const isTrue = eval(condVal);
          
          if (isTrue) {
            setCurrentLine(prev => prev + 1);
            logMessage(`LOOP_ITER: '${cond}' is TRUE. Entering body...`);
          } else {
            setLoopStack(prev => prev.filter(l => l.startLine !== currentLine));
            setCurrentLine(bodyEnd + 1);
            logMessage(`LOOP_EXIT: '${cond}' is FALSE. Terminating.`);
          }
          return;
        }
      }

      if (line === '{') {
        setCurrentLine(prev => prev + 1);
        logMessage("SCOPE_ENTER: Opening memory segment.");
        return;
      }

      if ((line.includes('void ') || line.includes('int ')) && line.includes('(') && !line.includes('=')) {
        const funcName = line.match(/(?:void|int)\s+(\w+)/)?.[1] || "main";
        pushFrame(funcName);
        logMessage(`ENTER_PROC: Frame allocated for '${funcName}'. LIFO growth.`);
        setCurrentLine(prev => prev + 1);
        return;
      } 
      else if ((line.includes('int') || line.includes('char') || line.includes('struct') || line.includes('float')) && line.includes('=') && !line.includes('malloc')) {
        const arrayInitMatch = line.match(/(?:int|char|float|double|struct\s+\w+)\s+(\w+)\s*\[\s*(\d*)\s*\]\s*=\s*\{([^}]+)\}/);
        const simpleAssignMatch = line.match(/(?:int|char|float|double|struct\s+\w+)\s+(\w+)\s*=\s*(.+)/);
        
        if (arrayInitMatch && stack.length > 0) {
          const [, name, size, valsStr] = arrayInitMatch;
          const vals = valsStr.split(',').map(v => v.trim());
          let formattedVal = '{';
          vals.forEach((v, i) => {
             // Resolve each value in the array initializer
             const resolved = evaluateExpression(v);
             formattedVal += `[${i}]: ${resolved}${i < vals.length - 1 ? ', ' : ''}`;
          });
          formattedVal += '}';
          updateOrAddVariable(name, formattedVal, 'array');
          logMessage(`ALLOC: Array '${name}' of ${vals.length} elements placed on stack.`);
        } else if (simpleAssignMatch && stack.length > 0) {
          const [, name, val] = simpleAssignMatch;
          updateOrAddVariable(name, evaluateExpression(val), 'value');
          logMessage(`SET: Variable '${name}' assigned value '${evaluateExpression(val)}'.`);
        }
      } 
      else if ((line.startsWith('struct ') || line.startsWith('int ') || line.startsWith('char ')) && !line.includes('=')) {
        const matchArray = line.match(/(?:struct\s+(\w+)|int|char)\s+(\w+)\[(\d+)\]/);
        const matchSimple = line.match(/(?:struct\s+(\w+)|int|char)\s+(\w+)/);
        
        if (matchArray && stack.length > 0) {
          const [, structType, name, size] = matchArray;
          updateOrAddVariable(name, '{' + Array.from({length: parseInt(size) || 1}, (_, i) => `[${i}]: 0`).join(', ') + '}', 'array');
          logMessage(`ALLOC: Array '${name}' of space ${parseInt(size)} units.`);
        } else if (matchSimple && stack.length > 0) {
          const name = matchSimple[2] || matchSimple[1]; 
          const typeName = line.startsWith('struct ') ? 'struct' : 'value';
          updateOrAddVariable(name, '0', typeName);
          logMessage(`ALLOC: Stack variable '${name}' initialized to 0.`);
        }
      }
      else if (line.includes('=') && !line.includes('malloc')) {
        const match = line.match(/([\w\.[\]]+)\s*=\s*(.+)/);
        if (match && stack.length > 0) {
          let name = match[1];
          const val = match[2];
          
          // Resolve all array indices in LHS
          if (name.includes('[')) {
            const matches = Array.from(name.matchAll(/\[([^\]]+)\]/g));
            for (const m of matches) {
              const idxExpr = m[1];
              if (isNaN(Number(idxExpr))) {
                const indexValue = evaluateExpression(idxExpr);
                name = name.replace(`[${idxExpr}]`, `[${indexValue}]`);
              }
            }
          }
          
          const evaluated = evaluateExpression(val);
          updateOrAddVariable(name, evaluated);
          logMessage(`UPDATE: '${name}' updated to '${evaluated}'.`);
        }
      }
      else if (line.includes('malloc')) {
        const isArrayAddress = line.includes('char') || line.includes('byte');
        const ptrMatch = line.match(/\*?(\w+)\s*=/);
        const ptrName = ptrMatch ? ptrMatch[1] : undefined;
        allocateHeap(isArrayAddress ? 'array' : 'struct', ptrName);
        logMessage(`MALLOC: dynamic memory requested.`);
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
          const args: string[] = [];
          let currentArg = "";
          let parenDepth = 0;
          for (let i = 0; i < argsStr.length; i++) {
            const char = argsStr[i];
            if (char === '(') parenDepth++;
            else if (char === ')') parenDepth--;
            
            if (char === ',' && parenDepth === 0) {
              args.push(currentArg.trim());
              currentArg = "";
            } else {
              currentArg += char;
            }
          }
          if (currentArg.trim()) args.push(currentArg.trim());
          
          args.forEach(arg => {
            let resolvedVal = evaluateExpression(arg);
            // If it's a direct address-of or something evaluateExpression didn't catch for printf context
            if (!arg.startsWith('&') && (arg.includes('.') || arg.includes('['))) {
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
                  const escapedSub = subKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const valMatch = v.value.match(new RegExp(`\\${escapedSub}:\\s*([^,}]+)`));
                  resolvedVal = valMatch ? valMatch[1] : '???';
               }
            }
            content = content.replace(/%d|%u|%p|%s|%c|%f|%x/, resolvedVal);
          });
          logMessage(`STDOUT: "${content}"`);
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
          logMessage(`WAIT_INPUT: Kernel requesting data for '${varName}'...`);
          return;
        }
      }
      else if (line.startsWith('return')) {
        popFrame();
        logMessage("EXIT_PROC: Frame popped. Return successful.");
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
                  logMessage(`LOOP_INCR: '${varName}' is now ${newVal}. Re-evaluating condition...`);
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
        
        if (stack.length > 0) {
          popFrame();
          logMessage("SCOPE_EXIT: Frame removed.");
        }
      }

      setCurrentLine(prev => prev + 1);
    } catch (e) {
      console.error(e);
      logMessage(`EXCEPTION: ${e instanceof Error ? e.message : 'Unknown error during execution'}`);
      setIsAutoStepping(false);
    }
  }, [code, currentLine, evaluateExpression, loopStack, stack, pushFrame, popFrame, updateOrAddVariable, heap]);


  useEffect(() => {
    if (isAutoStepping && (currentLine >= 0 || currentLine === -1)) {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      stepTimerRef.current = setTimeout(() => {
        stepCode();
      }, 600);
    } else {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    }
    return () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current); };
  }, [isAutoStepping, currentLine, stepCode]);

  const runCode = () => {
    setIsAutoStepping(false);
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    
    // Tiny delay to ensure state updates propagate before restarting
    setTimeout(() => {
      setStack([]);
      setHeap([]);
      setLoopStack([]);
      setCurrentLine(0);
      setIsAutoStepping(true);
      logMessage("COMPILING... KERNEL_START");
    }, 50);
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
  }, [history]);

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
      address,
      value: type === 'image' ? 'BINARY_BLOB' : '{}'
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
    logMessage(`FREE: Memory at target address released.`);
  };

  return (
    <main className={`min-h-screen flex flex-col font-sans transition-colors duration-500 overflow-hidden ${
      theme === 'dark' ? 'bg-[#070708] text-slate-300' : 'bg-[#EFEEEA] text-slate-800'
    }`}>
      {/* Background Accents */}
      {theme === 'dark' ? (
        <>
          <div className="fixed inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none opacity-[0.15]" />
          <div className="fixed inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(7,7,8,0.8))] pointer-events-none" />
        </>
      ) : (
        <div className="fixed inset-0 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none opacity-40" />
      )}

      {isMounted && <PointerOverlay theme={theme} stack={stack} heap={heap} containerRef={containerRef} />}

      <header className={`relative z-40 border-b px-6 py-3 flex items-center justify-between backdrop-blur-xl ${
        theme === 'dark' ? 'border-white/10 bg-black/40' : 'border-black/10 bg-white/60 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-none border ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-600/10 border-blue-600/20 text-blue-600'}`}>
            <Cpu size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className={`text-lg font-black tracking-tighter uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              C_Compiler_Visualizer <span className="text-[9px] bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded-none ml-2 align-middle border border-emerald-500/30">v2.1</span>
            </h1>
            <p className="text-[9px] font-mono opacity-50 uppercase tracking-[0.2em]">Kernel-Level Memory Trace</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
             onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
             className={`p-2 rounded-none border transition-all hover:bg-opacity-80 active:scale-95 ${
               theme === 'dark' 
                 ? 'border-white/10 text-yellow-500 bg-white/5' 
                 : 'border-black/10 text-orange-600 bg-black/5'
             }`}
             title="Toggle Interface Theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          
          <div className={`flex items-center gap-3 px-3 py-1.5 rounded-none border ${
            theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white/40 border-black/10'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-none ${isAutoStepping ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-400'}`} />
            <span className="text-[9px] font-mono font-bold tracking-widest opacity-70 uppercase">
              {isAutoStepping ? 'RUNNING' : 'IDLE'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative z-10" ref={containerRef}>
        <div className="flex-1 flex overflow-hidden">
          <section className={`w-[450px] min-w-[400px] flex flex-col border-r transition-colors ${
            theme === 'dark' ? 'border-white/10' : 'border-black/10'
          }`}>
            <div className={`flex items-center gap-2 p-3 border-b ${
              theme === 'dark' ? 'border-white/10 bg-black/40' : 'border-black/10 bg-white/20'
            }`}>
              <Terminal size={12} className="text-blue-500" />
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Source_Buffer</span>
            </div>
            <div className="flex-1 overflow-hidden relative flex flex-col">
              <CodeEditor 
                code={code} setCode={setCode} currentLine={currentLine} theme={theme}
              />
            </div>
          </section>

          <section className={`flex-1 flex flex-col overflow-y-auto custom-scrollbar transition-colors ${
            theme === 'dark' ? 'bg-black/20' : 'bg-[#EFEEEA]'
          }`}>
            <div className={`flex items-center justify-between p-3 border-b sticky top-0 z-20 backdrop-blur-md ${
              theme === 'dark' ? 'border-white/10 bg-black/60' : 'border-black/10 bg-white/60'
            }`}>
              <div className="flex items-center gap-2">
                <Database size={12} className="text-emerald-500" />
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Memory_Sector</span>
              </div>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-none bg-blue-500/50" />
                   <span className="text-[8px] font-mono font-bold uppercase tracking-wider opacity-60">Stack</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-none bg-emerald-500/50" />
                   <span className="text-[8px] font-mono font-bold uppercase tracking-wider opacity-60">Heap</span>
                 </div>
              </div>
            </div>
            
            <div className="p-8 space-y-8 flex flex-col items-center">
              <div className="w-full max-w-6xl grid grid-cols-1 xl:grid-cols-2 gap-8 relative">
                 <StackVisualizer theme={theme} stack={stack} />
                 <HeapVisualizer theme={theme} heap={heap} freeHeap={freeHeap} />
              </div>
            </div>
          </section>

          <section className={`w-[380px] min-w-[350px] flex flex-col border-l transition-colors ${
            theme === 'dark' ? 'border-white/10 bg-black/40' : 'border-black/10 bg-white/40'
          }`}>
            <div className={`flex items-center gap-2 p-3 border-b ${
              theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-black/5 bg-white/20'
            }`}>
              <Activity size={12} className="text-orange-500" />
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Pipeline_Monitoring</span>
            </div>
            
            <div className="p-5 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
              {/* IO BUS SECTION - REPOSITIONED ABOVE CONSOLE */}
              <AnimatePresence>
                {isAwaitingInput && (
                  <motion.section 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`border p-5 shadow-2xl relative overflow-hidden rounded-none ${
                      theme === 'dark' ? 'bg-orange-500/[0.08] border-orange-500/30' : 'bg-orange-600/[0.05] border-orange-600/30'
                    }`}
                  >
                    <h3 className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Activity size={12} className="animate-pulse" /> IO_BUS_WAIT: STDIN
                    </h3>
                    <div className="flex flex-col gap-3 relative z-10">
                      <div>
                        <p className={`text-[10px] font-bold uppercase mb-2 ${theme === 'dark' ? 'text-orange-200/60' : 'text-orange-900/60'}`}>
                          Input_Target: <span className="text-orange-500 font-mono">*{inputTarget?.name}</span>
                        </p>
                        <input
                          type="text"
                          id={inputTarget?.name}
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(e as any)}
                          autoFocus
                          placeholder="int val..."
                          className={`w-full bg-black/40 border p-3 rounded-none font-mono text-xs focus:outline-none focus:ring-1 transition-all placeholder:opacity-20 ${
                            theme === 'dark' 
                              ? 'border-white/10 text-emerald-400 focus:ring-emerald-500/40' 
                              : 'border-black/10 text-emerald-600 focus:ring-emerald-600/40'
                          }`}
                        />
                      </div>
                      <button
                        onClick={(e) => handleInputSubmit(e as any)}
                        className="bg-orange-600 hover:bg-orange-500 text-white p-2.5 rounded-none text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                      >
                        Commit_Data
                      </button>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              <section className={`p-5 overflow-hidden relative shadow-2xl border transition-all rounded-none ${
                theme === 'dark' ? 'bg-[#121212] border-white/10' : 'bg-slate-900 border-black/10'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Tv size={12} /> Console_Log
                  </h3>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-red-500/50" />
                    <div className="w-1 h-1 bg-amber-500/50" />
                    <div className="w-1 h-1 bg-emerald-500/50" />
                  </div>
                </div>
                <div className="space-y-1.5 h-[320px] overflow-y-auto custom-scrollbar pr-3 font-mono text-[10px] leading-relaxed">
                  {history.map((msg, i) => (
                    <div key={i} className="flex gap-3 items-start py-1 border-b border-white/5 last:border-0 opacity-80 hover:opacity-100 transition-opacity">
                      <span className="opacity-20 text-[9px] mt-0.5 shrink-0">{(i+1).toString().padStart(2, '0')}</span>
                      <span className={`${
                        msg.includes('ERROR') || msg.includes('EXCEPTION') ? 'text-red-400' : 
                        msg.includes('STDOUT') ? (theme === 'dark' ? 'text-white' : 'text-slate-100') : 
                        (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-300')
                      } break-all`}>
                        {msg}
                      </span>
                    </div>
                  ))}
                  <div ref={logEndRef} className="h-0" />
                </div>
              </section>

              <section className={`border p-5 backdrop-blur-md transition-all shadow-xl rounded-none ${
                theme === 'dark' 
                  ? 'bg-white/[0.03] border-white/10' 
                  : 'bg-black/[0.03] border-black/10'
              }`}>
                <h3 className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-5 flex items-center gap-2 ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  <Wrench size={12} /> Execution_Control
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={runCode}
                    className={`flex flex-col items-center gap-2 p-4 border transition-all col-span-2 group rounded-none ${
                      theme === 'dark' ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400' 
                                       : 'border-emerald-600/20 bg-emerald-600/5 hover:bg-emerald-600/10 text-emerald-600'
                    }`}
                  >
                    <Play className="animate-pulse" size={18} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Compile_&_Run</span>
                  </button>
                  <button 
                    onClick={stepCode}
                    disabled={isAutoStepping || isAwaitingInput}
                    className={`flex flex-col items-center gap-2 p-4 border transition-all disabled:opacity-20 rounded-none ${
                      theme === 'dark' ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-black/10 bg-white shadow-sm hover:bg-slate-50'
                    }`}
                  >
                    <Play className="text-blue-500" size={18} />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Step_Next</span>
                  </button>
                  <button 
                    onClick={() => setIsAutoStepping(!isAutoStepping)}
                    disabled={isAwaitingInput}
                    className={`flex flex-col items-center gap-2 p-4 border transition-all rounded-none ${
                      isAutoStepping 
                        ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                        : theme === 'dark' ? 'border-white/10 bg-white/5 hover:border-emerald-500/20' 
                                         : 'border-black/10 bg-white shadow-sm'
                    }`}
                  >
                    {isAutoStepping ? <Square size={18} /> : <FastForward size={18} className="text-emerald-500" />}
                    <span className="text-[8px] font-bold uppercase tracking-widest">
                      {isAutoStepping ? 'Halt' : 'Auto'}
                    </span>
                  </button>
                  <button 
                    onClick={resetCompiler}
                    className={`flex flex-col items-center gap-2 p-4 border transition-all col-span-2 group rounded-none ${
                      theme === 'dark' ? 'border-white/10 bg-white/5 hover:bg-red-500/10' 
                                       : 'border-black/10 bg-white shadow-sm hover:bg-red-50'
                    }`}
                  >
                    <RefreshCw className="text-slate-400 group-hover:rotate-180 transition-transform duration-700" size={18} />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Clear_All</span>
                  </button>
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
