'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Loader2, CheckCircle2, HelpCircle } from 'lucide-react';
import { stopTTS } from '@/lib/tts';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'done' | 'needs-answer' | 'error';

interface MicButtonProps {
  state: VoiceState;
  onPressStart: () => void;
  onPressEnd: () => void;
  size?: 'hero' | 'compact';
}

export function MicButton({
  state,
  onPressStart,
  onPressEnd,
  size = 'hero',
}: MicButtonProps) {
  const pointerStartTime = useRef(0);
  const isHolding = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    stopTTS(); // Stop TTS immediately on mic press

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {}
    }

    // If currently listening in toggle mode, clicking stops it immediately
    if (state === 'listening' && !isHolding.current) {
      onPressEnd();
      return;
    }

    pointerStartTime.current = Date.now();
    isHolding.current = true;
    onPressStart();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    const duration = Date.now() - pointerStartTime.current;

    if (duration > 320) {
      // User held the button: release to stop
      isHolding.current = false;
      onPressEnd();
    } else {
      // User tapped quickly: keep listening in toggle mode!
      isHolding.current = false;
      // Speech recognition will auto-submit on silence or on the next tap
    }
  };

  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isHero = size === 'hero';

  const buttonDimension = isHero ? 'w-44 h-44 sm:w-52 sm:h-52' : 'w-16 h-16';
  const iconSize = isHero ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-7 h-7';

  return (
    <div className="relative inline-flex items-center justify-center select-none touch-none">
      {/* Outer pulsing acoustic aura while listening */}
      {isListening && (
        <>
          <motion.div
            animate={{
              scale: [1, 1.45, 1],
              opacity: [0.5, 0.1, 0.5],
            }}
            transition={{
              duration: 1.3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`absolute rounded-full bg-[#E8731A] ${
              isHero ? 'w-56 h-56 sm:w-64 sm:h-64' : 'w-22 h-22'
            }`}
          />
          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.7, 0.2, 0.7],
            }}
            transition={{
              duration: 1.0,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.2,
            }}
            className={`absolute rounded-full bg-[#E8731A]/60 ${
              isHero ? 'w-50 h-50 sm:w-58 sm:h-58' : 'w-19 h-19'
            }`}
          />
        </>
      )}

      {/* Hero Glass Orb Container */}
      <motion.button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        whileTap={{ scale: 0.94 }}
        animate={
          isListening
            ? { scale: [1, 1.05, 1] }
            : { scale: 1 }
        }
        transition={
          isListening
            ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.2 }
        }
        className={`relative ${buttonDimension} rounded-full flex flex-col items-center justify-center text-white cursor-pointer shadow-2xl transition-all border-2 border-white/80 ${
          state === 'needs-answer'
            ? 'bg-[#B7791F] shadow-[#B7791F]/50'
            : isListening
            ? 'bg-gradient-to-tr from-[#E8731A] to-[#f97316] shadow-[0_0_50px_rgba(232,115,26,0.6)]'
            : isThinking
            ? 'bg-[#8A7F72] shadow-[#8A7F72]/40'
            : 'bg-gradient-to-tr from-[#E8731A] to-[#f97316] shadow-[#E8731A]/40 hover:scale-102 hover:shadow-[#E8731A]/60'
        }`}
        aria-label="Hold or tap to talk"
      >
        {isThinking ? (
          <Loader2 className={`${iconSize} animate-spin text-white drop-shadow`} />
        ) : state === 'done' ? (
          <CheckCircle2 className={`${iconSize} text-white drop-shadow`} />
        ) : state === 'needs-answer' ? (
          <HelpCircle className={`${iconSize} text-white drop-shadow animate-bounce`} />
        ) : (
          <Mic
            className={`${iconSize} text-white drop-shadow transition-transform ${
              isListening ? 'scale-110' : ''
            }`}
          />
        )}
      </motion.button>
    </div>
  );
}
