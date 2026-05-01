'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PointerLink } from '../types/memory';

interface PointerOverlayProps {
  links: PointerLink[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const PointerOverlay = ({ links, containerRef }: PointerOverlayProps) => {
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

export default PointerOverlay;
