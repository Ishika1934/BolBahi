'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, History, RotateCcw, Volume2, CheckCircle2, AlertCircle, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface CommandItem {
  id: string;
  groupId: string;
  sessionId: string;
  transcript: string;
  parsedActions: any[];
  executionResults: any[];
  spokenReply: string;
  status: 'executed' | 'undone' | 'failed';
  createdAt: string;
}

interface CommandsPanelProps {
  onClose: () => void;
}

export function CommandsPanel({ onClose }: CommandsPanelProps) {
  const { language } = useAuth();
  const isEn = language === 'en-IN';

  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoingGroupId, setUndoingGroupId] = useState<string | null>(null);
  const [confirmDeleteCmd, setConfirmDeleteCmd] = useState<CommandItem | null>(null);

  const fetchCommands = async () => {
    setLoading(true);
    const res = await apiFetch<CommandItem[]>('/api/commands');
    if (res.ok) {
      setCommands(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCommands();
  }, []);

  const handleUndo = async (groupId: string) => {
    setUndoingGroupId(groupId);
    const res = await apiFetch(`/api/commands/${groupId}`, { method: 'DELETE' });
    if (res.ok) {
      setCommands((prev) =>
        prev.map((cmd) => (cmd.groupId === groupId ? { ...cmd, status: 'undone' } : cmd))
      );
    }
    setUndoingGroupId(null);
    setConfirmDeleteCmd(null);
  };

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
          <History className="w-5 h-5 text-[#4F46E5]" />
          <span>{isEn ? 'Voice Command History' : 'आवाज इतिहास'}</span>
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
        {/* Commands List Feed */}
        <div className="flex-1 flex flex-col gap-3">
          {loading ? (
            <div className="text-center py-16 text-[#8A7F72] text-sm font-medium">
              {isEn ? 'Loading command history...' : 'आदेश इतिहास लोड हो रहा है...'}
            </div>
          ) : commands.length === 0 ? (
            <div className="glass-card p-8 text-center text-[#8A7F72]">
              <History className="w-8 h-8 text-[#8A7F72]/40 mx-auto mb-2" />
              <p className="font-bold text-base text-[#1F1B16]">
                {isEn ? 'No voice commands recorded yet.' : 'अभी तक कोई आवाज आदेश दर्ज नहीं हुआ।'}
              </p>
              <p className="text-xs mt-1">
                {isEn ? 'Hold the mic to speak your first command' : 'पहला आदेश देने के लिए माइक दबाकर बोलें'}
              </p>
            </div>
          ) : (
            commands.map((cmd) => {
              const isUndone = cmd.status === 'undone';
              const isFailed = cmd.status === 'failed';
              const canUndo =
                !isUndone &&
                !isFailed &&
                cmd.parsedActions?.some((a) => a.type?.startsWith('add_'));

              const dateStr = new Date(cmd.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={cmd.id}
                  className={`glass-card p-4 flex flex-col gap-2.5 border border-white shadow-xs transition-all ${
                    isUndone ? 'opacity-60 bg-gray-50/70' : 'hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center shrink-0 mt-0.5">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#1F1B16]">
                          &ldquo;{cmd.transcript}&rdquo;
                        </div>
                        <div className="text-[11px] text-[#8A7F72] mt-0.5">{dateStr}</div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                        isUndone
                          ? 'bg-gray-100 text-gray-500'
                          : isFailed
                          ? 'bg-[#FBE6E1] text-[#C23B22]'
                          : 'bg-[#E2F3E9] text-[#1F7A4D]'
                      }`}
                    >
                      {isUndone
                        ? isEn
                          ? 'Undone'
                          : 'हटा दिया'
                        : isFailed
                        ? isEn
                          ? 'Failed'
                          : 'असफल'
                        : isEn
                        ? 'Executed'
                        : 'सफल'}
                    </span>
                  </div>

                  {/* Spoken reply */}
                  {cmd.spokenReply && (
                    <div className="text-xs text-[#1F1B16] bg-white/70 p-2.5 rounded-xl border border-[#E9E2D6] flex items-start gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-[#E8731A] shrink-0 mt-0.5" />
                      <span className="font-medium">{cmd.spokenReply}</span>
                    </div>
                  )}

                  {/* Actions summary & Undo button */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#E9E2D6]/60">
                    <div className="text-[11px] text-[#8A7F72] font-semibold">
                      {cmd.executionResults?.length || 0} {isEn ? 'action(s)' : 'कार्य दर्ज'}
                    </div>

                    {canUndo && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCmd(cmd)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#C23B22] hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isEn ? 'Undo entry' : 'वापस लें'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Confirm Undo Dialog */}
        {confirmDeleteCmd && (
          <div
            className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setConfirmDeleteCmd(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm glass-strong p-6 rounded-3xl border border-white shadow-2xl flex flex-col gap-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#FBE6E1] text-[#C23B22] flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1F1B16]">
                {isEn ? 'Undo this entry?' : 'क्या इस प्रविष्टि को हटाना है?'}
              </h3>
              <p className="text-xs text-[#8A7F72]">
                &ldquo;{confirmDeleteCmd.transcript}&rdquo;
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCmd(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E9E2D6] text-xs font-bold text-[#8A7F72] hover:bg-white"
                >
                  {isEn ? 'Cancel' : 'रद्द करें'}
                </button>
                <button
                  type="button"
                  onClick={() => handleUndo(confirmDeleteCmd.groupId)}
                  disabled={undoingGroupId === confirmDeleteCmd.groupId}
                  className="flex-1 py-2.5 rounded-xl bg-[#C23B22] text-white text-xs font-bold hover:bg-[#a52e18] shadow-sm flex items-center justify-center gap-1.5"
                >
                  {undoingGroupId === confirmDeleteCmd.groupId ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{isEn ? 'Yes, Undo' : 'हाँ, हटाएं'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
