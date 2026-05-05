'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import TopNavigation from './components/TopNavigation';
import CompilerCore from './components/CompilerCore';
// import DSAWorld from './components/DSAWorld';
import RevisionPortal from './components/RevisionPortal';
// import LearningHub from './components/LearningHub';
import { useCompiler } from './hooks/useCompiler';
import revisionPrograms from './data/revision-programs.json';

const INITIAL_CODE = `#include <stdio.h>

int main() {
    int n = 1234;
    int reverse = 0;
    int temp;
    
    printf("Original number: %d\\n", n);
    
    while(n != 0) {
        temp = n % 10;
        reverse = reverse * 10 + temp;
        n = n / 10;
    }
    
    printf("Reversed number: %d\\n", reverse);
    return 0;
}
`;

const ENABLE_BETA = process.env.NEXT_PUBLIC_ENABLE_BETA_FEATURES === 'true';

export default function MemoryArchitect() {
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mainTab, setMainTab] = useState<'compiler' | 'dsa' | 'revision' | 'learning'>('compiler');
  const [compilerTab, setCompilerTab] = useState<'visualizer' | 'theory'>('visualizer');
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const {
    stack, heap, globals, code, setCode, currentLine, history, isAutoStepping, setIsAutoStepping,
    isAwaitingInput, userInput, setUserInput, inputTarget, handleInputSubmit, runCode, stepCode,
    resetCompiler, logEndRef, freeHeap
  } = useCompiler(INITIAL_CODE);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Ensure mainTab is valid if beta is disabled
  useEffect(() => {
    // If BETA is disabled or we just want them hidden now as per request
    if (!ENABLE_BETA && (mainTab === 'dsa' || mainTab === 'learning')) {
      setMainTab('compiler');
    }
  }, [mainTab, ENABLE_BETA]);

  if (!isMounted) return null;

  const handleSelectProgram = (newCode: string) => {
    setCode(newCode);
    setMainTab('compiler');
    resetCompiler();
  };

  const handleDeployModule = (revisionId: string) => {
    const program = revisionPrograms.find(p => p.id === revisionId);
    if (program) {
      setCode(program.code);
    } else {
      // Fallback to first program if ID not found
      setCode(revisionPrograms[0].code);
    }
    setMainTab('compiler');
    resetCompiler();
  };

  return (
    <main 
      ref={containerRef}
      className={`min-h-screen flex flex-col font-sans transition-colors duration-500 overflow-hidden ${
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

      <TopNavigation 
        theme={theme} 
        setTheme={setTheme} 
        mainTab={mainTab} 
        setMainTab={setMainTab} 
        enableBeta={ENABLE_BETA}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {mainTab === 'compiler' ? (
          <CompilerCore
            theme={theme}
            code={code}
            setCode={setCode}
            currentLine={currentLine}
            compilerTab={compilerTab}
            setCompilerTab={setCompilerTab}
            stack={stack}
            heap={heap}
            globals={globals}
            history={history}
            isAutoStepping={isAutoStepping}
            setIsAutoStepping={setIsAutoStepping}
            isAwaitingInput={isAwaitingInput}
            userInput={userInput}
            setUserInput={setUserInput}
            inputTarget={inputTarget}
            handleInputSubmit={handleInputSubmit}
            runCode={runCode}
            stepCode={stepCode}
            resetCompiler={resetCompiler}
            logEndRef={logEndRef}
            freeHeap={freeHeap}
          />
        ) : (mainTab === 'dsa' && ENABLE_BETA) ? (
          <div className="flex-1 flex items-center justify-center">
             <p className="text-slate-500 font-mono text-xs uppercase tracking-widest text-center">World Space_ <br/> <span className="opacity-40 mt-2 block">Offline_</span></p>
          </div>
        ) : (mainTab === 'learning' && ENABLE_BETA) ? (
          <div className="flex-1 flex items-center justify-center">
             <p className="text-slate-500 font-mono text-xs uppercase tracking-widest text-center">Learning Hub_ <br/> <span className="opacity-40 mt-2 block">Offline_</span></p>
          </div>
        ) : mainTab === 'revision' ? (
          <RevisionPortal 
            theme={theme} 
            onSelectProgram={handleSelectProgram} 
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
             <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Access Restricted_</p>
          </div>
        )}
      </div>
    </main>
  );
}
