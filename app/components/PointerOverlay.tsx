'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { StackFrame, HeapObject } from '../types/memory';

interface PointerOverlayProps {
  stack: StackFrame[];
  heap: HeapObject[];
  globals: any[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  theme?: 'dark' | 'light';
}

interface Connection {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
}

const PointerOverlay = ({ stack, heap, globals, containerRef, theme = 'dark' }: PointerOverlayProps) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const updateConnections = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newConnections: Connection[] = [];

    // Find all pointers (Stack + Globals)
    const allPointers: {id: string, value: string}[] = [];
    stack.forEach(frame => {
      frame.variables.forEach(v => {
        if (v.type === 'pointer' && v.value && v.value.startsWith('0x')) {
          allPointers.push({ id: v.id, value: v.value });
        }
      });
    });

    globals.forEach(g => {
      if (g.type === 'pointer' && g.value && g.value.startsWith('0x')) {
        allPointers.push({ id: g.id, value: g.value });
      }
    });

    allPointers.forEach(p => {
      const srcEl = document.getElementById(`p-src-${p.id}`);
      const targetAddr = p.value.toUpperCase();
      const destEl = document.getElementById(`p-addr-${targetAddr}`);

      if (srcEl && destEl) {
        const srcRect = srcEl.getBoundingClientRect();
        const destRect = destEl.getBoundingClientRect();

        // Calculate connection points
        // Source: Horizontal center of the pointer value
        // Target: Left edge center of the destination address
        newConnections.push({
          id: `${p.id}-${p.value}`,
          startX: srcRect.left + (srcRect.width / 2) - containerRect.left,
          startY: srcRect.top + (srcRect.height / 2) - containerRect.top,
          endX: destRect.left - containerRect.left - 5, // 5px offset for arrowhead
          endY: destRect.top + (destRect.height / 2) - containerRect.top,
          color: '#10b981' // emerald-500
        });
      }
    });

    setConnections(newConnections);
  };

  useEffect(() => {
    updateConnections();
    
    // Use requestAnimationFrame for smoother updates during scroll/resize
    let frameId: number;
    const loop = () => {
      updateConnections();
      frameId = requestAnimationFrame(loop);
    };
    
    frameId = requestAnimationFrame(loop);
    window.addEventListener('resize', updateConnections);
    
    const containers = document.querySelectorAll('.overflow-y-auto');
    containers.forEach(c => c.addEventListener('scroll', updateConnections));
    
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateConnections);
      containers.forEach(c => c.removeEventListener('scroll', updateConnections));
    };
  }, [stack, heap, containerRef]);

  return (
    <svg 
      ref={svgRef}
      className="absolute inset-0 pointer-events-none z-50 w-full h-full"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="#10b981" />
        </marker>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {connections.map(conn => {
        return (
          <g key={conn.id}>
            {/* Background Glow */}
            <motion.line
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              x1={conn.startX}
              y1={conn.startY}
              x2={conn.endX}
              y2={conn.endY}
              stroke={conn.color}
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Main Straight Line */}
            <motion.line
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              x1={conn.startX}
              y1={conn.startY}
              x2={conn.endX}
              y2={conn.endY}
              stroke={conn.color}
              strokeWidth="1.5"
              strokeLinecap="round"
              markerEnd="url(#arrowhead)"
              filter="url(#glow)"
              transition={{ 
                pathLength: { duration: 0.5, ease: "easeOut" },
                opacity: { duration: 0.3 }
              }}
            />
            {/* Pulsing Signal Effect */}
            <motion.line
              x1={conn.startX}
              y1={conn.startY}
              x2={conn.endX}
              y2={conn.endY}
              fill="none"
              stroke="white"
              strokeWidth="1"
              strokeDasharray="4, 16"
              strokeLinecap="round"
              initial={{ strokeDashoffset: 0, opacity: 0 }}
              animate={{ strokeDashoffset: -20, opacity: 0.3 }}
              transition={{ 
                repeat: Infinity, 
                duration: 1, 
                ease: "linear"
              }}
            />
            {/* Source Point */}
            <circle cx={conn.startX} cy={conn.startY} r="3" fill={conn.color} />
          </g>
        );
      })}
    </svg>
  );
};

export default PointerOverlay;
