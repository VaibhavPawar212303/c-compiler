'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Map as MapIcon, 
  ChevronRight, 
  Star, 
  Lock, 
  Unlock,
  Layers,
  Container,
  GitGraph,
  Share2,
  Brain,
  Zap,
  Target,
  Trophy,
  Info,
  Network,
  Plus,
  BookOpen,
  Wrench,
  Search,
  Activity
} from 'lucide-react';
import InteractiveStack from './InteractiveStack';

export default function DSAWorld({ theme }: { theme: 'dark' | 'light' }) {
  return (
    <div className="h-full w-full overflow-hidden">
      <InteractiveStack theme={theme} />
    </div>
  );
}

