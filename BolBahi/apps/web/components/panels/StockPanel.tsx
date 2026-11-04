'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Package, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface LowStockItem {
  id: string;
  item: string;
  qty: number;
  unit: string;
  threshold: number;
  updatedAt: string;
}

interface StockPanelProps {
  onClose: () => void;
}

export function StockPanel({ onClose }: StockPanelProps) {
  const { language } = useAuth();
  const isEn = language === 'en-IN';

  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    const res = await apiFetch<LowStockItem[]>('/api/stock/low');
    if (res.ok) {
      setItems(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

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
          <Package className="w-5 h-5 text-[#B7791F]" />
          <span>{isEn ? 'Stock Alerts' : 'स्टॉक अलर्ट'}</span>
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
        {/* Summary Card */}
        <div className="glass-card p-4 mb-4 flex items-center justify-between border border-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FBF0D9] text-[#B7791F] flex items-center justify-center font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#8A7F72] uppercase tracking-wider">
                {isEn ? 'Low Stock Count' : 'कम स्टॉक वाली वस्तुएं'}
              </div>
              <div className="text-2xl font-black text-[#B7791F] mt-0.5">
                {items.length} {isEn ? 'items running low' : 'वस्तुएं कम हैं'}
              </div>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 flex flex-col gap-2.5">
          {loading ? (
            <div className="text-center py-16 text-[#8A7F72] text-sm font-medium">
              {isEn ? 'Loading stock alerts...' : 'स्टॉक अलर्ट लोड हो रहे हैं...'}
            </div>
          ) : items.length === 0 ? (
            <div className="glass-card p-8 text-center text-[#8A7F72]">
              <CheckCircle2 className="w-10 h-10 text-[#1F7A4D] mx-auto mb-2 opacity-80" />
              <p className="font-bold text-base text-[#1F1B16]">
                {isEn ? 'All items in healthy stock!' : 'दुकान में सभी सामान पर्याप्त है!'}
              </p>
              <p className="text-xs mt-1">
                {isEn
                  ? 'Say: "Tata salt 5 packets left" to record low stock'
                  : 'बोलें: "टाटा नमक 5 पैकेट बचा है"'}
              </p>
            </div>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className="glass-card p-4 flex items-center justify-between border border-white shadow-xs hover:shadow-md transition-all"
              >
                <div>
                  <div className="font-bold text-base text-[#1F1B16]">{it.item}</div>
                  <div className="text-xs text-[#8A7F72] mt-0.5">
                    {isEn ? 'Minimum threshold:' : 'न्यूनतम सीमा:'} {it.threshold} {it.unit}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-[#C23B22]">
                    {it.qty} {it.unit}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FBE6E1] text-[#C23B22] uppercase">
                    {isEn ? 'Low Stock' : 'स्टॉक कम'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
