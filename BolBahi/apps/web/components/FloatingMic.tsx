'use client';

import React from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { stopTTS } from '@/lib/tts';

interface FloatingMicProps {
  isListening: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
}

export function FloatingMic({ isListening, onPressStart, onPressEnd }: FloatingMicProps) {
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    stopTTS();
    if ('vibrate' in navigator) navigator.vibrate(40);
    onPressStart();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    onPressEnd();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none touch-none">
      {isListening && (
        <div className="absolute inset-0 rounded-full bg-[#E8731A] animate-ping opacity-75" />
      )}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl border border-white/80 transition-transform active:scale-90 ${
          isListening ? 'bg-[#E8731A] scale-110 shadow-[#E8731A]/60' : 'bg-[#E8731A] hover:bg-[#d66512] shadow-[#E8731A]/40'
        }`}
        title="Hold to talk"
      >
        <Mic className="w-6 h-6" />
      </button>
    </div>
  );
}

