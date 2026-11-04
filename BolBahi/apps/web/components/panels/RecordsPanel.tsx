'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Search, Filter, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface LedgerRecord {
  id: string;
  type: 'udhaar' | 'payment';
  customerId: string;
  customerName: string;
  amount: number;
  note?: string;
  createdAt: string;
}

interface RecordsPanelProps {
  onClose: () => void;
}

export function RecordsPanel({ onClose }: RecordsPanelProps) {
  const { language } = useAuth();
  const isEn = language === 'en-IN';

  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'udhaar' | 'payment'>('all');
  const [search, setSearch] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    let res = await apiFetch<LedgerRecord[]>('/api/entries');
    if (!res.ok || !Array.isArray(res.data)) {
      res = await apiFetch<LedgerRecord[]>('/api/records');
    }
    if (res.ok && Array.isArray(res.data)) {
      setRecords(res.data);
    }
    setLoading(false);
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    try {
      const res = await apiFetch('/api/demo/seed', { method: 'POST' });
      if (res.ok) {
        await fetchRecords();
      }
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filtered = records.filter((r) => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.customerName.toLowerCase().includes(q) ||
        (r.note && r.note.toLowerCase().includes(q))
      );
    }
    return true;
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
          <ArrowDownLeft className="w-5 h-5 text-[#1F7A4D]" />
          <span>{isEn ? 'Ledger Records' : 'खाता प्रविष्टियां'}</span>
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
        {/* Controls Bar: Filter tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          {/* Tabs */}
          <div className="flex items-center bg-white/90 p-1 rounded-full border border-[#E9E2D6] shadow-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#1F1B16] text-white shadow-xs'
                  : 'text-[#8A7F72] hover:text-[#1F1B16]'
              }`}
            >
              {isEn ? 'All' : 'सभी'} ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('udhaar')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterType === 'udhaar'
                  ? 'bg-[#C23B22] text-white shadow-xs'
                  : 'text-[#8A7F72] hover:text-[#C23B22]'
              }`}
            >
              {isEn ? 'Credit Given' : 'उधारी'}
            </button>
            <button
              type="button"
              onClick={() => setFilterType('payment')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterType === 'payment'
                  ? 'bg-[#1F7A4D] text-white shadow-xs'
                  : 'text-[#8A7F72] hover:text-[#1F7A4D]'
              }`}
            >
              {isEn ? 'Cash Received' : 'जमा'}
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-[#8A7F72] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isEn ? 'Search name or item...' : 'ग्राहक या सामान खोजें...'}
              className="w-full h-10 pl-9 pr-4 rounded-full bg-white border border-[#E9E2D6] focus:border-[#E8731A] text-xs font-medium outline-none shadow-xs"
            />
          </div>
        </div>

        {/* Records List */}
        <div className="flex-1 flex flex-col gap-2.5">
          {loading ? (
            <div className="text-center py-16 text-[#8A7F72] text-sm font-medium">
              {isEn ? 'Loading records...' : 'प्रविष्टियां लोड हो रही हैं...'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-8 text-center text-[#8A7F72]">
              <p className="font-bold text-base text-[#1F1B16]">
                {isEn ? 'No ledger records found.' : 'कोई प्रविष्टि नहीं मिली।'}
              </p>
              <p className="text-xs mt-1 mb-4">
                {isEn ? 'Speak a voice command or load sample kirana records' : 'उधार या जमा दर्ज करने के लिए बोलें या सैंपल रिकॉर्ड लोड करें'}
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
            filtered.map((record) => {
              const isUdhaar = record.type === 'udhaar';
              const dateStr = new Date(record.createdAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={record.id}
                  className="glass-card p-4 flex items-center justify-between border border-white shadow-xs hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isUdhaar
                          ? 'bg-[#FBE6E1] text-[#C23B22]'
                          : 'bg-[#E2F3E9] text-[#1F7A4D]'
                      }`}
                    >
                      {isUdhaar ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-base text-[#1F1B16]">
                        {record.customerName}
                      </div>
                      <div className="text-xs text-[#8A7F72] flex items-center gap-2 mt-0.5">
                        <span>{dateStr}</span>
                        {record.note && (
                          <span className="bg-black/5 px-2 py-0.5 rounded-md text-[11px] text-[#1F1B16] font-medium">
                            {record.note}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-lg font-black ${
                        isUdhaar ? 'text-[#C23B22]' : 'text-[#1F7A4D]'
                      }`}
                    >
                      {isUdhaar ? '-' : '+'}₹{record.amount.toLocaleString('en-IN')}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isUdhaar
                          ? 'bg-[#FBE6E1] text-[#C23B22]'
                          : 'bg-[#E2F3E9] text-[#1F7A4D]'
                      }`}
                    >
                      {isUdhaar ? (isEn ? 'Credit' : 'उधार') : isEn ? 'Cash' : 'जमा'}
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
