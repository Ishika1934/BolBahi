'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Bell, Package, Check, AlertCircle, HelpCircle, Mail, Eye, User } from 'lucide-react';

export interface ActionCardData {
  type: string;
  summary: string;
  ok: boolean;
  error?: string;
  data?: any;
}

interface ActionCardProps {
  action: ActionCardData;
  index: number;
}

export function ActionCard({ action, index }: ActionCardProps) {
  const getTypeConfig = () => {
    switch (action.type) {
      case 'add_udhaar':
        return {
          barColor: 'bg-[#C23B22]',
          badgeBg: 'bg-[#FBE6E1]',
          badgeText: 'text-[#C23B22]',
          icon: <ArrowUpRight className="w-5 h-5 text-[#C23B22]" />,
          label: 'उधार (Debit)',
        };
      case 'add_payment':
        return {
          barColor: 'bg-[#1F7A4D]',
          badgeBg: 'bg-[#E2F3E9]',
          badgeText: 'text-[#1F7A4D]',
          icon: <ArrowDownLeft className="w-5 h-5 text-[#1F7A4D]" />,
          label: 'जमा (Credit)',
        };
      case 'set_reminder':
        return {
          barColor: 'bg-[#2B6CB0]',
          badgeBg: 'bg-[#E3EEF9]',
          badgeText: 'text-[#2B6CB0]',
          icon: <Bell className="w-5 h-5 text-[#2B6CB0]" />,
          label: 'रिमाइंडर (Reminder)',
        };
      case 'add_low_stock':
        return {
          barColor: 'bg-[#B7791F]',
          badgeBg: 'bg-[#FBF0D9]',
          badgeText: 'text-[#B7791F]',
          icon: <Package className="w-5 h-5 text-[#B7791F]" />,
          label: 'स्टॉक अलर्ट (Low Stock)',
        };
      case 'show_view':
        return {
          barColor: 'bg-[#4F46E5]',
          badgeBg: 'bg-[#EEF2FF]',
          badgeText: 'text-[#4F46E5]',
          icon: <Eye className="w-5 h-5 text-[#4F46E5]" />,
          label: 'स्क्रीन (View)',
        };
      case 'update_customer':
        return {
          barColor: 'bg-[#E8731A]',
          badgeBg: 'bg-[#FDEBDA]',
          badgeText: 'text-[#E8731A]',
          icon: <User className="w-5 h-5 text-[#E8731A]" />,
          label: 'नाम सुधार (Rename)',
        };
      case 'clarify':
        return {
          barColor: 'bg-[#E8731A]',
          badgeBg: 'bg-[#FDEBDA]',
          badgeText: 'text-[#E8731A]',
          icon: <HelpCircle className="w-5 h-5 text-[#E8731A]" />,
          label: 'सवाल (Clarify)',
        };
      default:
        return {
          barColor: 'bg-[#8A7F72]',
          badgeBg: 'bg-white',
          badgeText: 'text-[#1F1B16]',
          icon: <Check className="w-5 h-5 text-[#1F7A4D]" />,
          label: 'कमांड (Action)',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl bg-white/85 backdrop-blur-md border border-white shadow-md p-4 flex flex-col gap-2"
    >
      {/* Left colored bar by type */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.barColor}`} />

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-[#E9E2D6]/70">
            {config.icon}
          </div>
          <div>
            <div className="text-xs font-semibold text-[#8A7F72] uppercase tracking-wider">
              {config.label}
            </div>
            <div className="text-base font-bold text-[#1F1B16] leading-snug">
              {action.summary}
            </div>
          </div>
        </div>

        {/* Status Chip */}
        <div className="flex items-center">
          {action.ok ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E2F3E9] text-[#1F7A4D] border border-[#1F7A4D]/20">
              <Check className="w-3.5 h-3.5" />
              Done
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FBE6E1] text-[#C23B22] border border-[#C23B22]/20">
              <AlertCircle className="w-3.5 h-3.5" />
              {action.error || 'Review'}
            </span>
          )}
        </div>
      </div>

      {/* Reminder email preview if present */}
      {action.type === 'set_reminder' && action.data?.emailSent && (
        <div className="mt-1 pl-2 text-xs flex items-center gap-1.5 text-[#2B6CB0] bg-[#E3EEF9]/60 px-2.5 py-1.5 rounded-lg">
          <Mail className="w-3.5 h-3.5" />
          <span>Email sent to: <strong>{action.data?.emailTo || 'demo inbox'}</strong></span>
        </div>
      )}
    </motion.div>
  );
}

