'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  Mic,
  ArrowDownLeft,
  Users,
  History,
  BarChart3,
  Package,
  Bell,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  Volume2,
  RotateCcw,
  Keyboard,
  Send,
  Database,
  Wallet,
  Coins,
  AlertCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { MicButton, VoiceState } from './MicButton';
import { ActionCard, ActionCardData } from './ActionCard';
import { speechHandler } from '@/lib/speech';
import { speak, stopTTS } from '@/lib/tts';
import { useAuth } from '@/lib/auth-context';
import { FloatingMic } from './FloatingMic';
import { TRANSLATIONS, AppLanguage } from '@/lib/i18n';

import { RecordsPanel } from './panels/RecordsPanel';
import { CustomersPanel } from './panels/CustomersPanel';
import { CommandsPanel } from './panels/CommandsPanel';
import { StockPanel } from './panels/StockPanel';
import { RemindersPanel } from './panels/RemindersPanel';
import { HisaabPanel } from './panels/HisaabPanel';
import { SettingsPanel } from './panels/SettingsPanel';

interface TileDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  orbBg: string;
  orbGlow: string;
  badge: string;
  hint: string;
}

// 3D Glassmorphic Icon Orb Component (No bulky rectangular cards)
function OrbitGlassOrb({
  tile,
  index,
  pVal,
  N,
  rx,
  voiceState,
  transcript,
  handleMicStart,
  handleMicEnd,
  onOpen,
  onSelect,
  t,
  currentLang,
}: {
  tile: TileDef;
  index: number;
  pVal: any;
  N: number;
  rx: number;
  voiceState: VoiceState;
  transcript: string;
  handleMicStart: () => void;
  handleMicEnd: () => void;
  onOpen: () => void;
  onSelect: () => void;
  t: (typeof TRANSLATIONS)[AppLanguage];
  currentLang: AppLanguage;
}) {
  const isEn = currentLang === 'en-IN';

  // Signed shortest distance d on the N-tile loop
  const d = useTransform(pVal, (v: number) => {
    let diff = (index - v) % N;
    if (diff < 0) diff += N;
    if (diff > N / 2) diff -= N;
    return diff;
  });

  const theta = useTransform(d, (val: number) => (val * 2 * Math.PI) / N);
  const x = useTransform(theta, (th: number) => Math.sin(th) * rx);
  const y = useTransform(theta, (th: number) => (1 - Math.cos(th)) * 32);
  const z = useTransform(theta, (th: number) => (Math.cos(th) - 1) * 260);
  const scale = useTransform(theta, (th: number) => 0.68 + 0.32 * Math.max(Math.cos(th), 0));
  const rotateY = useTransform(d, (val: number) => -val * 28);
  const opacity = useTransform(d, (val: number) => {
    const abs = Math.abs(val);
    if (abs <= 0.6) return 1;
    if (abs <= 1.4) return 0.85;
    if (abs <= 2.2) return 0.28;
    return 0;
  });
  const zIndex = useTransform(theta, (th: number) => Math.round((Math.cos(th) + 1) * 40) + 10);
  const pointerEvents = useTransform(d, (val: number) => (Math.abs(val) <= 1.4 ? 'auto' : 'none'));

  const [isFront, setIsFront] = useState(index === 0);

  useEffect(() => {
    const unsub = d.on('change', (val) => {
      setIsFront(Math.abs(val) < 0.5);
    });
    return unsub;
  }, [d]);

  return (
    <motion.div
      style={{
        x,
        y,
        z,
        scale,
        rotateY,
        opacity,
        zIndex,
        pointerEvents: pointerEvents as any,
        position: 'absolute',
        transformStyle: 'preserve-3d',
      }}
      onClick={(e) => {
        if (!isFront) {
          e.stopPropagation();
          onSelect();
        } else if (tile.id !== 'mic') {
          onOpen();
        }
      }}
      className="flex flex-col items-center justify-center select-none cursor-pointer"
    >
      {/* 1. FRONT-CENTER ACTIVE ORB */}
      {isFront ? (
        <div className="flex flex-col items-center relative">
          {tile.id === 'mic' ? (
            <div className="relative flex flex-col items-center">
              <MicButton
                state={voiceState}
                onPressStart={handleMicStart}
                onPressEnd={handleMicEnd}
                size="hero"
              />

              {/* Real-time live transcript bubble when listening */}
              {voiceState === 'listening' && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute -bottom-8 z-40 px-4 py-1.5 rounded-full bg-[#C23B22] text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-red-500/30 max-w-[320px] truncate"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white shrink-0 animate-ping" />
                  <span className="truncate">
                    {transcript
                      ? `"${transcript}"`
                      : isEn
                      ? 'Listening... Speak now'
                      : 'सुन रहा हूँ... बोलिए'}
                  </span>
                </motion.div>
              )}
            </div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-40 h-40 sm:w-48 sm:h-48 rounded-full relative flex items-center justify-center backdrop-blur-2xl border-2 border-white/90 shadow-2xl transition-all"
              style={{
                background: tile.orbBg,
                boxShadow: `0 24px 60px -10px ${tile.orbGlow}, 0 0 0 2px rgba(255,255,255,0.8) inset, 0 8px 25px rgba(255,255,255,0.4)`,
              }}
            >
              {/* Specular curved highlight sheen */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/70 via-transparent to-black/10 pointer-events-none" />
              {/* Floating Center Icon */}
              <div
                className="relative z-10 transition-transform"
                style={{ transform: 'translateZ(24px)' }}
              >
                {tile.icon}
              </div>
            </motion.div>
          )}

          {/* Floating Glass Information Pill Below Central Orb */}
          <div
            className="mt-5 px-6 py-3.5 rounded-3xl bg-white/85 backdrop-blur-xl border border-white shadow-xl flex flex-col items-center gap-1 text-center max-w-[280px]"
            style={{
              boxShadow: '0 16px 36px -10px rgba(31,27,22,0.14), 0 0 0 1px rgba(255,255,255,0.9) inset',
              transform: 'translateZ(20px)',
            }}
          >
            <h3 className="text-xl sm:text-2xl font-black text-[#1F1B16] tracking-tight">
              {tile.label}
            </h3>

            {tile.id !== 'mic' && (
              <div
                className="text-2xl sm:text-3xl font-black stat-number tracking-tight mt-0.5"
                style={{ color: tile.color }}
              >
                {tile.badge}
              </div>
            )}

            <div className="text-xs font-bold text-[#8A7F72] mt-0.5">
              {tile.id === 'mic' ? (
                <span className="text-[#E8731A]">
                  {voiceState === 'listening'
                    ? isEn
                      ? 'Listening to voice...'
                      : 'आवाज सुनी जा रही है...'
                    : voiceState === 'thinking'
                    ? isEn
                      ? 'Processing command...'
                      : 'प्रोसेस किया जा रहा है...'
                    : tile.hint}
                </span>
              ) : (
                <span className="text-[#E8731A] hover:underline cursor-pointer">
                  {t.openPanel} →
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 2. NEIGHBOR ORBS (Glassmorphic Spheres in 3D Perspective) */
        <motion.div
          whileHover={{ scale: 1.08 }}
          className="flex flex-col items-center gap-2 group cursor-pointer"
        >
          <div
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full relative flex items-center justify-center backdrop-blur-xl border border-white/80 shadow-lg transition-all group-hover:border-white"
            style={{
              background: tile.orbBg,
              boxShadow: `0 14px 35px -8px ${tile.orbGlow}, 0 0 0 1px rgba(255,255,255,0.7) inset`,
            }}
          >
            {/* Specular sheen */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/60 via-transparent to-black/5 pointer-events-none" />
            <div className="relative z-10 opacity-90 group-hover:opacity-100">
              {tile.icon}
            </div>
          </div>

          {/* Mini Glass Label Pill */}
          <div className="px-3 py-1 rounded-full bg-white/75 backdrop-blur-md border border-white/80 shadow-xs text-xs font-bold text-[#1F1B16] truncate max-w-[140px] text-center">
            {tile.label}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export function OrbitalCarousel() {
  const { shop, language } = useAuth();
  const currentLang: AppLanguage = (language as AppLanguage) || 'hi-IN';
  const isEn = currentLang === 'en-IN';
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS['hi-IN'];

  const pVal = useMotionValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [rx, setRx] = useState(300);

  // Typed input fallback toggle
  const [showTypedInput, setShowTypedInput] = useState(false);
  const [typedCommand, setTypedCommand] = useState('');

  // Live stats for badges
  const [stats, setStats] = useState({
    totalOutstanding: 0,
    todayIn: 0,
    todayOut: 0,
    customerCount: 0,
    lowStockCount: 0,
    pendingRemindersCount: 0,
  });

  const [lastCommand, setLastCommand] = useState<{
    transcript: string;
    summary: string;
    groupId: string;
  } | null>(null);

  // Voice capture states
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [actionCards, setActionCards] = useState<ActionCardData[]>([]);
  const [replyText, setReplyText] = useState<string | null>(null);
  const [showResultSheet, setShowResultSheet] = useState(false);
  const [clarificationData, setClarificationData] = useState<{
    question: string;
    options?: string[];
  } | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [undoToastGroupId, setUndoToastGroupId] = useState<string | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);

  const sessionId = useRef(`sess_${Date.now()}`);
  const lastArrowTime = useRef(0);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Rx calculation based on viewport width
  useEffect(() => {
    const handleResize = () => {
      setRx(Math.min(window.innerWidth * 0.40, 310));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Rotate example phrase every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setExampleIndex((prev) => (prev + 1) % t.examples.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [t.examples.length]);

  const fetchStats = async () => {
    const res = await apiFetch<any>('/api/stats');
    if (res.ok) {
      const payload: any = (res as any).data ?? res;
      setStats({
        totalOutstanding: payload.totalOutstanding || 0,
        todayIn: payload.todayIn || 0,
        todayOut: payload.todayOut || 0,
        customerCount: payload.customerCount || 0,
        lowStockCount: payload.lowStockCount || 0,
        pendingRemindersCount: payload.pendingRemindersCount || 0,
      });
    }
    const cmdRes = await apiFetch<any[]>('/api/commands');
    if (cmdRes.ok) {
      const cmdList = Array.isArray((cmdRes as any).data)
        ? (cmdRes as any).data
        : Array.isArray(cmdRes)
        ? (cmdRes as any)
        : [];
      if (cmdList.length > 0) {
        const latest = cmdList[0];
        const isClarify = latest.parsedActions?.some((a: any) => a.type === 'clarify');
        setLastCommand({
          transcript: latest.transcript,
          summary: isClarify
            ? (isEn ? 'Clarification needed' : 'स्पष्टीकरण चाहिए')
            : latest.results?.[0]?.summary || (isEn ? 'Done' : 'हो गया'),
          groupId: latest.groupId,
        });
      }
    }
  };

  // SSE Live Refresh
  useEffect(() => {
    fetchStats();
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events');
      es.addEventListener('ledger.updated', () => fetchStats());
      es.addEventListener('stock.updated', () => fetchStats());
      es.addEventListener('reminder.dispatched', () => fetchStats());
    } catch (err) {
      console.warn('SSE connection error:', err);
    }
    return () => {
      if (es) es.close();
    };
  }, []);

  // 7 Tiles translated completely based on selected language
  const netToday = stats.todayIn - stats.todayOut;
  const netSign = netToday >= 0 ? '+' : '';

  const tiles: TileDef[] = [
    {
      id: 'mic',
      label: t.tiles.mic.label,
      icon: <Mic className="w-16 h-16 sm:w-20 sm:h-20 text-white drop-shadow" />,
      color: '#E8731A',
      orbBg: 'linear-gradient(135deg, rgba(232,115,26,0.95), rgba(247,152,70,0.85))',
      orbGlow: 'rgba(232,115,26,0.45)',
      badge: t.tiles.mic.badge,
      hint: isEn ? 'Hold to speak or tap' : 'दबाकर बोलें या टैप करें',
    },
    {
      id: 'records',
      label: t.tiles.records.label,
      icon: <ArrowDownLeft className="w-14 h-14 sm:w-16 sm:h-16 text-[#1F7A4D]" />,
      color: '#1F7A4D',
      orbBg: 'linear-gradient(135deg, rgba(226,243,233,0.85), rgba(198,235,212,0.65))',
      orbGlow: 'rgba(31,122,77,0.35)',
      badge: `${netSign}₹${netToday.toLocaleString('en-IN')}`,
      hint: t.tiles.records.hint,
    },
    {
      id: 'customers',
      label: t.tiles.customers.label,
      icon: <Users className="w-14 h-14 sm:w-16 sm:h-16 text-[#C23B22]" />,
      color: '#C23B22',
      orbBg: 'linear-gradient(135deg, rgba(251,230,225,0.85), rgba(247,208,200,0.65))',
      orbGlow: 'rgba(194,59,34,0.35)',
      badge: `₹${stats.totalOutstanding.toLocaleString('en-IN')}`,
      hint: t.tiles.customers.hint,
    },
    {
      id: 'commands',
      label: t.tiles.commands.label,
      icon: <History className="w-14 h-14 sm:w-16 sm:h-16 text-[#4F46E5]" />,
      color: '#4F46E5',
      orbBg: 'linear-gradient(135deg, rgba(238,242,255,0.85), rgba(224,231,255,0.65))',
      orbGlow: 'rgba(79,70,229,0.35)',
      badge: t.tiles.commands.badge,
      hint: t.tiles.commands.hint,
    },
    {
      id: 'hisaab',
      label: t.tiles.hisaab.label,
      icon: <BarChart3 className="w-14 h-14 sm:w-16 sm:h-16 text-[#D97706]" />,
      color: '#D97706',
      orbBg: 'linear-gradient(135deg, rgba(254,243,199,0.85), rgba(253,230,138,0.65))',
      orbGlow: 'rgba(217,119,6,0.35)',
      badge: `₹${stats.todayOut.toLocaleString('en-IN')}`,
      hint: t.tiles.hisaab.hint,
    },
    {
      id: 'stock',
      label: t.tiles.stock.label,
      icon: <Package className="w-14 h-14 sm:w-16 sm:h-16 text-[#B7791F]" />,
      color: '#B7791F',
      orbBg: 'linear-gradient(135deg, rgba(251,240,217,0.85), rgba(245,225,183,0.65))',
      orbGlow: 'rgba(183,121,31,0.35)',
      badge: `${stats.lowStockCount} ${t.tiles.stock.badgeSuffix}`,
      hint: t.tiles.stock.hint,
    },
    {
      id: 'reminders',
      label: t.tiles.reminders.label,
      icon: <Bell className="w-14 h-14 sm:w-16 sm:h-16 text-[#2B6CB0]" />,
      color: '#2B6CB0',
      orbBg: 'linear-gradient(135deg, rgba(227,238,249,0.85), rgba(206,226,246,0.65))',
      orbGlow: 'rgba(43,108,176,0.35)',
      badge: `${stats.pendingRemindersCount} ${t.tiles.reminders.badgeSuffix}`,
      hint: t.tiles.reminders.hint,
    },
  ];

  const N = tiles.length;

  const navigateTo = useCallback(
    (targetIdx: number) => {
      const currentP = pVal.get();
      let diff = (targetIdx - (currentP % N)) % N;
      if (diff < -N / 2) diff += N;
      if (diff > N / 2) diff -= N;
      const targetP = currentP + diff;

      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(8);
        } catch {}
      }

      const normalized = Math.round((((targetP % N) + N) % N));
      setActiveIndex(normalized);

      animate(pVal, targetP, {
        type: 'spring',
        stiffness: 220,
        damping: 26,
        onComplete: () => {
          setActiveIndex(Math.round((((targetP % N) + N) % N)));
        },
      });
    },
    [N, pVal]
  );

  const handleArrow = (direction: 'prev' | 'next') => {
    const now = Date.now();
    if (now - lastArrowTime.current < 450) return;
    lastArrowTime.current = now;

    const currentP = Math.round(pVal.get());
    const targetP = direction === 'next' ? currentP + 1 : currentP - 1;

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {}
    }

    const normalized = Math.round((((targetP % N) + N) % N));
    setActiveIndex(normalized);

    animate(pVal, targetP, {
      type: 'spring',
      stiffness: 220,
      damping: 26,
      onComplete: () => {
        setActiveIndex(Math.round((((targetP % N) + N) % N)));
      },
    });
  };

  // Touch Swipe Gesture Handling
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartP = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartP.current = pVal.get();
    isSwiping.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaX) < 15) return;
    const deltaP = -deltaX / 280;
    pVal.set(touchStartP.current + deltaP);
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current) return;
    isSwiping.current = false;
    const currentP = pVal.get();
    const targetP = Math.round(currentP);

    const normalized = Math.round((((targetP % N) + N) % N));
    setActiveIndex(normalized);

    animate(pVal, targetP, {
      type: 'spring',
      stiffness: 220,
      damping: 26,
      onComplete: () => {
        setActiveIndex(Math.round((((targetP % N) + N) % N)));
      },
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (openPanel) return;
      if (e.key === 'ArrowRight') handleArrow('next');
      else if (e.key === 'ArrowLeft') handleArrow('prev');
      else if (e.key === 'Home') navigateTo(0);
      else if (e.key === 'Enter' || e.key === ' ') {
        if (activeIndex !== 0) setOpenPanel(tiles[activeIndex].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, openPanel, navigateTo, tiles]);

  // Voice Interaction
  const handleMicStart = () => {
    stopTTS();
    setTranscript('');
    setVoiceState('listening');
    setShowResultSheet(false);

    speechHandler.start(currentLang, {
      onInterim: (text) => setTranscript(text),
      onFinal: (text) => {
        setTranscript(text);
        submitCommand(text);
      },
      onError: (err) => {
        console.warn('Speech error:', err);
        setVoiceState('idle');
      },
      onEnd: () => {
        if (voiceState === 'listening') {
          setVoiceState('idle');
        }
      },
    });
  };

  const handleMicEnd = () => {
    speechHandler.stop();
  };

  const submitCommand = async (text: string) => {
    const clean = text.trim();
    if (clean.length < 2) {
      setVoiceState('idle');
      return;
    }

    setVoiceState('thinking');
    setShowResultSheet(true);

    const clientCommandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const res = await apiFetch<any>('/api/voice/command', {
      method: 'POST',
      body: JSON.stringify({
        transcript: clean,
        lang: currentLang,
        sessionId: sessionId.current,
        clientCommandId,
      }),
    });

    if (res.ok) {
      const payload: any = (res as any).data ?? res;
      const results = payload.results || (res as any).results || [];
      const actions = payload.actions || (res as any).actions || [];
      const reply =
        payload.reply || (res as any).reply || (isEn ? 'Done.' : 'हो गया।');
      const replySpeech = payload.replySpeech || (res as any).replySpeech || reply;
      const needsClarification = Boolean(payload.needsClarification ?? (res as any).needsClarification);
      const groupId = payload.groupId || (res as any).groupId;
      const lang = payload.lang || (res as any).lang || currentLang;

      setActionCards(
        results.map((r: any) => ({
          type: r.type,
          summary: r.summary,
          ok: r.ok,
          error: r.error,
          data: r.data,
        }))
      );
      setReplyText(reply);

      setLastCommand({
        transcript: clean,
        summary: needsClarification
          ? (isEn ? 'Clarification needed' : 'स्पष्टीकरण चाहिए')
          : results?.[0]?.summary || reply,
        groupId,
      });

      if (needsClarification) {
        const question =
          payload.clarificationQuestion ||
          results.find((r: any) => r.needsClarification)?.clarificationQuestion ||
          reply;
        const options =
          payload.clarificationOptions ||
          results.find((r: any) => r.needsClarification)?.clarificationOptions ||
          [];
        setClarificationData({ question, options });
        setVoiceState('needs-answer');

        // Speak the clarification question, and as soon as it finishes, immediately start listening for answer!
        speak(replySpeech, lang, undefined, () => {
          handleMicStart();
        });
      } else {
        setClarificationData(null);
        setVoiceState('done');
        speak(replySpeech, lang);

        // Voice Navigation: If command requested to show/display a view, immediately open it and rotate carousel!
        const targetView =
          payload.openView ||
          actions.find((a: any) => a.type === 'show_view')?.view ||
          results.find((r: any) => r.type === 'show_view' || r.data?.openView)?.data?.openView;

        if (targetView) {
          const tileIdx = tiles.findIndex((t) => t.id === targetView);
          if (tileIdx !== -1) {
            navigateTo(tileIdx);
          }
          setOpenPanel(targetView);
          setShowResultSheet(false);
        }
      }

      // Trigger Undo Toast for 5 seconds on write commands
      if (groupId && !needsClarification && actions.some((a: any) => a.type?.startsWith('add_'))) {
        setUndoToastGroupId(groupId);
        setShowUndoToast(true);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => setShowUndoToast(false), 5000);
      }

      fetchStats();
    } else {
      setVoiceState('error');
      const errorMsg =
        res.error?.spokenMessage ||
        res.error?.message ||
        (isEn ? 'An error occurred. Please try again.' : 'समस्या आई, कृपया दोबारा बोलें।');
      setReplyText(errorMsg);
      speak(errorMsg, currentLang);
    }
  };

  const handleUndoToast = async () => {
    if (!undoToastGroupId) return;
    setShowUndoToast(false);
    const res = await apiFetch(`/api/commands/${undoToastGroupId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchStats();
      speak(t.undoneNotice, currentLang);
    }
  };

  // Seed demo data manually if button clicked
  const handleSeedDemoData = async () => {
    const res = await apiFetch('/api/demo/seed', { method: 'POST' });
    if (res.ok) {
      await fetchStats();
      speak(isEn ? 'Demo data loaded successfully.' : 'डेमो डेटा लोड हो गया।', currentLang);
    }
  };

  const currentTile = tiles[activeIndex];

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      className="flex-1 flex flex-col items-center justify-start p-3 sm:p-5 relative select-none w-full max-w-5xl mx-auto"
    >
      {/* 1. AUTHENTIC KIRANA HEADER & TYPOGRAPHY */}
      <div className="w-full text-center mb-5 relative z-20 flex flex-col items-center">
        {/* Subtle Shimmer Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-white/90 shadow-xs backdrop-blur-md mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-[#E8731A]" />
          <span className="text-[11px] sm:text-xs font-bold text-[#8A7F72] uppercase tracking-wider">
            {t.heroBadge}
          </span>
        </div>

        {/* Majestic Typography Headline */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1F1B16] tracking-tight leading-snug">
          {t.heroTitle.split(' ')[0]}{' '}
          <span className="text-[#E8731A] drop-shadow-xs">
            {t.heroTitle.split(' ').slice(1).join(' ')}
          </span>
        </h1>
        <p className="text-xs sm:text-sm font-medium text-[#8A7F72] max-w-lg mt-1 px-4 leading-relaxed">
          {t.heroSubtitle}
        </p>

        {/* 2. DAILY KIRANA FINANCIAL PULSE METRICS BANNER (3 Pillars) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3.5 w-full max-w-2xl mt-4 px-1">
          {/* Card 1: Total Due / कुल उधारी */}
          <div
            onClick={() => setOpenPanel('customers')}
            className="p-3 sm:p-3.5 rounded-2xl bg-white/75 hover:bg-white border border-white/90 shadow-sm hover:shadow-md transition-all cursor-pointer text-left group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-[#8A7F72] uppercase tracking-wider">
                {t.statOutstandingLabel}
              </span>
              <div className="w-6 h-6 rounded-lg bg-[#C23B22]/10 text-[#C23B22] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Coins className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-black text-[#C23B22] mt-1 tracking-tight">
              ₹{stats.totalOutstanding.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-[#8A7F72] mt-0.5 truncate">
              {stats.customerCount} {isEn ? 'customers' : 'ग्राहक खाते'}
            </div>
          </div>

          {/* Card 2: Cash In / आज की वसूली */}
          <div
            onClick={() => setOpenPanel('hisaab')}
            className="p-3 sm:p-3.5 rounded-2xl bg-white/75 hover:bg-white border border-white/90 shadow-sm hover:shadow-md transition-all cursor-pointer text-left group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-[#8A7F72] uppercase tracking-wider">
                {t.statTodayInLabel}
              </span>
              <div className="w-6 h-6 rounded-lg bg-[#1F7A4D]/10 text-[#1F7A4D] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-black text-[#1F7A4D] mt-1 tracking-tight">
              ₹{stats.todayIn.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-[#8A7F72] mt-0.5 truncate">
              {isEn ? 'Net' : 'शुद्ध'} {netSign}₹{netToday.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Card 3: Alerts / स्टॉक और तगादा */}
          <div
            onClick={() => setOpenPanel(stats.lowStockCount > 0 ? 'stock' : 'reminders')}
            className="p-3 sm:p-3.5 rounded-2xl bg-white/75 hover:bg-white border border-white/90 shadow-sm hover:shadow-md transition-all cursor-pointer text-left group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-[#8A7F72] uppercase tracking-wider">
                {t.statAlertsLabel}
              </span>
              <div className="w-6 h-6 rounded-lg bg-[#B7791F]/10 text-[#B7791F] flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-black text-[#B7791F] mt-1 tracking-tight">
              {stats.lowStockCount + stats.pendingRemindersCount} {isEn ? 'Alerts' : 'सूचनाएं'}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-[#8A7F72] mt-0.5 truncate">
              {stats.lowStockCount} {isEn ? 'stock' : 'स्टॉक'} • {stats.pendingRemindersCount} {isEn ? 'reminders' : 'तगादे'}
            </div>
          </div>
        </div>
      </div>

      {/* Zero data seeding alert banner if no customers present */}
      {stats.customerCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 px-4 py-2 rounded-2xl bg-[#E8731A]/10 border border-[#E8731A]/30 flex items-center gap-3 z-30"
        >
          <Database className="w-4 h-4 text-[#E8731A] shrink-0" />
          <span className="text-xs font-semibold text-[#1F1B16]">
            {isEn
              ? 'Store has no ledger records yet.'
              : 'दुकान में अभी कोई ग्राहक खाता दर्ज नहीं है।'}
          </span>
          <button
            type="button"
            onClick={handleSeedDemoData}
            className="px-3 py-1 rounded-full bg-[#E8731A] text-white text-xs font-bold shadow-xs hover:bg-[#d66512] transition-all cursor-pointer"
          >
            {isEn ? 'Seed Demo Data' : 'डेमो डेटा लोड करें'}
          </button>
        </motion.div>
      )}

      {/* Active Clarification Floating Card */}
      {clarificationData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xl mb-4 p-4 rounded-2xl bg-[#FFF9E6] border-2 border-[#B7791F] shadow-lg flex flex-col gap-2.5 z-30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B7791F] animate-ping" />
              <span className="text-xs font-black text-[#B7791F] uppercase tracking-wider">
                {isEn ? 'Clarification Needed' : 'स्पष्टीकरण चाहिए'}
              </span>
            </div>
            <span className="text-[11px] font-bold text-[#8A7F72]">
              {voiceState === 'listening'
                ? (isEn ? '🔴 Listening...' : '🔴 सुन रहा हूँ...')
                : (isEn ? 'Tap or speak' : 'बोलें या चुनें')}
            </span>
          </div>

          <p className="font-extrabold text-base sm:text-lg text-[#1F1B16] leading-snug">
            {clarificationData.question}
          </p>

          {/* Option Pills */}
          {clarificationData.options && clarificationData.options.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {clarificationData.options.map((opt, oIdx) => (
                <button
                  key={oIdx}
                  type="button"
                  onClick={() => {
                    setTranscript(opt);
                    submitCommand(opt);
                  }}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-[#E8731A] text-[#1F1B16] hover:text-white font-bold text-sm border border-[#E9E2D6] shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4 text-[#E8731A]" />
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          )}

          {/* Answer Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-[#B7791F]/20 mt-1">
            <span className="text-xs font-semibold text-[#8A7F72]">
              {isEn ? 'Say the name or tap an option' : 'नाम बोलें या ऊपर विकल्प चुनें'}
            </span>
            <button
              type="button"
              onClick={() => {
                if (voiceState === 'listening') {
                  handleMicEnd();
                } else {
                  handleMicStart();
                }
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                voiceState === 'listening'
                  ? 'bg-[#C23B22] text-white animate-pulse'
                  : 'bg-[#E8731A] text-white hover:bg-[#d66512]'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{voiceState === 'listening' ? (isEn ? 'Listening...' : 'सुन रहा हूँ...') : (isEn ? 'Speak Answer' : 'जवाब बोलें')}</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* 3. AUTHENTIC QUICK-ACTION KIRANA VOICE CHIPS */}
      {activeIndex === 0 && (
        <div className="w-full max-w-2xl mb-3 relative z-30 px-2 flex flex-col items-center">
          <div className="flex items-center gap-2 overflow-x-auto w-full no-scrollbar pb-1 justify-center flex-wrap">
            {t.quickChips?.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTranscript(chip.text);
                  submitCommand(chip.text);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/80 hover:bg-white text-[#1F1B16] border border-white shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer hover:border-[#E8731A]/40 shrink-0"
              >
                <span
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-black text-white shrink-0"
                  style={{ backgroundColor: chip.color }}
                >
                  {chip.tag}
                </span>
                <span>&ldquo;{chip.text}&rdquo;</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggestion & Typed input toggle */}
      {activeIndex === 0 && (
        <div className="mb-3 relative z-30 flex items-center gap-2">
          {/* Typed command fallback toggle */}
          <button
            type="button"
            onClick={() => setShowTypedInput((prev) => !prev)}
            title={isEn ? 'Type command instead' : 'टाइप करके लिखें'}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white border border-white shadow-xs text-xs font-bold text-[#8A7F72] hover:text-[#E8731A] cursor-pointer transition-all"
          >
            <Keyboard className="w-3.5 h-3.5 text-[#E8731A]" />
            <span>{isEn ? 'Type Command' : 'कीबोर्ड से लिखें'}</span>
          </button>
        </div>
      )}

      {/* Typed input fallback bar */}
      <AnimatePresence>
        {showTypedInput && activeIndex === 0 && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (typedCommand.trim()) {
                const cmd = typedCommand.trim();
                setTypedCommand('');
                setShowTypedInput(false);
                setTranscript(cmd);
                submitCommand(cmd);
              }
            }}
            className="mb-4 w-full max-w-md flex items-center gap-2 relative z-30 px-2"
          >
            <input
              type="text"
              value={typedCommand}
              onChange={(e) => setTypedCommand(e.target.value)}
              placeholder={isEn ? 'e.g. Ramesh took 500 credit' : 'उदा. रमेश ने 500 रुपये उधार लिए'}
              className="flex-1 h-10 px-4 rounded-full bg-white/95 border border-[#E9E2D6] focus:border-[#E8731A] text-xs font-semibold text-[#1F1B16] outline-none shadow-sm"
            />
            <button
              type="submit"
              className="w-10 h-10 rounded-full bg-[#E8731A] text-white flex items-center justify-center shadow-md hover:bg-[#d66512] transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* 3D Main Orbit Stage (Glassmorphism Icon Orbs) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full max-w-4xl h-[440px] sm:h-[490px] flex items-center justify-center touch-pan-y"
        style={{
          perspective: 1100,
          perspectiveOrigin: '50% 50%',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Authentic 3D Ground Orbit Ellipse Track */}
        <div
          className="absolute pointer-events-none -z-10 flex items-center justify-center"
          style={{
            width: rx * 2 + 180,
            height: rx * 1.35,
            transform: 'rotateX(72deg) translateZ(-65px)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Glowing Dashed Planetary Track */}
          <div className="w-full h-full rounded-[50%] border-2 border-dashed border-[#E8731A]/35 shadow-[0_0_35px_rgba(232,115,26,0.18)]" />
          {/* Soft Radial Ambient Aura */}
          <div className="absolute inset-2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(232,115,26,0.12)_0%,rgba(255,255,255,0.06)_50%,transparent_75%)]" />
        </div>

        {/* Left Arrow Button (hidden when panel is open) */}
        {!openPanel && (
          <button
            type="button"
            onClick={() => handleArrow('prev')}
            aria-label={t.prev}
            className="absolute left-1 sm:left-4 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full glass flex items-center justify-center shadow-xl text-[#1F1B16] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white"
          >
            <ChevronLeft className="w-7 h-7 text-[#1F1B16]" />
          </button>
        )}

        {/* Render 7 Glassmorphic Icon Orbs in 3D Space (No Cards) */}
        {tiles.map((tile, i) => (
          <OrbitGlassOrb
            key={tile.id}
            tile={tile}
            index={i}
            pVal={pVal}
            N={N}
            rx={rx}
            voiceState={voiceState}
            transcript={transcript}
            handleMicStart={handleMicStart}
            handleMicEnd={handleMicEnd}
            onOpen={() => setOpenPanel(tile.id)}
            onSelect={() => navigateTo(i)}
            t={t}
            currentLang={currentLang}
          />
        ))}

        {/* Right Arrow Button (hidden when panel is open) */}
        {!openPanel && (
          <button
            type="button"
            onClick={() => handleArrow('next')}
            aria-label={t.next}
            className="absolute right-1 sm:right-4 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full glass flex items-center justify-center shadow-xl text-[#1F1B16] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white"
          >
            <ChevronRight className="w-7 h-7 text-[#1F1B16]" />
          </button>
        )}
      </div>

      {/* Under Orbit: Position indicator & Latest Activity Strip */}
      <div className="flex flex-col items-center gap-2 mt-1 w-full max-w-lg mx-auto px-2 relative z-30">
        {/* Position: e.g. "1 / 7 Voice Entry" */}
        <div className="text-xs font-bold text-[#8A7F72]">
          {activeIndex + 1} / {N} • {currentTile.label}
        </div>

        {/* Latest Activity Strip - safely truncated inside the pill */}
        {lastCommand && (
          <div
            onClick={() => setOpenPanel('commands')}
            className="w-full max-w-xl mx-auto px-5 py-2.5 rounded-full bg-white/85 backdrop-blur-md text-xs text-[#1F1B16] font-medium flex items-center gap-2.5 shadow-xs hover:shadow-md cursor-pointer border border-white overflow-hidden transition-all"
          >
            <span className="text-[#E8731A] font-black shrink-0">{t.latest}</span>
            {lastCommand.transcript && (
              <span className="truncate text-[#8A7F72] max-w-[130px] sm:max-w-[180px] shrink-0 font-medium">
                &ldquo;{lastCommand.transcript}&rdquo;
              </span>
            )}
            <span className="text-[#1F7A4D] font-bold truncate flex-1 min-w-0">
              → {lastCommand.summary}
            </span>
          </div>
        )}
      </div>

      {/* Floating Mini Mic on every panel when not on Mic */}
      {activeIndex !== 0 && !openPanel && (
        <FloatingMic
          isListening={voiceState === 'listening'}
          onPressStart={handleMicStart}
          onPressEnd={handleMicEnd}
        />
      )}

      {/* Undo Toast for 5 seconds */}
      <AnimatePresence>
        {showUndoToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 z-50 glass-strong px-5 py-3 rounded-full border border-white shadow-xl flex items-center gap-3 text-sm font-semibold text-[#1F1B16]"
          >
            <span>{t.undoToast}</span>
            <button
              onClick={handleUndoToast}
              className="px-3.5 py-1.5 rounded-full bg-[#C23B22] text-white text-xs font-bold hover:bg-[#a52e18] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.undoButton}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Result Sheet */}
      <AnimatePresence>
        {showResultSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-end justify-center p-3 sm:p-6"
            onClick={() => setShowResultSheet(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg glass-strong p-6 rounded-t-3xl border border-white shadow-2xl flex flex-col gap-4 max-h-[75vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#E9E2D6] pb-3">
                <div className="text-sm font-bold text-[#1F1B16] flex items-center gap-2">
                  <Mic className="w-4 h-4 text-[#E8731A]" />
                  <span>{t.voiceResult}</span>
                </div>
                <button
                  onClick={() => setShowResultSheet(false)}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#8A7F72] hover:text-[#1F1B16] shadow-xs cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Transcript Bubble */}
              {transcript && (
                <div className="p-3.5 rounded-2xl bg-white border border-[#E9E2D6]">
                  <div className="text-[11px] font-bold text-[#8A7F72] uppercase">
                    {t.heard}
                  </div>
                  <p className="text-base font-semibold text-[#1F1B16] mt-0.5">
                    &ldquo;{transcript}&rdquo;
                  </p>
                </div>
              )}

              {/* Spoken Reply Bubble */}
              {replyText && (
                <div className="p-4 rounded-2xl bg-[#FDEBDA] border border-[#E8731A]/30 flex items-start gap-3">
                  <Volume2 className="w-5 h-5 text-[#E8731A] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-bold text-[#E8731A] uppercase">
                      {t.reply}
                    </div>
                    <p className="text-base font-bold text-[#1F1B16] mt-0.5">
                      {replyText}
                    </p>
                  </div>
                </div>
              )}

              {/* Interactive Clarification Box in Result Sheet */}
              {clarificationData && (
                <div className="p-4 rounded-2xl bg-[#FFF9E6] border-2 border-[#B7791F] flex flex-col gap-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#B7791F] uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#B7791F] animate-ping" />
                      <span>{isEn ? 'Select or Speak Answer' : 'उत्तर चुनें या बोलें'}</span>
                    </span>
                    <span className="text-[11px] font-bold text-[#8A7F72]">
                      {voiceState === 'listening'
                        ? (isEn ? '🔴 Listening...' : '🔴 सुन रहा हूँ...')
                        : ''}
                    </span>
                  </div>

                  {clarificationData.options && clarificationData.options.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {clarificationData.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => {
                            setTranscript(opt);
                            submitCommand(opt);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#E8731A] text-[#1F1B16] hover:text-white font-bold text-sm border border-[#E9E2D6] shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <Users className="w-4 h-4 text-[#E8731A]" />
                          <span>{opt}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#B7791F]/20">
                    <span className="text-xs font-semibold text-[#8A7F72]">
                      {voiceState === 'listening'
                        ? (isEn ? 'Recording voice now...' : 'आवाज रिकॉर्ड हो रही है...')
                        : (isEn ? 'Tap mic to speak' : 'बोलने के लिए माइक दबाएं')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (voiceState === 'listening') {
                          handleMicEnd();
                        } else {
                          handleMicStart();
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                        voiceState === 'listening'
                          ? 'bg-[#C23B22] text-white animate-pulse'
                          : 'bg-[#E8731A] text-white hover:bg-[#d66512]'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{voiceState === 'listening' ? (isEn ? 'Stop' : 'रोकें') : (isEn ? 'Speak' : 'बोलें')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Cards Stack */}
              {actionCards.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-bold text-[#8A7F72] uppercase">
                    {t.recordedActions} ({actionCards.length} {t.cards})
                  </div>
                  {actionCards.map((a, i) => (
                    <ActionCard key={i} action={a} index={i} />
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen Panels */}
      {openPanel === 'records' && <RecordsPanel onClose={() => setOpenPanel(null)} />}
      {openPanel === 'customers' && <CustomersPanel onClose={() => setOpenPanel(null)} />}
      {openPanel === 'commands' && <CommandsPanel onClose={() => setOpenPanel(null)} />}
      {openPanel === 'stock' && <StockPanel onClose={() => setOpenPanel(null)} />}
      {openPanel === 'reminders' && <RemindersPanel onClose={() => setOpenPanel(null)} />}
      {openPanel === 'hisaab' && <HisaabPanel onClose={() => setOpenPanel(null)} />}
      {openPanel === 'settings' && <SettingsPanel onClose={() => setOpenPanel(null)} />}
    </div>
  );
}
