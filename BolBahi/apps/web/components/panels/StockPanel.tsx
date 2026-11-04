'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Bell, Mail, Clock, CheckCircle, XCircle, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface ReminderItem {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  message: string;
  channel: string;
  sendAt: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  createdAt: string;
}

interface RemindersPanelProps {
  onClose: () => void;
}

export function RemindersPanel({ onClose }: RemindersPanelProps) {
  const { language } = useAuth();
  const isEn = language === 'en-IN';

  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchReminders = async () => {
    setLoading(true);
    const res = await apiFetch<ReminderItem[]>('/api/reminders');
    if (res.ok && Array.isArray(res.data)) {
      setReminders(res.data);
    }
    setLoading(false);
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    try {
      const res = await apiFetch('/api/demo/seed', { method: 'POST' });
      if (res.ok) {
        await fetchReminders();
      }
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const cancelReminder = async (id: string) => {
    const res = await apiFetch(`/api/reminders/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setReminders(
        reminders.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r))
      );
    }
  };

  const pendingCount = reminders.filter((r) => r.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#FBF7F0] backdrop-blur-2xl flex flex-col w-screen h-screen">
      {/* Full-width Sticky Header */}
      <div className="sticky top-0 z-20 w-full bg-white/85 backdrop-blur-xl border-b border-[#E9E2D6] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-white hover:bg-[#FBF7F0] text-[#1F1B16] border border-[#E9E2D6] shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#E8731A]" />
          <span>{isEn ? 'Back' : 'वापस'}</span>
        </button>

        <h2 className="text-lg sm:text-xl font-extrabold text-[#1F1B16] flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#2B6CB0]" />
          <span>{isEn ? 'Payment Reminders' : 'रिमाइंडर'}</span>
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
        {/* Summary Banner */}
        <div className="glass-card p-4 sm:p-5 mb-5 flex items-center justify-between border border-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#2B6CB0]/15 text-[#2B6CB0] flex items-center justify-center shadow-xs">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#8A7F72] uppercase tracking-wider">
                {isEn ? 'Pending Reminders' : 'बाकी रिमाइंडर'}
              </div>
              <div className="text-2xl font-black text-[#2B6CB0] mt-0.5">
                {pendingCount} {isEn ? 'pending' : 'बाकी हैं'}
              </div>
            </div>
          </div>
          <div className="text-xs text-[#8A7F72] text-right font-semibold">
            {isEn ? 'Automated Email Reminders' : 'ऑटोमेटेड ईमेल तगादा'}
          </div>
        </div>

        {/* Reminders List */}
        <div className="flex-1 flex flex-col gap-3">
          {loading ? (
            <div className="text-center py-16 text-[#8A7F72] text-sm font-semibold">
              {isEn ? 'Loading reminders...' : 'लोड हो रहा है...'}
            </div>
          ) : reminders.length === 0 ? (
            <div className="glass-card p-10 text-center text-[#8A7F72] border border-white">
              <Bell className="w-8 h-8 text-[#8A7F72]/40 mx-auto mb-2" />
              <p className="font-bold text-base text-[#1F1B16]">
                {isEn ? 'No reminders scheduled.' : 'कोई रिमाइंडर निर्धारित नहीं है।'}
              </p>
              <p className="text-xs mt-1 mb-4 text-[#8A7F72]">
                {isEn
                  ? 'Speak: "Remind Ramesh tomorrow" or load sample kirana reminders'
                  : 'बोलें: "कल रमेश को याद दिला देना" या सैंपल रिमाइंडर लोड करें'}
              </p>
              <button
                type="button"
                onClick={handleSeedDemoData}
                disabled={seeding}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E8731A] text-white text-xs font-bold shadow-md hover:bg-[#d66512] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{seeding ? (isEn ? 'Loading sample data...' : 'डेटा लोड हो रहा है...') : (isEn ? '⚡ Load Sample Kirana Data' : '⚡ सैंपल किराना डेटा लोड करें')}</span>
              </button>
            </div>
          ) : (
            reminders.map((rem) => {
              const isPending = rem.status === 'pending';
              const isSent = rem.status === 'sent';
              const sendAtStr = new Date(rem.sendAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={rem.id}
                  className="glass-card p-4 flex flex-col gap-2.5 border border-white shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-[#1F1B16]">
                        {rem.customerName}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          isPending
                            ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#4F46E5]/20'
                            : isSent
                            ? 'bg-[#E2F3E9] text-[#1F7A4D] border border-[#1F7A4D]/20'
                            : 'bg-[#FBE6E1] text-[#C23B22] border border-[#C23B22]/20'
                        }`}
                      >
                        {rem.status === 'pending'
                          ? isEn
                            ? 'Pending'
                            : 'बाकी'
                          : rem.status === 'sent'
                          ? isEn
                            ? 'Sent'
                            : 'भेजा गया'
                          : isEn
                          ? 'Cancelled'
                          : 'रद्द'}
                      </span>
                    </div>

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => cancelReminder(rem.id)}
                        className="text-xs font-bold text-[#C23B22] hover:underline cursor-pointer"
                      >
                        {isEn ? 'Cancel' : 'रद्द करें'}
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-[#8A7F72] font-medium line-clamp-2">
                    &ldquo;{rem.message}&rdquo;
                  </p>

                  <div className="text-[11px] font-semibold text-[#8A7F72] flex items-center justify-between border-t border-[#E9E2D6]/60 pt-2.5 mt-1">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#E8731A]" />
                      <span>
                        {isEn ? 'Scheduled:' : 'समय:'} {sendAtStr}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#2B6CB0]" />
                      <span>{rem.channel}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
