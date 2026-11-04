'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Store, Settings, LogOut, Mic } from 'lucide-react';
import { SettingsPanel } from '@/components/panels/SettingsPanel';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, shop, language, setLanguage, loading, logout } = useAuth();
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#E8731A] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#8A7F72]">लोड हो रहा है...</p>
        </div>
      </div>
    );
  }

  const isEn = language === 'en-IN';

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Top Header Bar - Spacious Premium Glass & Prominent Kirana Identity */}
      <header className="sticky top-0 z-40 px-3 sm:px-8 py-3.5 sm:py-4 border-b border-[#E9E2D6]/85 bg-white/90 backdrop-blur-2xl flex items-center justify-between shadow-[0_4px_24px_rgba(31,27,22,0.06)]">
        {/* Left: Brand Mark + Shop Info */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* BolBahi Brand Pill */}
          <div className="flex items-center gap-2.5 py-1.5 px-3 sm:px-3.5 rounded-2xl bg-gradient-to-r from-[#E8731A]/15 to-[#E8731A]/5 border border-[#E8731A]/30 shadow-xs">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#E8731A] to-[#d66512] text-white flex items-center justify-center font-black shadow-md shadow-[#E8731A]/35 shrink-0">
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="leading-tight">
              <div className="font-black text-sm sm:text-base tracking-tight text-[#1F1B16] flex items-center gap-1.5">
                <span>{isEn ? '' : 'बोलबही'}</span>
                <span className="text-[#E8731A] font-extrabold text-xs sm:text-sm">BolBahi</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-[#1F7A4D] mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1F7A4D] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1F7A4D]"></span>
                </span>
                <span>{isEn ? 'Live Khata Active' : 'दुकान खाता सक्रिय'}</span>
              </div>
            </div>
          </div>

          {/* Hairline Divider */}
          <div className="h-8 w-[1.5px] bg-[#E9E2D6] hidden md:block" />

          {/* Shop Name & Owner */}
          <div className="flex items-center gap-2.5 py-1.5 px-3 rounded-2xl bg-white/80 border border-white/90 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[#1F1B16]/5 text-[#1F1B16] flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 text-[#E8731A]" />
            </div>
            <div className="leading-tight">
              <h2 className="font-black text-xs sm:text-base text-[#1F1B16] tracking-tight">
                {shop.name}
              </h2>
              <p className="text-[11px] sm:text-xs font-semibold text-[#8A7F72]">
                {shop.ownerName}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Live Voice Waveform Pill (Desktop) */}
        <div className="hidden xl:flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 border border-white shadow-xs text-xs font-bold text-[#8A7F72]">
          <span className="text-[#E8731A] text-sm">🎙️</span>
          <span>
            {isEn
              ? 'Speak to add credit, cash or query'
              : 'बोलकर उधारी, नकद या हिसाब दर्ज करें'}
          </span>
          <div className="flex items-center gap-1 ml-1.5">
            <span className="w-1 h-3.5 bg-[#E8731A] rounded-full animate-pulse" />
            <span className="w-1 h-5 bg-[#E8731A] rounded-full animate-pulse delay-75" />
            <span className="w-1 h-2.5 bg-[#E8731A] rounded-full animate-pulse delay-150" />
          </div>
        </div>

        {/* Right: Language Switcher, Settings & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Universal Language Switcher */}
          <div className="flex items-center bg-white/90 p-1 rounded-full border border-[#E9E2D6] shadow-xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => setLanguage('hi-IN')}
              aria-label="Switch to Hindi"
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold tracking-tight transition-all cursor-pointer ${
                language === 'hi-IN'
                  ? 'bg-[#E8731A] text-white shadow-xs scale-102'
                  : 'text-[#8A7F72] hover:text-[#1F1B16]'
              }`}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en-IN')}
              aria-label="Switch to English"
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold tracking-tight transition-all cursor-pointer ${
                language === 'en-IN'
                  ? 'bg-[#E8731A] text-white shadow-xs scale-102'
                  : 'text-[#8A7F72] hover:text-[#1F1B16]'
              }`}
            >
              English
            </button>
          </div>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/85 hover:bg-white text-[#1F1B16] border border-[#E9E2D6] shadow-xs flex items-center justify-center transition-all cursor-pointer hover:border-[#E8731A]/40 active:scale-95"
            title={isEn ? 'Shop Settings' : 'दुकान सेटिंग्स'}
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-[#8A7F72] hover:text-[#E8731A]" />
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={logout}
            title={isEn ? 'Logout' : 'लॉग आउट'}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold text-[#8A7F72] hover:text-[#C23B22] hover:bg-white border border-transparent hover:border-[#C23B22]/20 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{isEn ? 'Logout' : 'लॉग आउट'}</span>
          </button>
        </div>
      </header>

      {/* Main App Content */}
      <main className="flex-1 flex flex-col relative pt-6 sm:pt-8 pb-10 overflow-x-hidden">{children}</main>

      {/* Settings Modal Sheet */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
