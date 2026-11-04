'use client';

import React, { useState } from 'react';
import { ArrowLeft, Settings, Save, Check, X, Store, User, Phone, Mail, Globe } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { shop, user, language, setLanguage } = useAuth();
  const isEn = language === 'en-IN';

  const [shopName, setShopName] = useState(shop?.name || '');
  const [ownerName, setOwnerName] = useState(shop?.ownerName || '');
  const [phone, setPhone] = useState((shop as any)?.phone || '');
  const [email, setEmail] = useState((shop as any)?.email || '');
  const [selectedLang, setSelectedLang] = useState(language);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const res = await apiFetch('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify({
        shopName,
        ownerName,
        phone,
        email,
        language: selectedLang,
      }),
    });

    if (res.ok) {
      setLanguage(selectedLang as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
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
          <Settings className="w-5 h-5 text-[#E8731A]" />
          <span>{isEn ? 'Shop Settings' : 'दुकान सेटिंग्स'}</span>
        </h2>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white border border-[#E9E2D6] flex items-center justify-center text-[#8A7F72] hover:text-[#1F1B16] shadow-xs cursor-pointer transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Panel Content Container */}
      <div className="w-full max-w-xl mx-auto p-4 sm:p-6 flex-1 flex flex-col pb-24">
        {saved && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#E2F3E9] border border-[#1F7A4D]/30 text-[#1F7A4D] text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{isEn ? 'Settings updated successfully!' : 'सेटिंग्स सफलतापूर्वक सहेज ली गईं!'}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="glass-card p-5 border border-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#1F1B16] uppercase tracking-wider pb-2 border-b border-[#E9E2D6]">
              {isEn ? 'Store Identity' : 'दुकान की जानकारी'}
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#1F1B16] mb-1">
                {isEn ? 'Shop Name' : 'दुकान का नाम'}
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#E9E2D6] focus:border-[#E8731A] text-sm font-semibold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F1B16] mb-1">
                {isEn ? 'Owner Name' : 'मालिक का नाम'}
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#E9E2D6] focus:border-[#E8731A] text-sm font-semibold outline-none"
              />
            </div>
          </div>

          <div className="glass-card p-5 border border-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#1F1B16] uppercase tracking-wider pb-2 border-b border-[#E9E2D6]">
              {isEn ? 'Contact & Language' : 'संपर्क व भाषा'}
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#1F1B16] mb-1">
                {isEn ? 'Mobile Phone' : 'मोबाइल नंबर'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#E9E2D6] focus:border-[#E8731A] text-sm font-semibold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F1B16] mb-1">
                {isEn ? 'Notification Email' : 'ईमेल (तगादा व रिपोर्ट के लिए)'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="shop@example.com"
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#E9E2D6] focus:border-[#E8731A] text-sm font-semibold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F1B16] mb-1.5">
                {isEn ? 'Interface & Voice Language' : 'सिस्टम व आवाज की भाषा'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLang('hi-IN')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedLang === 'hi-IN'
                      ? 'bg-[#E8731A] text-white border-[#E8731A] shadow-xs'
                      : 'bg-white text-[#1F1B16] border-[#E9E2D6] hover:border-[#E8731A]/40'
                  }`}
                >
                  हिंदी (Hindi)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLang('en-IN')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedLang === 'en-IN'
                      ? 'bg-[#E8731A] text-white border-[#E8731A] shadow-xs'
                      : 'bg-white text-[#1F1B16] border-[#E9E2D6] hover:border-[#E8731A]/40'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-xl bg-[#E8731A] hover:bg-[#d66512] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEn ? 'Save Settings' : 'सेटिंग्स सहेजें'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
