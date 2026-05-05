'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { StackFrame, HeapObject, LoopState } from '../types/memory';

export function useCompiler(initialCode: string) {
  const [stack, setStack] = useState<StackFrame[]>([]);
  const [heap, setHeap] = useState<HeapObject[]>([]);
  const [globals, setGlobals] = useState<any[]>([]);
  const [code, setCode] = useState(initialCode);
  const [currentLine, setCurrentLine] = useState(-1);
  const [history, setHistory] = useState<string[]>(["SYSTEM_BOOT: READY"]);
  const [isAutoStepping, setIsAutoStepping] = useState(false);
  const [wasAutoStepping, setWasAutoStepping] = useState(false);
  const [isAwaitingInput, setIsAwaitingInput] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [inputTarget, setInputTarget] = useState<{name: string, type: string} | null>(null);
  
  const [loopStack, setLoopStack] = useState<LoopState[]>([]);
  const [returnStack, setReturnStack] = useState<{line: number, swallowed: number, targetVar?: string}[]>([]);
  const [swallowedLines, setSwallowedLines] = useState(1);
  const [errors, setErrors] = useState<{ line: number, message: string }[]>([]);

  const logEndRef = useRef<HTMLDivElement>(null);
  const stepTimerRef = useRef<NodeJS.Timeout|null>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  const logMessage = useCallback((msg: string, type: string = 'system') => {
    setHistory(prev => [...prev, msg].slice(-50));
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
    setGlobals([]);
    setReturnStack([]);
    setLoopStack([]);
    
    const lines = code.split('\n');
    let mainIdx = -1;
    const detectedGlobals: any[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].split('//')[0].split('/*')[0].trim();
        if (line.includes('int main(') || line.includes('void main(')) {
            mainIdx = i;
            break;
        }

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
        newVars[varIndex] = { ...newVars[varIndex], value };
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
    let finalExpr = expr.trim();
    if (stack.length === 0) return finalExpr;

    const findVariable = (name: string) => {
        if (stack.length > 0) {
            const currentFrame = stack[stack.length - 1];
            const v = currentFrame.variables.find(v => v.name === name);
            if (v) return v;
        }
        return globals.find(g => g.name === name) || null;
    };

    let iterations = 0;
    while (iterations < 40) {
      iterations++;
      const derefAddrMatch = finalExpr.match(/\*(\(0x[0-9A-Fa-f]+\)|0x[0-9A-Fa-f]+)/);
      if (derefAddrMatch) {
         const fullDeref = derefAddrMatch[0];
         const targetAddr = derefAddrMatch[1].replace(/[()]/g, '');
         const heapTarget = heap.find(h => h.address === targetAddr);
         const stackTarget = [...stack].reverse().flatMap(f => f.variables).find(v => v.address === targetAddr);
         finalExpr = finalExpr.replace(fullDeref, heapTarget ? heapTarget.value : (stackTarget ? stackTarget.value : '0'));
         continue;
      }
      const derefVarMatch = finalExpr.match(/\*\s*([a-zA-Z_]\w*)/);
      if (derefVarMatch) {
        const varName = derefVarMatch[1];
        const v = findVariable(varName);
        if (v && (v.type === 'pointer' || v.value.startsWith('0x'))) {
          const targetAddr = v.value;
          const heapTarget = heap.find(h => h.address === targetAddr);
          const stackTarget = [...stack].reverse().flatMap(f => f.variables).find(v => v.address === targetAddr);
          finalExpr = finalExpr.replace(derefVarMatch[0], heapTarget ? heapTarget.value : (stackTarget ? stackTarget.value : '0'));
          continue;
        }
      }
      const addrMatch = finalExpr.match(/(?:&|&amp;)([a-zA-Z_]\w*)/);
      if (addrMatch) {
        const v = findVariable(addrMatch[1]);
        if (v) {
          finalExpr = finalExpr.replace(addrMatch[0], v.address);
          continue;
        }
      }
      const match = finalExpr.match(/(&|&amp;)?\b(?!(?:__SKIP__|__KEY__))([a-zA-Z_]\w*)\b((?:\[[^\]]+\]|\.[\w]+|->[\w]+)*)/);
      if (!match) break;
      const [fullMatch, isAddress, root, tail] = match;
      if (['int', 'char', 'float', 'double', 'void', 'struct', 'if', 'for', 'while', 'return', 'printf', 'scanf', 'malloc', 'free', 'sizeof', 'NULL'].includes(root)) {
        finalExpr = finalExpr.replace(fullMatch, root === 'NULL' ? '0' : `__KEY__${fullMatch}__`);
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
               resolvedTail = resolvedTail.replace(`[${idxExpr}]`, `[${evaluateExpression(idxExpr)}]`);
            }
          }
          const searchKey = `${resolvedTail}:`;
          if (v.value.includes(searchKey)) {
            const startIdx = v.value.indexOf(searchKey) + searchKey.length;
            let depth = 0, actualEnd = -1;
            for (let i = startIdx; i < v.value.length; i++) {
               if (v.value[i] === '{' || v.value[i] === '[') depth++;
               if (v.value[i] === '}' || v.value[i] === ']') depth--;
               if (depth < 0 || (depth === 0 && (v.value[i] === ',' || v.value[i] === '}'))) { actualEnd = i; break; }
            }
            if (actualEnd !== -1) resolvedValue = v.value.substring(startIdx, actualEnd).trim();
          } else {
            const accessors = resolvedTail.match(/\[\d+\]|\.[\w]+/g) || [];
            let currentData = v.value;
            for (const acc of accessors) {
               const accKey = `${acc}:`;
               if (currentData.includes(accKey)) {
                  const startIdx = currentData.indexOf(accKey) + accKey.length;
                  let depth = 0, actualEnd = -1;
                  for (let i = startIdx; i < currentData.length; i++) {
                     if (currentData[i] === '{' || currentData[i] === '[') depth++;
                     if (currentData[i] === '}' || currentData[i] === ']') depth--;
                     if (depth < 0 || (depth === 0 && (currentData[i] === ',' || currentData[i] === '}'))) { actualEnd = i; break; }
                  }
                  if (actualEnd !== -1) currentData = currentData.substring(startIdx, actualEnd).trim(); else { currentData = '0'; break; }
               } else { currentData = '0'; break; }
            }
            resolvedValue = currentData;
          }
        }
        const boundaryRegex = new RegExp(`(^|\\W)${fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\W|$)`);
        finalExpr = finalExpr.replace(boundaryRegex, (m, p1, p2) => (p1 || '') + resolvedValue + (p2 || ''));
      } else { finalExpr = finalExpr.replace(fullMatch, `__SKIP__${fullMatch}__`); }
    }
    finalExpr = finalExpr.replace(/__SKIP__(\w+)__/g, '0').replace(/__KEY__(\w+)__/g, '$1');
    const isPureAddress = finalExpr.trim().match(/^0x[0-9A-Fa-f]+$/);
    if (!isPureAddress) finalExpr = finalExpr.replace(/0x[0-9A-Fa-f]+/g, (m) => parseInt(m, 16).toString());
    try {
        if (isPureAddress) return isPureAddress[0];
        // eslint-disable-next-line no-eval
        let result = eval(finalExpr);
        
        // C-style integer division: if variables are ints, we truncate the result
        // For simplicity in this simulator, we truncate if there's a division operator and result is numeric
        // and no decimal points are present in the resolved expression
        if (typeof result === 'number' && finalExpr.includes('/') && !finalExpr.includes('.')) {
          result = Math.trunc(result);
        }
        
        return result !== undefined ? result.toString() : finalExpr;
    } catch (e) { return finalExpr; }
  }, [stack, heap, globals]);

  const stepCode = useCallback(() => {
    try {
      if (currentLine === -1) { resetCompiler(); return; }
      const lines = code.split('\n');
      if (currentLine >= lines.length) { setIsAutoStepping(false); logMessage("EXECUTION_COMPLETE: Kernel gracefully exited."); return; }

      let statement = "", swallowed = 0, i = currentLine, parenDepth = 0, bracketDepth = 0;
      while (i < lines.length) {
        let trimmed = lines[i].split('//')[0].split('/*')[0].trim();
        statement += (statement ? " " : "") + trimmed; swallowed++;
        parenDepth += (trimmed.match(/\(/g) || []).length - (trimmed.match(/\)/g) || []).length;
        bracketDepth += (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length;
        if (parenDepth <= 0) {
          if (trimmed.endsWith(';') || trimmed.endsWith('{') || trimmed.endsWith('}')) break;
          if (trimmed.match(/^(if|for|while|else|struct)/) && (trimmed.endsWith(')') || trimmed.endsWith('else') || trimmed.endsWith('{'))) break;
          if (trimmed.startsWith('#') || !trimmed) break;
        }
        i++;
      }
      setSwallowedLines(swallowed);
      const line = statement.startsWith('for') ? statement : statement.split(';')[0].trim();
      
      if (currentLine >= 0 && lines[currentLine].includes('main(') && stack.length === 0) { pushFrame('main'); setCurrentLine(prev => prev + 1); return; }
      
      const activeLoop = loopStack[loopStack.length - 1];
      if (line === '}' && activeLoop && currentLine === activeLoop.bodyEndLine) {
         setCurrentLine(activeLoop.startLine); 
         logMessage(`${activeLoop.type.toUpperCase()}: Loop body end reached. Jumping to condition: (${activeLoop.condition})`); 
         return;
      }

      if (line === '}' || line.startsWith('return')) {
         if (returnStack.length > 0) {
            const last = returnStack[returnStack.length - 1];
            
            if (line.startsWith('return')) {
              const resMatch = line.match(/return\s+(.*)/);
              if (resMatch && last.targetVar) {
                 const returnValue = evaluateExpression(resMatch[1].replace(';', '').trim());
                 // We need to update the variable in the PARENT frame
                 setStack(prev => {
                   const next = [...prev];
                   if (next.length > 1) {
                     const callingFrame = next[next.length - 2];
                     const varName = last.targetVar!;
                     const vIdx = callingFrame.variables.findIndex(v => v.name === varName);
                     if (vIdx !== -1) {
                        callingFrame.variables[vIdx] = { ...callingFrame.variables[vIdx], value: returnValue };
                     } else {
                        // If it doesn't exist, we added it to the calling frame when the call was made, 
                        // but let's be safe and check globals too or just add it.
                        callingFrame.variables.push({
                           id: Math.random().toString(),
                           name: varName,
                           type: 'value',
                           value: returnValue,
                           address: `0x${(parseInt(callingFrame.id, 16) - callingFrame.variables.length * 4).toString(16).toUpperCase()}`,
                           size: 4
                        });
                     }
                   }
                   return next;
                 });
              }
            }
            
            setReturnStack(prev => prev.slice(0, -1)); popFrame(); setCurrentLine(last.line + last.swallowed);
            logMessage(`RETURN: Popping stack frame. Returning to line ${last.line + last.swallowed + 1}.`); return;
         } else if (line === '}') { 
            // Only terminate main if we are at the very end of code OR this is specifically the last closing brace
            const isEndOfMain = currentLine >= lines.length - 1 || !lines.slice(currentLine + 1).some(l => l.trim().length > 0 && !l.trim().startsWith('//'));
            if (isEndOfMain) {
              popFrame(); 
              setCurrentLine(lines.length); 
              logMessage("TERMINATE: End of scope reached. Execution halted."); 
              return; 
            } else {
              // Just a block closing brace, step over it
              setCurrentLine(prev => prev + swallowed);
              return;
            }
         }
      }

      if (!line || line.startsWith('#')) { setCurrentLine(prev => prev + swallowed); return; }

      // FLOW CONTROL: WHILE, IF, FOR (Moved for precedence)
      const flowMatch = line.match(/^(if|while|for)/);
      if (flowMatch) {
        const type = flowMatch[0];
        const condMatch = line.match(/\((.*)\)/);
        if (condMatch) {
          const condition = condMatch[1];
          const result = evaluateExpression(condition);
          // C-style truthiness: 0 is false, anything else is true.
          // Handle string results from evaluateExpression which might be "true", "false", "0", "123", etc.
          const isTruthy = result !== '0' && result !== 'false' && result !== '' && result !== 'null' && result !== 'undefined';

          if (type === 'if') {
             if (!isTruthy) {
                let depth = 0, skipTo = -1;
                for (let j = currentLine; j < lines.length; j++) {
                   depth += (lines[j].match(/\{/g) || []).length;
                   depth -= (lines[j].match(/\}/g) || []).length;
                   if (depth === 0 && j !== currentLine && lines[j].includes('}')) { skipTo = j; break; }
                }
                if (skipTo !== -1) { setCurrentLine(skipTo + 1); logMessage(`IF: Condition FALSE. Skipping block.`); return; }
             }
          } else if (type === 'while' || type === 'for') {
             if (isTruthy) {
                if (!loopStack.find(l => l.startLine === currentLine)) {
                   let depth = 0, bodyEnd = -1;
                   for (let j = currentLine; j < lines.length; j++) {
                     depth += (lines[j].match(/\{/g) || []).length;
                     depth -= (lines[j].match(/\}/g) || []).length;
                     if (depth === 0 && j !== currentLine && lines[j].includes('}')) {
                       bodyEnd = j;
                       break;
                     }
                   }
                   setLoopStack(prev => [...prev, { 
                     type, 
                     startLine: currentLine, 
                     condition, 
                     bodyEndLine: bodyEnd 
                   }]);
                }
             } else {
                let depth = 0, skipTo = -1;
                for (let j = currentLine; j < lines.length; j++) {
                   depth += (lines[j].match(/\{/g) || []).length;
                   depth -= (lines[j].match(/\}/g) || []).length;
                   if (depth === 0 && j !== currentLine && lines[j].includes('}')) { skipTo = j; break; }
                }
                setLoopStack(prev => prev.filter(l => l.startLine !== currentLine));
                if (skipTo !== -1) { 
                  setCurrentLine(skipTo + 1); 
                  logMessage(`${type.toUpperCase()}: Condition FALSE. Terminating loop sequence.`); 
                  return; 
                }
             }
          }
        }
      }

      if ((line.includes('int ') || line.includes('void ') || line.includes('char ') || line.includes('float ') || line.includes('double ')) && line.includes('(') && line.includes(';') && !line.includes('=')) { setCurrentLine(prev => prev + swallowed); return; }

      if ((line.includes('int ') || line.includes('void ') || line.includes('char ') || line.includes('float ') || line.includes('double ')) && line.includes('(') && !line.includes(';') && !line.includes('=') && !lines[currentLine].includes('main(')) {
         let depth = 0, skipTo = -1;
         for (let j = currentLine; j < lines.length; j++) {
            if (lines[j].includes('{')) depth++; if (lines[j].includes('}')) depth--;
            if (depth === 0 && j !== currentLine && lines[j].includes('}')) { skipTo = j; break; }
         }
         if (skipTo !== -1) { setCurrentLine(skipTo + 1); logMessage(`SKIP: Function '${line.match(/\w+(?=\s*\()/)?.[0]}' body bypassed.`); return; }
      }

      const callMatch = line.match(/^(\w+)\s*\((.*)\)$/);
      if (callMatch && !line.match(/^(if|for|while|printf|scanf|malloc|free|return)/)) {
        const funcName = callMatch[1], argsStr = callMatch[2];
        let funcLine = -1;
        for (let j = 0; j < lines.length; j++) { if (lines[j].includes(`${funcName}(`) && !lines[j].includes(';') && j !== currentLine) { funcLine = j; break; } }
        if (funcLine !== -1) {
           logMessage(`CALL: Transferring control to '${funcName}'. Pushing frame.`);
           setReturnStack(prev => [...prev, { line: currentLine, swallowed }]); pushFrame(funcName);
           const paramsMatch = lines[funcLine].match(/\((.*)\)/);
           if (paramsMatch) {
              const params = paramsMatch[1].split(',').map(p => p.trim().split(/\s+/).pop());
              const argVals = argsStr.split(',').map(a => evaluateExpression(a.trim()));
              setStack(prev => {
                const next = [...prev], frame = next[next.length - 1];
                params.forEach((p, idx) => {
                  if (p) {
                    const isPointerParam = p.startsWith('*'), cleanName = p.replace('*', '').trim();
                    frame.variables.push({
                      id: Math.random().toString(), name: cleanName || `param_${idx}`, type: isPointerParam ? 'pointer' : 'value',
                      value: argVals[idx] || '0', address: `0x${(parseInt(frame.id, 16) - (idx + 1) * 4).toString(16).toUpperCase()}`,
                      size: isPointerParam ? 8 : 4
                    });
                  }
                });
                return next;
              });
           }
           setCurrentLine(funcLine + 1); return;
        } else { setErrors(prev => [...prev, { line: currentLine, message: `Undefined function: ${funcName}` }]); setIsAutoStepping(false); return; }
      }

      if (line.match(/^(?!(?:while|if|for|else|switch|return))\w+\s*\(/)) {
        if (line.startsWith('printf')) {
          const match = line.match(/printf\s*\(\s*"([^"]*)"\s*(?:,\s*(.*))?\s*\)/);
          if (match) {
            let format = match[1];
            let argsStr = match[2] || "";
            
            let args: string[] = [];
            let currentArg = "";
            let depth = 0;
            for (let char of argsStr) {
               if (char === '(') depth++;
               else if (char === ')') depth--;
               if (char === ',' && depth === 0) {
                 args.push(currentArg.trim());
                 currentArg = "";
               } else {
                 currentArg += char;
               }
            }
            if (currentArg.trim()) args.push(currentArg.trim());

            const evaluatedArgs = args.map(a => evaluateExpression(a));
            
            let output = format.replace(/%d|%u|%p|%f|%s/g, (m) => {
              const val = evaluatedArgs.shift();
              if (val === undefined) return m;
              
              if (m === '%f') {
                const num = parseFloat(val);
                return isNaN(num) ? '0.000000' : num.toFixed(6);
              }
              return val;
            });
            logMessage(`STDOUT: ${output.replace(/\\n/g, '')}`, 'output');
          }
        } else if (line.startsWith('scanf')) {
          const match = line.match(/scanf\s*\(\s*"([^"]*)"\s*,\s*(.*)\s*\)/);
          if (match) {
            const formatStr = match[1];
            let targetName = match[2].trim();
            const type = formatStr.includes('%f') ? 'float' : 'int';
            
            if (targetName.startsWith('&')) {
              targetName = targetName.substring(1).trim();
            } else {
              // If targetName is a pointer, we should update what it points to
              const currentFrame = stack[stack.length - 1];
              const v = (currentFrame?.variables.find(v => v.name === targetName)) || globals.find(g => g.name === targetName);
              if (v && (v.type === 'pointer' || v.value.startsWith('0x'))) {
                targetName = '*' + targetName;
              }
            }

            setInputTarget({ name: targetName, type: type }); 
            setWasAutoStepping(isAutoStepping);
            setIsAwaitingInput(true); 
            setIsAutoStepping(false); 
            return;
          }
        } else if (line.includes('malloc')) {
          const mMatch = line.match(/(\w+)\s*=\s*(?:\(.*\))?malloc\s*\(([^)]+)\)/);
          if (mMatch) {
             const ptrName = mMatch[1], sizeExpr = mMatch[2];
             const size = parseInt(evaluateExpression(sizeExpr));
             const address = `0x${(0x1000 + heap.length * 0x100).toString(16).toUpperCase()}`;
             setHeap(prev => [...prev, { 
               id: Math.random().toString(), 
               address, 
               value: '0', 
               size,
               name: `heap_${address}`,
               type: 'struct',
               color: '#10b981'
             }]);
             updateOrAddVariable(ptrName, address, 'pointer');
             logMessage(`MALLOC: Allocated ${size} bytes at ${address} on the HEAP.`);
          }
        } else if (line.startsWith('free')) {
          const fMatch = line.match(/free\s*\(([^)]+)\)/);
          if (fMatch) {
            const ptrName = fMatch[1], addr = evaluateExpression(ptrName);
            setHeap(prev => prev.filter(h => h.address !== addr));
            logMessage(`FREE: Deallocated memory at ${addr}. Potential dangling pointers!`);
          }
        }
      } else if (line.match(/^\w+\s*=|^\s*\*\w+\s*=|^\s*\w+->\w+\s*=/)) {
        const parts = line.split('=');
        const varName = parts[0].trim();
        const rhs = parts[1].trim();
        
        // Check if RHS is a function call: area = calculateAreaOfCircle(radius)
        const funcCallMatch = rhs.match(/^(\w+)\s*\((.*)\)$/);
        if (funcCallMatch && !rhs.match(/^(malloc|free|scanf|printf)/)) {
           const funcName = funcCallMatch[1], argsStr = funcCallMatch[2];
           let funcLine = -1;
           for (let j = 0; j < lines.length; j++) { if (lines[j].includes(`${funcName}(`) && !lines[j].includes(';') && j !== currentLine) { funcLine = j; break; } }
           
           if (funcLine !== -1) {
              logMessage(`CALL: Evaluating '${funcName}' and assigning to '${varName}'.`);
              setReturnStack(prev => [...prev, { line: currentLine, swallowed, targetVar: varName }]); pushFrame(funcName);
              const paramsMatch = lines[funcLine].match(/\((.*)\)/);
              if (paramsMatch) {
                 const params = paramsMatch[1].split(',').map(p => p.trim().split(/\s+/).pop());
                 const argVals = argsStr.split(',').map(a => evaluateExpression(a.trim()));
                 setStack(prev => {
                   const next = [...prev], frame = next[next.length - 1];
                   params.forEach((p, idx) => {
                     if (p) {
                       const isPointerParam = p.startsWith('*'), cleanName = p.replace('*', '').trim();
                       frame.variables.push({
                         id: Math.random().toString(), name: cleanName || `param_${idx}`, type: isPointerParam ? 'pointer' : 'value',
                         value: argVals[idx] || '0', address: `0x${(parseInt(frame.id, 16) - (idx + 1) * 4).toString(16).toUpperCase()}`,
                         size: isPointerParam ? 8 : 4
                       });
                     }
                   });
                   return next;
                 });
              }
              setCurrentLine(funcLine + 1); return;
           }
        }
        
        const value = evaluateExpression(rhs);
        updateOrAddVariable(varName, value);
      } else if (line.startsWith('int ') || line.startsWith('char ') || line.startsWith('float ') || line.startsWith('double ') || line.startsWith('struct ')) {
        const typeMatch = line.match(/^(int|char|float|double|struct\s+\w+)\s*(.*)/);
        if (typeMatch) {
          const type = typeMatch[1], rest = typeMatch[2].replace(/;$/, '').trim();
          rest.split(',').forEach(part => {
             const vMatch = part.trim().match(/^(\*?\w+)(?:\[(\d+)\])?(?:\s*=\s*(.*))?$/);
             if (vMatch) {
                const nameRest = vMatch[1], arrSize = vMatch[2], initial = vMatch[3];
                const isPointer = nameRest.startsWith('*');
                const name = nameRest.replace('*', '').trim();
                let initialValue = initial ? evaluateExpression(initial) : '0';
                if (arrSize) {
                   initialValue = '{';
                   for (let k = 0; k < parseInt(arrSize); k++) initialValue += `[${k}]: 0${k < parseInt(arrSize)-1 ? ', ' : ''}`;
                   initialValue += '}';
                   updateOrAddVariable(name, initialValue, 'array');
                } else updateOrAddVariable(name, initialValue, isPointer ? 'pointer' : (type.startsWith('struct') ? 'struct' : 'value'));
             }
          });
        }
      }
      setCurrentLine(prev => prev + swallowed);
    } catch (e) {
      logMessage(`FATAL_ERROR: ${e instanceof Error ? e.message : String(e)}`);
      setIsAutoStepping(false);
    }
  }, [code, currentLine, stack, heap, globals, loopStack, returnStack, logMessage, evaluateExpression, pushFrame, popFrame, resetCompiler, updateOrAddVariable]);

  useEffect(() => {
    if (isAutoStepping && !isAwaitingInput) {
      stepTimerRef.current = setTimeout(stepCode, 600);
    } else if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
    }
    return () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current); };
  }, [isAutoStepping, isAwaitingInput, stepCode]);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputTarget && userInput) {
      updateOrAddVariable(inputTarget.name, userInput);
      logMessage(`STDIN: Received data for ${inputTarget.name} -> ${userInput}`);
      setIsAwaitingInput(false); 
      setUserInput(""); 
      setInputTarget(null); 
      setCurrentLine(prev => prev + absorbedLineCount());
      if (wasAutoStepping) {
        setIsAutoStepping(true);
      }
    }
  };

  const absorbedLineCount = () => swallowedLines;

  const runCode = () => { resetCompiler(); setIsAutoStepping(true); };

  const freeHeap = (id: string) => {
    setHeap(prev => prev.filter(obj => obj.id !== id));
    logMessage(`FREE: Memory at target address released.`);
  };

  return {
    stack, heap, globals, code, setCode, currentLine, history, isAutoStepping, setIsAutoStepping,
    isAwaitingInput, userInput, setUserInput, inputTarget, handleInputSubmit, runCode, stepCode,
    resetCompiler, logEndRef, freeHeap
  };
}
