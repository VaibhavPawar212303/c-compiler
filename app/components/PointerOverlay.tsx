'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { StackFrame, HeapObject } from '../types/memory';

interface PointerOverlayProps {
  stack: StackFrame[];
  heap: HeapObject[];
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

const PointerOverlay = ({ stack, heap, containerRef, theme = 'dark' }: PointerOverlayProps) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const updateConnections = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newConnections: Connection[] = [];

    // Find all pointers on stack
    stack.forEach(frame => {
      frame.variables.forEach(v => {
        if (v.type === 'pointer' && v.value && v.value.startsWith('0x')) {
          const srcEl = document.getElementById(`p-src-${v.id}`);
          const targetAddr = v.value.toUpperCase();
          const destEl = document.getElementById(`p-addr-${targetAddr}`);

          if (srcEl && destEl) {
            const srcRect = srcEl.getBoundingClientRect();
            const destRect = destEl.getBoundingClientRect();

            // Calculate center points relative to container
            // We use the container's coordinates to ensure arrows move with content
            newConnections.push({
              id: `${v.id}-${v.value}`,
              startX: srcRect.right - containerRect.left,
              startY: srcRect.top + srcRect.height / 2 - containerRect.top,
              endX: destRect.left - containerRect.left,
              endY: destRect.top + destRect.height / 2 - containerRect.top,
              color: '#10b981' // emerald-500
            });
          }
        }
      });
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
    
    // Also listen to scroll events on any container that might move elements
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
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
        </marker>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {connections.map(conn => {
        const dx = conn.endX - conn.startX;
        const dy = conn.endY - conn.startY;
        
        // Dynamic control points based on distance and direction
        let cx1, cy1, cx2, cy2;
        
        if (Math.abs(dx) < 20) {
          // Same column: curve out to the right
          const offset = 80;
          cx1 = conn.startX + offset;
          cy1 = conn.startY;
          cx2 = conn.endX + offset;
          cy2 = conn.endY;
        } else {
          // Different columns: smooth S-curve
          cx1 = conn.startX + dx * 0.4;
          cy1 = conn.startY;
          cx2 = conn.startX + dx * 0.6;
          cy2 = conn.endY;
        }

        return (
          <g key={conn.id}>
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              d={`M ${conn.startX} ${conn.startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${conn.endX} ${conn.endY}`}
              fill="none"
              stroke={conn.color}
              strokeWidth="1.5"
              strokeDasharray="4,2"
              markerEnd="url(#arrowhead)"
              filter="url(#glow)"
            />
            <circle cx={conn.startX} cy={conn.startY} r="2.5" fill={conn.color} opacity="0.8" />
          </g>
        );
      })}
    </svg>
  );
};

export default PointerOverlay;
