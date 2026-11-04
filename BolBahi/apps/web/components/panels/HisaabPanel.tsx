'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Clock, X, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface DailySummaryData {
  todayIn: number;
  todayOut: number;
  net: number;
  entryCount: number;
  timestamp: string;
}

interface HisaabPanelProps {
  onClose: () => void;
}

export function HisaabPanel({ onClose }: HisaabPanelProps) {
  const { language } = useAuth();
  const isEn = language === 'en-IN';

  const [summary, setSummary] = useState<DailySummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    let res = await apiFetch<DailySummaryData>('/api/stats/daily-summary');
    if (!res.ok || !res.data) {
      const statsRes = await apiFetch<any>('/api/stats');
      if (statsRes.ok && statsRes.data) {
        res = {
          ok: true,
          data: {
            todayIn: statsRes.data.todayIn || 0,
            todayOut: statsRes.data.todayOut || 0,
            net: statsRes.data.netToday || 0,
            entryCount: ((statsRes.data.todayIn || 0) + (statsRes.data.todayOut || 0) > 0) ? 1 : 0,
            timestamp: new Date().toISOString(),
          },
        };
      }
    }
    if (res.ok && res.data) {
      setSummary(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const todayStr = new Date().toLocaleDateString(isEn ? 'en-IN' : 'hi-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#FBF7F0] flex flex-col w-screen h-screen">
      {/* Full-width Sticky Header */}
      <div className="sticky top-0 z-20 w-full bg-white/95 backdrop-blur-xl border-b border-[#E9E2D6] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-white hover:bg-[#FBF7F0] text-[#1F1B16] border border-[#E9E2D6] shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#E8731A]" />
          <span>{isEn ? 'Back' : 'वापस'}</span>
        </button>

        <h2 className="text-lg sm:text-xl font-extrabold text-[#1F1B16] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#D97706]" />
          <span>{isEn ? 'Daily Hisaab' : 'दैनिक हिसाब'}</span>
        </h2>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white border border-[#E9E2D6] flex items-center justify-center text-[#8A7F72] hover:text-[#1F1B16] shadow-xs cursor-pointer transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Panel Content Container */}
      <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 flex-1 flex flex-col pb-24">
        {/* Date banner */}
        <div className="flex items-center gap-2 text-xs font-bold text-[#8A7F72] mb-4 px-1">
          <Calendar className="w-4 h-4 text-[#E8731A]" />
          <span>{todayStr}</span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#8A7F72] text-sm font-medium">
            {isEn ? 'Loading daily hisaab...' : 'दैनिक हिसाब लोड हो रहा है...'}
          </div>
        ) : summary ? (
          <div className="flex flex-col gap-4">
            {/* Net Flow Big Banner */}
            <div className="glass-card p-6 border border-white shadow-md text-center">
              <div className="text-xs font-bold text-[#8A7F72] uppercase tracking-wider">
                {isEn ? "Today's Net Cash Position" : 'आज का शुद्ध नकद संतुलन'}
              </div>
              <div
                className={`text-4xl font-black mt-2 ${
                  summary.net >= 0 ? 'text-[#1F7A4D]' : 'text-[#C23B22]'
                }`}
              >
                {summary.net >= 0 ? '+' : ''}₹{summary.net.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-[#8A7F72] mt-1 font-semibold">
                {summary.entryCount} {isEn ? 'total entries recorded today' : 'लेन-देन आज दर्ज हुए'}
              </p>
            </div>

            {/* Split cards: Cash In vs Credit Out */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cash In */}
              <div className="glass-card p-5 border border-white shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E2F3E9] text-[#1F7A4D] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#8A7F72] uppercase tracking-wider">
                    {isEn ? 'Cash Received Today' : 'आज की नकद वसूली'}
                  </div>
                  <div className="text-2xl font-black text-[#1F7A4D] mt-0.5">
                    ₹{summary.todayIn.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Credit Given */}
              <div className="glass-card p-5 border border-white shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FBE6E1] text-[#C23B22] flex items-center justify-center shrink-0">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#8A7F72] uppercase tracking-wider">
                    {isEn ? 'Credit Given Today' : 'आज दी गई उधारी'}
                  </div>
                  <div className="text-2xl font-black text-[#C23B22] mt-0.5">
                    ₹{summary.todayOut.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Spoken Query Tip */}
            <div className="p-4 rounded-2xl bg-[#FEF3C7]/60 border border-[#D97706]/30 text-xs text-[#1F1B16] font-medium flex items-center gap-3">
              <span className="text-base">💡</span>
              <span>
                {isEn
                  ? 'Speak anytime: "What is today\'s hisaab?" to hear this breakdown spoken aloud.'
                  : 'कभी भी बोलें: "आज का हिसाब बताओ" और पूरा ब्योरा आवाज में सुनें।'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-[#8A7F72] text-sm font-semibold">
            {isEn ? 'Could not load summary.' : 'हिसाब लोड नहीं हो सका।'}
          </div>
        )}
      </div>
    </div>
  );
}
