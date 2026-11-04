'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Store, ArrowRight, Languages, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export function AuthForm({ mode }: AuthFormProps) {
  const { login, register } = useAuth();
  const [lang, setLang] = useState<'hi' | 'en'>('hi');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const t = {
    hi: {
      appName: 'बोलबही',
      tagline: 'बोल दो, बही बन जाएगी।',
      subtitle: 'भारतीय किराना दुकानों के लिए आवाज आधारित खाता',
      loginTitle: 'दुकान में प्रवेश करें',
      registerTitle: 'नया खाता बनाएं',
      shopNameLabel: 'दुकान का नाम',
      shopNamePlaceholder: 'उदा. राजू किराना स्टोर',
      ownerNameLabel: 'मालिक का नाम',
      ownerNamePlaceholder: 'उदा. राजू भइया',
      identifierLabel: 'ईमेल या 10-अंकों का मोबाइल नंबर',
      identifierPlaceholder: 'उदा. 9876543210 या raju@kirana.com',
      passwordLabel: 'पासवर्ड (कम से कम 8 अक्षर)',
      passwordPlaceholder: '••••••••',
      loginBtn: 'लॉग इन करें',
      registerBtn: 'खाता बनाएं और शुरू करें',
      noAccount: 'नया खाता बनाना है?',
      hasAccount: 'पहले से खाता है?',
      switchToRegister: 'यहाँ रजिस्टर करें',
      switchToLogin: 'लॉग इन करें',
      validationPassword: 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए',
      invalidCreds: 'ईमेल/मोबाइल या पासवर्ड गलत है',
      regFailed: 'खाता बनाने में समस्या आई, कृपया दोबारा जांचें',
    },
    en: {
      appName: 'BolBahi',
      tagline: 'Speak your ledger into existence.',
      subtitle: 'Voice-first credit ledger for Indian kirana stores',
      loginTitle: 'Sign In to Your Shop',
      registerTitle: 'Create Shop Account',
      shopNameLabel: 'Shop Name',
      shopNamePlaceholder: 'e.g. Raju Kirana Store',
      ownerNameLabel: 'Owner Name',
      ownerNamePlaceholder: 'e.g. Raju Bhaiya',
      identifierLabel: 'Email or 10-digit Mobile',
      identifierPlaceholder: 'e.g. 9876543210 or raju@kirana.com',
      passwordLabel: 'Password (min. 8 characters)',
      passwordPlaceholder: '••••••••',
      loginBtn: 'Sign In',
      registerBtn: 'Create Shop & Start',
      noAccount: "Don't have an account?",
      hasAccount: 'Already registered?',
      switchToRegister: 'Register here',
      switchToLogin: 'Sign In',
      validationPassword: 'Password must be at least 8 characters',
      invalidCreds: 'Invalid credentials. Please check and try again.',
      regFailed: 'Registration failed. Please try again.',
    },
  }[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg(t.validationPassword);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await login(identifier, password);
        if (!res.ok) {
          setErrorMsg(res.error || t.invalidCreds);
        }
      } else {
        const res = await register({
          shopName,
          ownerName,
          identifier,
          password,
          language: lang === 'hi' ? 'hi-IN' : 'en-IN',
        });
        if (!res.ok) {
          setErrorMsg(res.error || t.regFailed);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#E8731A] to-[#D9630E] text-white shadow-xl shadow-[#E8731A]/35 mb-3 border-2 border-white/60">
          <Store className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1F1B16]">
          {lang === 'hi' ? 'बोलबही' : ''} <span className="text-[#E8731A]">BolBahi</span>
        </h1>
        <p className="text-sm font-semibold text-[#8A7F72] mt-1 italic">
          &ldquo;{t.tagline}&rdquo;
        </p>
        <p className="text-xs text-[#8A7F72] mt-0.5">{t.subtitle}</p>
      </div>

      {/* Main Glass Card (Spec 4.8.6: max width 420 px, centered, logo orb, 56px inputs, saffron button) */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-white">
        {/* Language Toggle in Top-Right Corner */}
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-[#E9E2D6]/80">
          <h2 className="text-xl font-bold text-[#1F1B16]">
            {mode === 'login' ? t.loginTitle : t.registerTitle}
          </h2>
          <button
            type="button"
            onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-[#1F1B16] border border-[#E9E2D6] shadow-xs hover:border-[#E8731A] transition-all cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5 text-[#E8731A]" />
            <span>{lang === 'hi' ? 'English' : 'हिंदी'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#FBE6E1] border border-[#C23B22]/30 text-[#C23B22] text-sm font-medium flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-[#C23B22] hover:text-[#9A2D19] p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#1F1B16] mb-1.5">
                  {t.shopNameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder={t.shopNamePlaceholder}
                  className="w-full h-14 px-4 rounded-xl bg-white border border-[#E9E2D6] focus:border-[#E8731A] focus:ring-2 focus:ring-[#E8731A]/20 outline-none text-[#1F1B16] text-base font-medium shadow-xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F1B16] mb-1.5">
                  {t.ownerNameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder={t.ownerNamePlaceholder}
                  className="w-full h-14 px-4 rounded-xl bg-white border border-[#E9E2D6] focus:border-[#E8731A] focus:ring-2 focus:ring-[#E8731A]/20 outline-none text-[#1F1B16] text-base font-medium shadow-xs transition-all"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-[#1F1B16] mb-1.5">
              {t.identifierLabel}
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t.identifierPlaceholder}
              className="w-full h-14 px-4 rounded-xl bg-white border border-[#E9E2D6] focus:border-[#E8731A] focus:ring-2 focus:ring-[#E8731A]/20 outline-none text-[#1F1B16] text-base font-medium shadow-xs transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F1B16] mb-1.5">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="w-full h-14 pl-4 pr-12 rounded-xl bg-white border border-[#E9E2D6] focus:border-[#E8731A] focus:ring-2 focus:ring-[#E8731A]/20 outline-none text-[#1F1B16] text-base font-medium shadow-xs transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A7F72] hover:text-[#1F1B16] p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 rounded-xl bg-gradient-to-r from-[#E8731A] to-[#D9630E] hover:from-[#d66512] hover:to-[#c45308] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-[#E8731A]/30 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? t.loginBtn : t.registerBtn}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Footer switch */}
        <div className="mt-6 pt-4 border-t border-[#E9E2D6]/80 text-center text-xs text-[#8A7F72]">
          <span>{mode === 'login' ? t.noAccount : t.hasAccount} </span>
          <Link
            href={mode === 'login' ? '/register' : '/login'}
            className="text-[#E8731A] font-bold hover:underline ml-1"
          >
            {mode === 'login' ? t.switchToRegister : t.switchToLogin}
          </Link>
        </div>
      </div>
    </div>
  );
}
