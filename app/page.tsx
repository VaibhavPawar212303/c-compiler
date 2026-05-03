'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Minus, 
  Gamepad2,
  Map,
  Building2,
  Network,
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
import DSAWorld from './components/DSAWorld';
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
  const [compilerTab, setCompilerTab] = useState<'visualizer' | 'theory'>('visualizer');
  const [mainTab, setMainTab] = useState<'compiler' | 'dsa'>('compiler');
  const [history, setHistory] = useState<string[]>(["SYSTEM_BOOT: READY"]);
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isAutoStepping, setIsAutoStepping] = useState(false);
  const [isAwaitingInput, setIsAwaitingInput] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [inputTarget, setInputTarget] = useState<{name: string, type: string} | null>(null);
  const [loopStack, setLoopStack] = useState<LoopState[]>([]);
  const [returnStack, setReturnStack] = useState<{line: number, swallowed: number}[]>([]);
  const [swallowedLines, setSwallowedLines] = useState(1);
  const [errors, setErrors] = useState<{ line: number, message: string }[]>([]);
  
  const [globals, setGlobals] = useState<any[]>([]);
  const [code, setCode] = useState(`#include <stdio.h>

// Global variables are accessible everywhere
void swap(int *, int *);

int main() {
  int a = 10;
  int b = 20;

  printf("Value of   a : %d\\n", a);
  printf("Address of a : %u\\n", &a);
  printf("Address of b : %u\\n", &b);

  swap(&a, &b);

  printf("Value of a=%d and value of b=%d\\n", a, b);
  return 0;
}

void swap(int *x, int *y) {
  int temp;
  temp = *x;
  *x = *y;
  *y = temp;
}
`);
  const [currentLine, setCurrentLine] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const stepTimerRef = useRef<NodeJS.Timeout|null>(null);

  const logMessage = useCallback((msg: string, type: string = 'system') => {
    setHistory(prev => [...prev, msg].slice(-50)); // Keep last 50 messages
  }, []);

  useEffect(() => {
    setIsMounted(true);
    // Sanity check for escaped entities in code (might happen from copy-paste or previous bugs)
    if (code.includes('&amp;') || code.includes('&lt;') || code.includes('&gt;')) {
      const sanitized = code
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      setCode(sanitized);
    }
  }, [code]);

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
    setGlobals([]);
    setReturnStack([]);
    setLoopStack([]);
    
    // Find main line and scan for globals before it
    const lines = code.split('\n');
    let mainIdx = -1;
    const detectedGlobals: any[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].split('//')[0].split('/*')[0].trim();
        
        if (line.includes('int main(') || line.includes('void main(')) {
            mainIdx = i;
            break;
        }

        // Simple global detection
        const globalMatch = line.match(/^(int|char|float|double)\s+([a-zA-Z_]\w*)\s*(?:=\s*(.*))?;$/);
        if (globalMatch) {
            const type = globalMatch[1];
            const name = globalMatch[2];
            const initialVal = globalMatch[3] ? globalMatch[3].trim() : '0';
            detectedGlobals.push({
                id: Math.random().toString(),
                name,
                type: 'value',
                value: initialVal,
                address: `0x${(0x400000 + detectedGlobals.length * 4).toString(16).toUpperCase()}`,
                size: 4
            });
        }
    }
    
    setGlobals(detectedGlobals);
    setCurrentLine(mainIdx !== -1 ? mainIdx : 0);
    setIsAutoStepping(false);
    setIsAwaitingInput(false);
    logMessage(mainIdx !== -1 ? `SYSTEM_RESET: Entry_point found at line ${mainIdx + 1}. Detected ${detectedGlobals.length} globals.` : "SYSTEM_RESET: Entry_point 'main' NOT found! Starting from line 1.");
  }, [code, logMessage]);

  const updateOrAddVariable = useCallback((name: string, value: string, type: 'value' | 'pointer' | 'struct' | 'array' = 'value') => {
    // Check if we are updating a heap object via dereference (e.g., p->x or *p)
    const normalizedName = name.replace('->', '.');
    const isPtrAccess = name.includes('->') || name.startsWith('*');
    
    if (isPtrAccess) {
      let ptrRoot = normalizedName.split('.')[0];
      let isExplicitDeref = false;
      if (ptrRoot.startsWith('*')) {
        ptrRoot = ptrRoot.substring(1);
        isExplicitDeref = true;
      }
      
      const currentFrame = stack[stack.length - 1];
      const ptrVar = currentFrame?.variables.find(v => v.name === ptrRoot);
      
      if (ptrVar && (ptrVar.type === 'pointer' || ptrVar.value.startsWith('0x'))) {
         const targetAddr = ptrVar.value;
         
         // 1. Check Heap
         const heapObj = heap.find(h => h.address === targetAddr);
         if (heapObj) {
            setHeap(prev => prev.map(h => {
              if (h.id === heapObj.id) {
                const subKey = normalizedName.replace(ptrRoot, '');
                if (!subKey || isExplicitDeref) return { ...h, value };
                
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

         // 2. Check Stack (for local variable pointer targets)
         let successStackUpdate = false;
         setStack(prev => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
                const targetVar = next[i].variables.find(v => v.address === targetAddr);
                if (targetVar) {
                    targetVar.value = value;
                    successStackUpdate = true;
                    break;
                }
            }
            return next;
         });
         if (successStackUpdate) return;
      }
    }

    // Handle Global variable updates
    if (stack.length === 0 || !stack[stack.length-1].variables.find(v => v.name === normalizedName)) {
       const globalIdx = globals.findIndex(g => g.name === normalizedName);
       if (globalIdx !== -1) {
          setGlobals(prev => {
            const next = [...prev];
            next[globalIdx] = { ...next[globalIdx], value };
            return next;
          });
          return;
       }
    }

    if (stack.length === 0) {
       // Just add to globals if no stack exists yet
       setGlobals(prev => [...prev, {
         id: Math.random().toString(),
         name: normalizedName,
         type,
         value,
         address: `0x${(0x400000 + prev.length * 4).toString(16).toUpperCase()}`,
         size: 4
       }]);
       return;
    }

    setStack(prev => {
      const updated = [...prev];
      if (updated.length === 0) return prev;
      
      let targetFrameIdx = -1;
      let varIndex = -1;

      // Search from top frame down to support scope resolution
      for (let i = updated.length - 1; i >= 0; i--) {
        const idx = updated[i].variables.findIndex(v => v.name === normalizedName);
        if (idx !== -1) {
          targetFrameIdx = i;
          varIndex = idx;
          break;
        }
      }
      
      if (targetFrameIdx !== -1) {
        const frame = updated[targetFrameIdx];
        const newVars = [...frame.variables];
        const existingVar = newVars[varIndex];
        
        newVars[varIndex] = { ...existingVar, value };
        updated[targetFrameIdx] = { ...frame, variables: newVars };
      } else {
        const topFrameIndex = updated.length - 1;
        const frame = updated[topFrameIndex];
        const currentSize = frame.variables.reduce((sum, v) => sum + v.size, 0);
        const size = type === 'pointer' ? 8 : (type === 'struct' ? 12 : type === 'array' ? 40 : 4);
        const baseAddr = parseInt(frame.id, 16);
        const varAddrNum = baseAddr - currentSize - size;
        const address = `0x${varAddrNum.toString(16).toUpperCase()}`;

        updated[topFrameIndex] = {
          ...frame,
          variables: [...frame.variables, {
            id: Math.random().toString(),
            name: normalizedName,
            type,
            value,
            address,
            size
          }]
        };
      }
      return updated;
    });
  }, [heap, stack, globals]);

  const evaluateExpression = useCallback((expr: string): string => {
    if (!expr || expr.trim() === "") return "0";
    let replacedExpr = expr.trim();
    if (stack.length === 0) return replacedExpr;

    // Resolve variables (Check current frame first, then globals)
    const findVariable = (name: string) => {
        // Try current frame
        if (stack.length > 0) {
            const currentFrame = stack[stack.length - 1];
            const v = currentFrame.variables.find(v => v.name === name);
            if (v) return v;
        }
        
        // Try globals
        return globals.find(g => g.name === name) || null;
    };

    const currentFrame = stack[stack.length - 1];
    const sortedVars = [...currentFrame.variables].sort((a, b) => b.name.length - a.name.length);

    let finalExpr = replacedExpr;
    
    let iterations = 0;
    while (iterations < 40) {
      iterations++;

      // Handle explicit pointer dereference via address: *(0x...) or *0x...
      const derefAddrMatch = finalExpr.match(/\*(\(0x[0-9A-Fa-f]+\)|0x[0-9A-Fa-f]+)/);
      if (derefAddrMatch) {
         const fullDeref = derefAddrMatch[0];
         const targetAddr = derefAddrMatch[1].replace(/[()]/g, '');
         const heapTarget = heap.find(h => h.address === targetAddr);
         const stackTarget = [...stack].reverse().flatMap(f => f.variables).find(v => v.address === targetAddr);
         const targetValue = heapTarget ? heapTarget.value : (stackTarget ? stackTarget.value : '0');
         finalExpr = finalExpr.replace(fullDeref, targetValue);
         continue;
      }

      // Handle pointer variable dereference: *ptr
      const derefVarMatch = finalExpr.match(/\*([a-zA-Z_]\w*)/);
      if (derefVarMatch) {
        const fullMatch = derefVarMatch[0];
        const varName = derefVarMatch[1];
        const v = findVariable(varName);
        if (v && (v.type === 'pointer' || v.value.startsWith('0x'))) {
          const targetAddr = v.value;
          const heapTarget = heap.find(h => h.address === targetAddr);
          const stackTarget = [...stack].reverse().flatMap(f => f.variables).find(v => v.address === targetAddr);
          const targetValue = heapTarget ? heapTarget.value : (stackTarget ? stackTarget.value : '0');
          finalExpr = finalExpr.replace(fullMatch, targetValue);
          continue;
        }
      }

      // Handle addresses
      const addrMatch = finalExpr.match(/(?:&|&amp;)([a-zA-Z_]\w*)/);
      if (addrMatch) {
        const fullMatch = addrMatch[0];
        const varName = addrMatch[1];
        const v = findVariable(varName);
        if (v) {
          finalExpr = finalExpr.replace(fullMatch, v.address);
          continue;
        }
      }

      const match = finalExpr.match(/(&|&amp;)?\b(?!(?:__SKIP__|__KEY__))([a-zA-Z_]\w*)\b((?:\[[^\]]+\]|\.[\w]+|->[\w]+)*)/);
      if (!match) break;

      const [fullMatch, isAddress, root, tail] = match;
      
      if (['int', 'char', 'float', 'double', 'void', 'struct', 'if', 'for', 'while', 'return', 'printf', 'scanf', 'malloc', 'free', 'sizeof', 'NULL'].includes(root)) {
        if (root === 'NULL') {
          finalExpr = finalExpr.replace(fullMatch, '0');
        } else {
          finalExpr = finalExpr.replace(fullMatch, `__KEY__${fullMatch}__`);
        }
        continue;
      }

      const v = findVariable(root);
      
      if (v) {
        let resolvedValue = isAddress ? v.address : v.value;
        if (!isAddress && (v.type === 'array' || v.type === 'struct' || v.type === 'pointer') && tail) {
          const normalizedTail = tail.replace(/->/g, '.');
          let resolvedTail = normalizedTail;
          const indexMatches = Array.from(normalizedTail.matchAll(/\[([^\]]+)\]/g));
          for (const m of indexMatches) {
            const idxExpr = m[1];
            if (isNaN(Number(idxExpr))) {
               const resolvedIdx = evaluateExpression(idxExpr);
               resolvedTail = resolvedTail.replace(`[${idxExpr}]`, `[${resolvedIdx}]`);
            }
          }

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
        
        const escaped = fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const boundaryRegex = new RegExp(`(^|\\W)${escaped}(\\W|$)`);
        finalExpr = finalExpr.replace(boundaryRegex, (match, p1, p2) => (p1 || '') + resolvedValue + (p2 || ''));
      } else {
        finalExpr = finalExpr.replace(fullMatch, `__SKIP__${fullMatch}__`);
      }
    }
    
    finalExpr = finalExpr.replace(/__SKIP__(\w+)__/g, '0');
    finalExpr = finalExpr.replace(/__KEY__(\w+)__/g, '$1');

    // Replace hexadecimal addresses with their decimal values only for arithmetic, 
    // but try to preserve them if they are alone or being assigned as pointers.
    const isPureAddress = finalExpr.trim().match(/^0x[0-9A-Fa-f]+$/);
    if (!isPureAddress) {
      const hexPattern = /0x[0-9A-Fa-f]+/g;
      finalExpr = finalExpr.replace(hexPattern, (match) => parseInt(match, 16).toString());
    }

    try {
        const cleanedExpr = finalExpr.replace(/!/g, ' ! ').replace(/&&/g, ' && ').replace(/\|\|/g, ' || ');
        if (isPureAddress) return isPureAddress[0]; 
        // eslint-disable-next-line no-eval
        const result = eval(cleanedExpr);
        return result !== undefined ? result.toString() : finalExpr;
    } catch (e) {
      return finalExpr;
    }
  }, [stack, heap, globals]);


  const stepCode = useCallback(() => {
    try {
      if (currentLine === -1) {
        resetCompiler();
        return;
      }

      const lines = code.split('\n');
      if (currentLine >= lines.length) {
        setIsAutoStepping(false);
        logMessage("EXECUTION_COMPLETE: Kernel gracefully exited.");
        return;
      }

      // Multi-line statement accumulator
      let statement = "";
      let swallowed = 0;
      let i = currentLine;
      let parenDepth = 0;
      let bracketDepth = 0;

      while (i < lines.length) {
        const raw = lines[i];
        let trimmed = raw.split('//')[0].split('/*')[0].trim();
        
        statement += (statement ? " " : "") + trimmed;
        swallowed++;

        parenDepth += (trimmed.match(/\(/g) || []).length;
        parenDepth -= (trimmed.match(/\)/g) || []).length;
        bracketDepth += (trimmed.match(/\{/g) || []).length;
        bracketDepth -= (trimmed.match(/\}/g) || []).length;

        if (parenDepth <= 0) {
          if (trimmed.endsWith(';') || trimmed.endsWith('{') || trimmed.endsWith('}')) break;
          if (trimmed.match(/^(if|for|while|else|struct)/) && (trimmed.endsWith(')') || trimmed.endsWith('else') || trimmed.endsWith('{'))) break;
          if (trimmed.startsWith('#') || !trimmed) break;
        }
        i++;
      }

      setSwallowedLines(swallowed);
      const line = statement.startsWith('for') ? statement : statement.split(';')[0].trim();
      
      // If we are at the start of main, push its frame
      if (currentLine >= 0 && lines[currentLine].includes('main(') && stack.length === 0) {
         pushFrame('main');
         setCurrentLine(prev => prev + 1);
         return;
      }
      
      // Handle function return (closing brace or return statement)
      if (line === '}' || line.startsWith('return')) {
         if (returnStack.length > 0) {
            const last = returnStack[returnStack.length - 1];
            setReturnStack(prev => prev.slice(0, -1));
            popFrame();
            setCurrentLine(last.line + last.swallowed);
            logMessage(`RETURN: Popping stack frame. Returning to line ${last.line + last.swallowed + 1}.`);
            return;
         } else if (line === '}') {
            // End of main probably
            popFrame();
            setCurrentLine(lines.length);
            logMessage("TERMINATE: End of scope reached. Execution halted.");
            return;
         }
      }

      if (!line || line.startsWith('#')) {
        setCurrentLine(prev => prev + swallowed);
        return;
      }

      // Handled prototypes or declarations: skip skip skip
      const isPrototype = (line.includes('int ') || line.includes('void ') || line.includes('char ')) && 
                          line.includes('(') && 
                          line.includes(';') && 
                          !line.includes('=');
      
      if (isPrototype) {
        setCurrentLine(prev => prev + swallowed);
        return;
      }

      // Check for function definitions outside main to skip them unless called
      const isFunctionDef = (line.includes('int ') || line.includes('void ') || line.includes('char ')) && 
                            line.includes('(') && 
                            !line.includes(';') && 
                            !line.includes('=');

      if (isFunctionDef && !lines[currentLine].includes('main(')) {
         // Skip function declaration/body if we aren't executing it via CALL
         let depth = 0;
         let skipTo = -1;
         for (let j = currentLine; j < lines.length; j++) {
            if (lines[j].includes('{')) depth++;
            if (lines[j].includes('}')) depth--;
            if (depth === 0 && j !== currentLine && lines[j].includes('}')) {
              skipTo = j;
              break;
            }
         }
         if (skipTo !== -1) {
            setCurrentLine(skipTo + 1);
            logMessage(`SKIP: Function '${line.match(/\w+(?=\s*\()/)?.[0]}' body bypassed.`);
            return;
         }
      }

      // Special handling for function calls like swap(a, b)
      const callMatch = line.match(/^(\w+)\s*\((.*)\)$/);
      if (callMatch && !line.match(/^(if|for|while|printf|scanf|malloc|free|return)/)) {
        const funcName = callMatch[1];
        const argsStr = callMatch[2];
        
        // Find function in code
        let funcLine = -1;
        for (let j = 0; j < lines.length; j++) {
           if (lines[j].includes(`${funcName}(`) && !lines[j].includes(';') && j !== currentLine) {
              funcLine = j;
              break;
           }
        }

        if (funcLine !== -1) {
           logMessage(`CALL: Transferring control to '${funcName}'. Pushing frame.`);
           setReturnStack(prev => [...prev, { line: currentLine, swallowed }]);
           pushFrame(funcName);
           
           // Extract parameter names from function definition
           const defLine = lines[funcLine];
           const paramsMatch = defLine.match(/\((.*)\)/);
           if (paramsMatch) {
              const params = paramsMatch[1].split(',').map(p => p.trim().split(/\s+/).pop());
              const argVals = argsStr.split(',').map(a => evaluateExpression(a.trim()));
              
              setStack(prev => {
                const next = [...prev];
                const frame = next[next.length - 1];
                params.forEach((p, idx) => {
                  if (p) {
                    const isPointerParam = p.startsWith('*');
                    const cleanName = p.replace('*', '').trim();
                    frame.variables.push({
                      id: Math.random().toString(),
                      name: cleanName || `param_${idx}`,
                      type: isPointerParam ? 'pointer' : 'value',
                      value: argVals[idx] || '0',
                      address: `0x${(parseInt(frame.id, 16) - (idx + 1) * 4).toString(16).toUpperCase()}`,
                      size: isPointerParam ? 8 : 4
                    });
                  }
                });
                return next;
              });
           }
           
           setCurrentLine(funcLine + 1);
           return;
        } else {
           setErrors(prev => [...prev, { line: currentLine, message: `Undefined function: ${funcName}` }]);
           logMessage(`ERROR: Function '${funcName}' not found in scope.`);
           setIsAutoStepping(false);
           return;
        }
      }

      // Handle printf
      if (line.startsWith('printf')) {
        const match = line.match(/printf\s*\(\s*"(.*?)"\s*(?:,\s*(.*))?\)/);
        if (match) {
          let format = match[1];
          const argsStr = match[2];
          
          let output = format;
          if (argsStr) {
             const args = argsStr.split(',').map(a => evaluateExpression(a.trim()));
             args.forEach(arg => {
                output = output.replace(/%[dsuxfp]/, arg);
             });
          }
          
          // Handle newlines and tabs
          const processedOutput = output.replace(/\\t/g, '    ');
          const lines = processedOutput.split('\\n');
          lines.forEach((l, idx) => {
            if (l.length > 0 || idx < lines.length - 1) {
              logMessage(`STDOUT: ${l}`, 'result');
            }
          });
        }
        setCurrentLine(prev => prev + swallowed);
        return;
      }
      // Handle variable assignment/declaration
      // int a = 10; or a = 10; or int a; or *x = 5;
      const assignMatch = line.match(/^(?:int|char|float|double|void)?\s*(\*?[a-zA-Z_]\w*)\s*(?:=\s*(.*))?$/);
      if (assignMatch && !line.includes('(')) {
        let varName = assignMatch[1];
        const expr = assignMatch[2];
        const isDecl = line.match(/^(int|char|float|double|void)/);
        const isPointerDecl = line.match(/^(int|char|float|double|void)\s*\*/);
        
        // If it's a declaration like "int *p", strip the '*' from name but mark as pointer type
        if (isDecl && varName.startsWith('*')) {
          varName = varName.substring(1).trim();
        }

        if (expr) {
          const val = evaluateExpression(expr);
          updateOrAddVariable(varName, val, isPointerDecl ? 'pointer' : 'value');
          logMessage(`ASSIGN: ${varName} = ${val}`, 'action');
        } else {
          updateOrAddVariable(varName, '0', isPointerDecl ? 'pointer' : 'value');
          logMessage(`DECLARE: ${varName} initialized to 0.`, 'action');
        }
        setCurrentLine(prev => prev + swallowed);
        return;
      }

      // Special handling for struct definitions (skip them)
      if (line.startsWith('struct') && (line.includes('{') || line.endsWith('{')) && !line.includes(';')) {
        let depth = 0;
        let skipTo = -1;
        for (let j = currentLine; j < lines.length; j++) {
          const l = lines[j];
          if (l.includes('{')) depth++;
          if (l.includes('}')) depth--;
          if (depth === 0 && j !== currentLine) {
            skipTo = j;
            break;
          }
        }
        if (skipTo !== -1) {
          setCurrentLine(skipTo + 1);
          logMessage("SKIP: Template defined. No memory allocated for pure definitions.");
          return;
        }
      }
      
      // if-else logic
      if (line.match(/^if\s*\(/)) {
        const match = line.match(/^if\s*\((.*)\)/);
        if (match) {
          const condition = match[1];
          const result = evaluateExpression(condition);
          // eslint-disable-next-line no-eval
          const isTrue = eval(result);
          
          if (!isTrue) {
            // Find the else block or end of if block
            let depth = 0;
            let skipTo = -1;
            for (let i = currentLine; i < lines.length; i++) {
              if (lines[i].includes('{')) depth++;
              if (lines[i].includes('}')) depth--;
              if (depth === 0 && i !== currentLine) {
                 // Check if the current line or next non-empty line starts with 'else'
                 const lineContent = lines[i].trim();
                 if (lineContent.includes('}')) {
                    // It could be "} else {"
                    if (lineContent.includes('else')) {
                       // Skip to inside the else
                       skipTo = i; 
                       // Special case: we want to execute the else, so we move to it
                       // but then skipCode should handle skipping the else word
                    } else {
                       let nextLineIdx = i + 1;
                       while (nextLineIdx < lines.length && !lines[nextLineIdx].trim()) nextLineIdx++;
                       if (nextLineIdx < lines.length && lines[nextLineIdx].trim().startsWith('else')) {
                          skipTo = nextLineIdx;
                       } else {
                          skipTo = i; 
                       }
                    }
                 }
                 break;
              }
            }
            if (skipTo !== -1) {
              // If we skipped to an 'else' line, we want to step INTO it, 
              // but we need to signal that the 'if' was false. 
              // For simplicity, we step after the 'else' keyword or brace.
              const targetLine = lines[skipTo].trim();
              if (targetLine.includes('else')) {
                 setCurrentLine(skipTo); // Let the next step execute the else (which we'll fix to allow if coming from skip)
                 logMessage(`IF_FALSE: Branching to ELSE.`);
              } else {
                 setCurrentLine(skipTo + 1);
                 logMessage(`IF_FALSE: skipping block.`);
              }
              return;
            }
          } else {
            setCurrentLine(prev => prev + swallowed);
            logMessage(`IF_TRUE: executing branch...`);
            return;
          }
        }
      }

      if (line.includes('else')) {
         // Logic check: Did we get here naturally? 
         // If we hit 'else' without skipping to it, it means the 'if' block was true.
         // So we must skip the else block.
         let depth = 0;
         let skipTo = -1;
         
         // Only skip if the line is purely an else or starts with it (not after an if skip)
         const prevLine = currentLine > 0 ? lines[currentLine-1].trim() : "";
         const isAfterIfBlock = prevLine.includes('}');

         if (isAfterIfBlock || line.startsWith('}')) {
            for (let i = currentLine; i < lines.length; i++) {
              if (lines[i].includes('{')) depth++;
              if (lines[i].includes('}')) depth--;
              if (depth === 0 && i !== currentLine) {
                skipTo = i;
                break;
              }
            }
            if (skipTo !== -1) {
               setCurrentLine(skipTo + 1);
               logMessage(`ELSE: Skipping (IF branch was executed).`);
               return;
            }
         } else {
            // We were skipped here because IF was false.
            // Move into the ELSE block.
            setCurrentLine(prev => prev + swallowed);
            return;
         }
      }

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
            setCurrentLine(prev => prev + swallowed);
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
        setCurrentLine(prev => prev + swallowed);
        logMessage("SCOPE_ENTER: Opening memory segment.");
        return;
      }

      if ((line.includes('void ') || line.includes('int ')) && line.includes('(') && !line.includes('=')) {
        const funcName = line.match(/(?:void|int)\s+(\w+)/)?.[1] || "main";
        pushFrame(funcName);
        logMessage(`ENTER_PROC: Frame allocated for '${funcName}'. LIFO growth.`);
        setCurrentLine(prev => prev + swallowed);
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

      setCurrentLine(prev => prev + swallowed);
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
    
    resetCompiler();
    
    // Tiny delay to ensure state updates propagate before starting auto-step
    setTimeout(() => {
      setIsAutoStepping(true);
      logMessage("EXECUTION_START: Auto-stepping initiated from main.");
    }, 100);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTarget) return;
    updateOrAddVariable(inputTarget.name, userInput);
    setIsAwaitingInput(false);
    setUserInput("");
    setInputTarget(null);
    setCurrentLine(prev => prev + swallowedLines);
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
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,#1e1b4b_0%,transparent_50%)] pointer-events-none opacity-40" />
          <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,#1e293b_0%,transparent_40%)] pointer-events-none opacity-30" />
          <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none brightness-100 contrast-150" />
        </>
      ) : (
        <div className="fixed inset-0 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none opacity-40" />
      )}



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
          </nav>
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
        <AnimatePresence mode="wait">
          {mainTab === 'compiler' ? (
            <motion.div 
              key="compiler"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex overflow-hidden"
            >
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
                       code={code} setCode={setCode} currentLine={currentLine} theme={theme} errors={errors}
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
                       <div className="w-2 h-2 rounded-none bg-indigo-500/50" />
                       <span className="text-[8px] font-mono font-bold uppercase tracking-wider opacity-60">Globals</span>
                    </div>
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
                
                <div className="p-8 space-y-12 flex flex-col items-center flex-1 transition-colors">
                  <div className="w-full max-w-7xl">
                    {globals.length > 0 && (
                      <div className={`mb-16 border rounded-none overflow-hidden ${theme === 'dark' ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-500/5 border-indigo-500/10'}`}>
                        <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-white/5 bg-black/20' : 'border-black/5 bg-white/50'}`}>
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-3">
                            <Monitor size={14} /> .DATA_SECTION :: STATIC_MEM
                          </h3>
                          <span className="text-[9px] font-mono opacity-30 uppercase tracking-widest">Global_Namespace_Segment</span>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {globals.map((g: any) => (
                            <div 
                              key={g.id} 
                              className={`group p-4 border transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-black/60 border-white/5 hover:border-indigo-500/40 shadow-xl' : 'bg-white border-black/10 shadow-sm hover:shadow-md'}`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <code 
                                  id={`p-addr-${g.address.toUpperCase()}`}
                                  className={`text-[9px] font-mono opacity-40 group-hover:opacity-100 transition-opacity`}
                                >
                                  {g.address}
                                </code>
                                <span className="text-[8px] font-black text-indigo-500/50 uppercase tracking-tighter">VALUE</span>
                              </div>
                              <div 
                                className="flex justify-between items-end"
                                id={g.type === 'pointer' ? `p-src-${g.id}` : undefined}
                              >
                                <span className={`font-black text-indigo-400 text-base tracking-tight`}>{g.name}</span>
                                <span className={`font-mono font-black text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{g.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="w-full max-w-7xl grid grid-cols-1 xl:grid-cols-2 gap-10 relative">
                     <StackVisualizer theme={theme} stack={stack} />
                     <HeapVisualizer theme={theme} heap={heap} freeHeap={freeHeap} />
                  </div>
                  <div className="flex-1 min-h-[100px]" /> 
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
            </motion.div>
          ) : (
            <motion.div 
              key="dsa"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <DSAWorld theme={theme} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
