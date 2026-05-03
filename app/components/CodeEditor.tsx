'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Play, SkipForward, ArrowRight, Zap, AlertCircle } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  currentLine: number;
  theme?: 'dark' | 'light';
  errors?: { line: number, message: string }[];
}

const CodeEditor = ({
  code,
  setCode,
  currentLine,
  theme = 'dark',
  errors = []
}: CodeEditorProps) => {
  const preRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const [scrollPos, setScrollPos] = React.useState({ top: 0, left: 0 });

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    setScrollPos({ top: scrollTop, left: scrollLeft });
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  const highlightCode = (code: string) => {
    if (!code) return '';
    
    const escape = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    // 2. Define all patterns (order matters for priority)
    // Using raw characters for matching
    const patterns = [
      { name: 'comment', regex: /\/\*[\s\S]*?\*\/|\/\/.*/g, color: 'text-slate-500 italic' },
      { name: 'string', regex: /"([^"\\]*(\\.[^"\\]*)*)"/g, color: 'text-emerald-400 font-medium' },
      { name: 'preprocessor', regex: /#include\s+<.*?>|#define\s+\w+.*/g, color: 'text-rose-400 font-bold' },
      { name: 'keyword', regex: /\b(int|char|float|double|void|struct|if|else|for|while|return|long|short|unsigned|signed|const|static|typedef|sizeof|enum|switch|case|break|continue|default|union)\b/g, color: 'text-sky-400 font-bold' },
      { name: 'type', regex: /\b(size_t|ssize_t|uint8_t|int32_t|int64_t|FILE|bool)\b/g, color: 'text-cyan-400 font-medium' },
      { name: 'function', regex: /\b([a-zA-Z_]\w*)(?=\s*\()/g, color: 'text-yellow-200' },
      { name: 'number', regex: /\b(0x[0-9A-Fa-f]+|\d+)\b/g, color: 'text-amber-400' },
      { name: 'operator', regex: /[*&]/g, color: 'text-rose-300' }
    ];

    // 3. Find all matches and mask them
    const tokens: { start: number, end: number, color: string, text: string }[] = [];
    const mask = new Array(code.length).fill(false);

    patterns.forEach(p => {
      const regex = new RegExp(p.regex.source, p.regex.flags);
      let match;
      while ((match = regex.exec(code)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        
        let overlap = false;
        for (let i = start; i < end; i++) {
          if (mask[i]) { overlap = true; break; }
        }
        
        if (!overlap) {
          if (p.name === 'function') {
            const reserved = ['if', 'for', 'while', 'switch', 'return', 'sizeof', 'printf', 'scanf', 'malloc', 'free'];
            if (reserved.includes(match[1])) continue;
          }
          
          tokens.push({ start, end, color: p.color, text: match[0] });
          for (let i = start; i < end; i++) mask[i] = true;
        }
        
        if (regex.lastIndex === match.index) regex.lastIndex++;
      }
    });

    // 4. Sort and construct HTML
    tokens.sort((a, b) => a.start - b.start);

    let html = '';
    let lastIndex = 0;
    tokens.forEach(t => {
      html += escape(code.substring(lastIndex, t.start));
      html += `<span class="${t.color}">${escape(code.substring(t.start, t.end))}</span>`;
      lastIndex = t.end;
    });
    html += escape(code.substring(lastIndex));

    return html;
  };

  const errorOnLine = (lineIdx: number) => {
    return errors.find(e => e.line === lineIdx);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;

    // Handle Tab
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift + Tab: Remove 2 spaces if they exist
        const beforeSelection = value.substring(0, selectionStart);
        const lineStart = beforeSelection.lastIndexOf('\n') + 1;
        const currentLineStr = value.substring(lineStart, selectionStart);
        
        if (currentLineStr.startsWith('  ')) {
          const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2);
          setCode(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart - 2;
          }, 0);
        }
      } else {
        // Tab: Insert 2 spaces
        const newValue = value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd);
        setCode(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
        }, 0);
      }
    }

    // Handle Auto-indentation on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const beforeSelection = value.substring(0, selectionStart);
      const afterSelection = value.substring(selectionEnd);
      const lastLine = beforeSelection.substring(beforeSelection.lastIndexOf('\n') + 1);
      const indentMatch = lastLine.match(/^\s*/);
      const currentIndent = indentMatch ? indentMatch[0] : '';
      
      let nextIndent = currentIndent;
      if (lastLine.trim().endsWith('{')) {
        nextIndent += '  ';
      }

      const newValue = beforeSelection + '\n' + nextIndent + afterSelection;
      setCode(newValue);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1 + nextIndent.length;
      }, 0);
    }

    // Handle Backspace for pairs and indentation
    if (e.key === 'Backspace') {
      const charBefore = value.substring(selectionStart - 1, selectionStart);
      const charAfter = value.substring(selectionStart, selectionEnd + 1);
      
      const pairs: Record<string, string> = {
        '{': '}',
        '(': ')',
        '[': ']',
        '"': '"',
        "'": "'"
      };

      // Case 1: Deleting a pair (e.g., |{}| )
      if (selectionStart === selectionEnd && pairs[charBefore] === charAfter) {
        e.preventDefault();
        const newValue = value.substring(0, selectionStart - 1) + value.substring(selectionStart + 1);
        setCode(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart - 1;
        }, 0);
        return;
      }

      // Case 2: Deleting 2 spaces indentation
      if (selectionStart === selectionEnd) {
        const beforeSelection = value.substring(0, selectionStart);
        const lineStart = beforeSelection.lastIndexOf('\n') + 1;
        const currentLineStr = beforeSelection.substring(lineStart);
        
        if (currentLineStr.length >= 2 && currentLineStr.endsWith('  ') && currentLineStr.trim() === '') {
          e.preventDefault();
          const newValue = value.substring(0, selectionStart - 2) + value.substring(selectionStart);
          setCode(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart - 2;
          }, 0);
          return;
        }
      }
    }

    // Handle Bracket/Quote pairs insertion
    const pairs: Record<string, string> = {
      '{': '}',
      '(': ')',
      '[': ']',
      '"': '"',
      "'": "'"
    };

    if (pairs[e.key]) {
      e.preventDefault();
      const closing = pairs[e.key];
      const newValue = value.substring(0, selectionStart) + e.key + closing + value.substring(selectionEnd);
      setCode(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
    }
  };

  return (
    <section className={`flex-1 flex flex-col overflow-hidden transition-colors border-r ${
      theme === 'dark' ? 'bg-[#050505] border-white/5' : 'bg-slate-50 border-black/5'
    }`}>
      {/* Tool Header */}
      <div className={`px-4 py-2 border-b flex justify-between items-center ${
        theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-black/5'
      }`}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
            <Zap size={12} className="text-blue-400" />
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Editor_Active</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              // Enhanced C formatter
              let indent = 0;
              const lines = code.split('\n');
              const formattedLines = lines.map(line => {
                let trimmed = line.trim();
                
                // If line starts with closing brace, decrease indent before processing
                if (trimmed.startsWith('}')) indent = Math.max(0, indent - 1);
                
                let newLine = '  '.repeat(indent) + trimmed;
                
                // If line ends with opening brace, increase indent after processing
                if (trimmed.endsWith('{')) indent++;
                
                // Handle cases like "} else {" or "} while(...);"
                // This is a simple heuristic: if it has both we stay same indent level for next line
                // but we handled the current line's leading/trailing already.
                
                return newLine;
              });
              setCode(formattedLines.join('\n'));
            }}
            className="text-[10px] font-bold uppercase tracking-tighter px-2 py-1 hover:bg-white/5 rounded transition-colors flex items-center gap-1.5"
            title="Auto-format code (experimental)"
          >
            <div className="w-1 h-1 rounded-full bg-emerald-400" />
            Format_Auto
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 relative font-mono text-[14px] overflow-hidden flex">
        
        {/* Line Number Gutter (Synced Scroll) */}
        <div 
          ref={gutterRef}
          className={`w-12 border-r flex flex-col pt-6 items-center flex-shrink-0 overflow-hidden select-none pointer-events-none z-20 ${
            theme === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-slate-100 border-black/5'
          }`}
        >
          {code.split('\n').map((_, i) => {
            const error = errorOnLine(i);
            return (
              <div 
                key={i} 
                className={`relative w-full h-[24px] flex-shrink-0 flex items-center justify-center transition-colors ${
                  i === currentLine 
                    ? (theme === 'dark' ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-blue-600 font-bold bg-blue-500/5') 
                    : (theme === 'dark' ? 'text-slate-600/50' : 'text-slate-400')
                }`}
              >
                <span className="text-[10px]">{i + 1}</span>
                {error && (
                  <div className="absolute left-1">
                    <AlertCircle size={10} className="text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  </div>
                )}
              </div>
            );
          })}
          {/* Extra space for scrolling */}
          <div className="h-40 flex-shrink-0" />
        </div>

        {/* Text Area (Main scroll container) */}
        <div className="flex-1 relative overflow-hidden">
          {/* Exec Pointer background layer (behind text) - MUST offset based on scroll or be in scrollable div */}
          {/* We'll put it inside the highlighter pre to let it scroll naturally? No, pre is separate. */}
          {/* Better: Put EVERYTHING in a scrollable div and keep textarea transparent layer on top. */}

          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            className={`absolute inset-0 w-full h-full bg-transparent p-6 pl-6 resize-none focus:outline-none custom-scrollbar leading-[24px] z-10 selection:bg-blue-500/30 font-mono caret-blue-500 break-words whitespace-pre-wrap ${
              theme === 'dark' ? 'text-transparent' : 'text-transparent'
            }`}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            wrap="on"
          />

          <pre
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 p-6 pl-6 pointer-events-none whitespace-pre-wrap break-words overflow-hidden leading-[24px] z-0"
            dangerouslySetInnerHTML={{ __html: highlightCode(code) + '\n\n\n' }}
          />

          {/* Execution Highlight (Synced manually or via absolute in scrollable) */}
          {currentLine >= 0 && (
            <div 
              className={`absolute left-0 right-0 h-[24px] pointer-events-none z-0 border-y transition-all duration-300 ${
                theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-500/5 border-blue-500/10'
              }`}
              style={{ 
                top: currentLine * 24 + 24 - scrollPos.top,
                opacity: (currentLine * 24 + 24 - scrollPos.top) < 0 ? 0 : 1 
              }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
            </div>
          )}
        </div>
      </div>

      {/* Footer Info Bar */}
      <div className={`px-4 py-2 border-t text-[10px] flex justify-between items-center ${
        theme === 'dark' ? 'bg-black border-white/5 text-slate-500' : 'bg-slate-200 border-black/5 text-slate-500'
      }`}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold tracking-tight text-blue-400">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
            LIVE_COMPILER_V2
          </span>
          <div className="h-3 w-px bg-white/10" />
          <span className="tracking-widest uppercase opacity-40">Line {currentLine + 1}</span>
          <span className="tracking-widest uppercase opacity-40">C_GCC_11</span>
          {errors.length > 0 && (
            <span className="text-red-500 font-black animate-pulse flex items-center gap-1">
              <AlertCircle size={10} /> {errors.length} ERRORS_FOUND
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="opacity-30 uppercase tracking-[0.2em] font-mono">ANSI_C_ENABLED</span>
        </div>
      </div>
    </section>
  );
};

export default CodeEditor;
