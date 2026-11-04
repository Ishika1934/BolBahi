'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Search, User as UserIcon, Phone, ChevronRight, X, Edit3, Check, Save } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface CustomerItem {
  id: string;
  name: string;
  aliases: string[];
  phone?: string;
  email?: string;
  balance: number;
}

interface CustomerLedgerData {
  customer: CustomerItem;
  entries: {
    id: string;
    type: 'udhaar' | 'payment';
    amount: number;
    note?: string;
    createdAt: string;
  }[];
}

interface CustomersPanelProps {
  onClose: () => void;
}

export function CustomersPanel({ onClose }: CustomersPanelProps) {
  const { language } = useAuth();
  const isEn = language === 'en-IN';

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLedgerData | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Edit customer state
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Add customer manual modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchCustomers = async (q: string = '') => {
    setLoading(true);
    const path = q.trim() ? `/api/customers?q=${encodeURIComponent(q.trim())}` : '/api/customers';
    const res = await apiFetch<CustomerItem[]>(path);
    if (res.ok && Array.isArray(res.data)) {
      setCustomers(res.data);
    }
    setLoading(false);
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    try {
      const res = await apiFetch('/api/demo/seed', { method: 'POST' });
      if (res.ok) {
        await fetchCustomers(search);
      }
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    fetchCustomers(search);
  }, [search]);

  const openCustomerLedger = async (customer: CustomerItem) => {
    setLedgerLoading(true);
    const res = await apiFetch<CustomerLedgerData>(`/api/customers/${customer.id}/entries`);
    if (res.ok) {
      setSelectedCustomer(res.data);
    }
    setLedgerLoading(false);
  };

  const handleStartEdit = (customer: CustomerItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCustomer(customer);
    setEditName(customer.name);
    setEditPhone(customer.phone || '');
    setEditEmail(customer.email || '');
    setEditAmount(customer.balance !== undefined ? customer.balance.toString() : '0');
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer || !editName.trim()) return;
    setEditSaving(true);
    setEditError(null);

    const parsedBalance = editAmount.trim() !== '' ? parseFloat(editAmount.trim()) : undefined;

    const res = await apiFetch<CustomerItem>(`/api/customers/${editingCustomer.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        balance: parsedBalance !== undefined && !isNaN(parsedBalance) ? parsedBalance : undefined,
      }),
    });

    if (res.ok) {
      const updated = res.data;
      setCustomers((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
      if (selectedCustomer && selectedCustomer.customer.id === updated.id) {
        setSelectedCustomer((prev) =>
          prev ? { ...prev, customer: { ...prev.customer, ...updated } } : null
        );
        // Refresh entries history if ledger modal is active
        openCustomerLedger(updated);
      }
      setEditingCustomer(null);
    } else {
      setEditError((res as any).error?.spokenMessage || (res as any).error?.message || 'Failed to update customer');
    }
    setEditSaving(false);
  };

  const handleCreateCustomer = async () => {
    if (!addName.trim()) return;
    setAddSaving(true);
    setAddError(null);

    const parsedBalance = addAmount.trim() !== '' ? parseFloat(addAmount.trim()) : undefined;

    const res = await apiFetch<CustomerItem>('/api/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: addName.trim(),
        phone: addPhone.trim() || undefined,
        email: addEmail.trim() || undefined,
        balance: parsedBalance !== undefined && !isNaN(parsedBalance) ? parsedBalance : undefined,
      }),
    });

    if (res.ok) {
      setShowAddModal(false);
      setAddName('');
      setAddPhone('');
      setAddEmail('');
      setAddAmount('');
      await fetchCustomers(search);
    } else {
      setAddError(
        (res as any).error?.message ||
        (isEn
          ? 'Customer with this name already exists. Please provide more details like surname or phone.'
          : 'इस नाम का ग्राहक पहले से मौजूद है। कृपया पूरा नाम या फोन नंबर दर्ज करें।')
      );
    }
    setAddSaving(false);
  };

  const totalOutstanding = customers.reduce(
    (acc, c) => (c.balance > 0 ? acc + c.balance : acc),
    0
  );

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
          <UserIcon className="w-5 h-5 text-[#E8731A]" />
          <span>{isEn ? 'Customer Ledgers' : 'ग्राहक खाते'}</span>
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
        {/* Total Outstanding Card */}
        <div className="glass-card p-4 mb-4 flex items-center justify-between border border-white/80 shadow-md">
          <div>
            <div className="text-xs font-semibold text-[#8A7F72]">
              {isEn ? 'Total Outstanding' : 'कुल बकाया उधारी'}
            </div>
            <div className="text-2xl font-bold text-[#C23B22] mt-0.5">
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-[#8A7F72]">
              {isEn ? 'Total Customers' : 'कुल ग्राहक खाते'}
            </div>
            <div className="text-lg font-bold text-[#1F1B16]">
              {customers.length} {isEn ? 'customers' : 'ग्राहक'}
            </div>
          </div>
        </div>

        {/* Search & Add Customer Bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8A7F72] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isEn ? 'Search customer name or phone...' : 'ग्राहक का नाम या फोन नंबर खोजें...'}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-[#E9E2D6] focus:border-[#E8731A] text-sm font-medium outline-none shadow-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setAddName('');
              setAddPhone('');
              setAddEmail('');
              setAddError(null);
              setShowAddModal(true);
            }}
            className="h-11 px-4 rounded-xl bg-[#E8731A] hover:bg-[#d66512] text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <span>+</span>
            <span>{isEn ? 'Add Customer' : 'नया ग्राहक'}</span>
          </button>
        </div>

        {/* Customers List */}
        <div className="flex-1 flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-16 text-[#8A7F72] text-sm font-medium">
              {isEn ? 'Loading customer accounts...' : 'ग्राहक खाते लोड हो रहे हैं...'}
            </div>
          ) : customers.length === 0 ? (
            <div className="glass-card p-8 text-center text-[#8A7F72]">
              <p className="font-bold text-base text-[#1F1B16]">
                {isEn ? 'No customer accounts found.' : 'कोई ग्राहक खाता नहीं मिला।'}
              </p>
              <p className="text-xs mt-1 mb-4">
                {isEn
                  ? 'Speak a command to add credit, or load sample kirana customers'
                  : 'उधारी जोड़ने के लिए बोलें या 10 सैंपल ग्राहक खाते लोड करें'}
              </p>
              <button
                type="button"
                onClick={handleSeedDemoData}
                disabled={seeding}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E8731A] text-white text-xs font-bold shadow-md hover:bg-[#d66512] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{seeding ? (isEn ? 'Loading sample data...' : 'डेटा लोड हो रहा है...') : (isEn ? '⚡ Load Sample Kirana Customers' : '⚡ 10 सैंपल ग्राहक लोड करें')}</span>
              </button>
            </div>
          ) : (
            customers.map((c) => (
              <div
                key={c.id}
                onClick={() => openCustomerLedger(c)}
                className="glass-card p-4 flex items-center justify-between border border-white hover:border-[#E8731A]/40 transition-all cursor-pointer group shadow-xs hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E8731A]/10 text-[#E8731A] font-bold flex items-center justify-center shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-[#1F1B16] group-hover:text-[#E8731A] transition-colors">
                        {c.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(c, e)}
                        title={isEn ? 'Edit customer details' : 'ग्राहक का विवरण सुधारें'}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FBF0D9] text-[#B7791F] hover:bg-[#E8731A] hover:text-white transition-all shadow-xs cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isEn ? 'Edit' : 'सुधारें'}</span>
                      </button>
                    </div>
                    <div className="text-xs text-[#8A7F72] flex items-center gap-2 mt-0.5">
                      {c.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{c.phone}</span>
                        </span>
                      ) : (
                        <span>{isEn ? 'No phone' : 'फोन नहीं'}</span>
                      )}
                      {c.aliases && c.aliases.length > 0 && (
                        <span className="text-[10px] text-[#8A7F72]/80">
                          ({isEn ? 'alias' : 'उपनाम'}: {c.aliases.join(', ')})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div
                      className={`text-base font-extrabold ${
                        c.balance > 0 ? 'text-[#C23B22]' : 'text-[#1F7A4D]'
                      }`}
                    >
                      ₹{c.balance.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] font-semibold text-[#8A7F72]">
                      {c.balance > 0 ? (isEn ? 'Due' : 'बाकी') : isEn ? 'Settled' : 'बेबाक'}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8A7F72] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Customer Detailed Ledger Modal Sheet */}
        {selectedCustomer && (
          <div
            className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-6"
            onClick={() => setSelectedCustomer(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg glass-strong p-6 rounded-3xl border border-white shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#E9E2D6] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[#1F1B16]">
                      {selectedCustomer.customer.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(selectedCustomer.customer)}
                      title={isEn ? 'Edit customer details' : 'ग्राहक का विवरण सुधारें'}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FBF0D9] text-[#B7791F] hover:bg-[#E8731A] hover:text-white transition-all shadow-xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Edit Details' : 'विवरण सुधारें'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-[#8A7F72]">
                    {selectedCustomer.customer.phone || (isEn ? 'No phone added' : 'फोन नंबर दर्ज नहीं')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#8A7F72] hover:text-[#1F1B16] shadow-xs cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Balance */}
              <div className="p-4 rounded-2xl bg-white border border-[#E9E2D6] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#8A7F72]">
                  {isEn ? 'Current Outstanding Balance' : 'वर्तमान कुल बकाया'}
                </span>
                <span
                  className={`text-2xl font-black ${
                    selectedCustomer.customer.balance > 0 ? 'text-[#C23B22]' : 'text-[#1F7A4D]'
                  }`}
                >
                  ₹{selectedCustomer.customer.balance.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Entries Feed */}
              <div className="flex flex-col gap-2">
                <div className="text-xs font-bold text-[#8A7F72] uppercase">
                  {isEn ? 'Transaction History' : 'लेन-देन इतिहास'} ({selectedCustomer.entries.length})
                </div>
                {selectedCustomer.entries.length === 0 ? (
                  <p className="text-sm text-[#8A7F72] text-center py-4">
                    {isEn ? 'No past entries found.' : 'कोई प्रविष्टि नहीं है।'}
                  </p>
                ) : (
                  selectedCustomer.entries.map((entry) => {
                    const isUdhaar = entry.type === 'udhaar';
                    const dateStr = new Date(entry.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={entry.id}
                        className="p-3 rounded-xl bg-white/80 border border-[#E9E2D6] flex items-center justify-between shadow-xs"
                      >
                        <div>
                          <div className="font-semibold text-sm text-[#1F1B16]">
                            {entry.note ||
                              (isUdhaar ? (isEn ? 'Credit' : 'उधार') : isEn ? 'Payment' : 'जमा')}
                          </div>
                          <div className="text-[11px] text-[#8A7F72]">{dateStr}</div>
                        </div>
                        <div
                          className={`font-bold text-base ${
                            isUdhaar ? 'text-[#C23B22]' : 'text-[#1F7A4D]'
                          }`}
                        >
                          {isUdhaar ? '-' : '+'}₹{entry.amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Customer Dialog Modal */}
        {editingCustomer && (
          <div
            className="fixed inset-0 z-70 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setEditingCustomer(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-[#E9E2D6] flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-[#E9E2D6] pb-3">
                <h3 className="text-lg font-bold text-[#1F1B16]">
                  {isEn ? 'Edit Customer Details' : 'ग्राहक का विवरण सुधारें'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="w-8 h-8 rounded-full bg-[#FBF7F0] flex items-center justify-center text-[#8A7F72] hover:text-[#1F1B16] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-[#FBE6E1] text-[#C23B22] text-xs font-bold">
                  {editError}
                </div>
              )}

              {/* Same name duplicate warning */}
              {customers.some(
                (c) =>
                  c.id !== editingCustomer.id &&
                  c.name.trim().toLowerCase() === editName.trim().toLowerCase()
              ) && (
                <div className="p-3 rounded-xl bg-[#FFF9E6] border border-[#B7791F]/40 text-xs text-[#B7791F] font-semibold">
                  {isEn
                    ? '⚠️ A customer with this exact name already exists. Please provide more details such as a surname, area, or phone number to distinguish them.'
                    : '⚠️ इस नाम का ग्राहक पहले से मौजूद है। पहचान के लिए कृपया उपनाम, इलाका या फोन नंबर जोड़ें।'}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F1B16] mb-1">
                    {isEn ? 'Customer Name *' : 'ग्राहक का नाम *'}
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={isEn ? 'e.g. Ramesh Gupta' : 'उदा. रमेश गुप्ता'}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#FBF7F0] border border-[#E9E2D6] focus:border-[#E8731A] text-sm font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1B16] mb-1">
                    {isEn ? 'Mobile Phone' : 'मोबाइल नंबर'}
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder={isEn ? 'e.g. 9876543210' : 'उदा. 9876543210'}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#FBF7F0] border border-[#E9E2D6] focus:border-[#E8731A] text-sm font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1B16] mb-1">
                    {isEn ? 'Email Address' : 'ईमेल पता'}
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder={isEn ? 'e.g. ramesh@kirana.com' : 'उदा. ramesh@kirana.com'}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#FBF7F0] border border-[#E9E2D6] focus:border-[#E8731A] text-sm font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1B16] mb-1">
                    {isEn ? 'Outstanding Balance Amount (₹) *' : 'उधारी राशि / हिसाब (₹) *'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-[#C23B22]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="0"
                      className="w-full h-11 pl-8 pr-3.5 rounded-xl bg-[#FBF7F0] border border-[#E9E2D6] focus:border-[#E8731A] text-sm font-black text-[#C23B22] outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-[#8A7F72] mt-1">
                    {isEn
                      ? 'Adjusting this manually records a balance entry in the customer ledger.'
                      : 'राशि बदलने पर खाते में स्वतः समायोजन प्रविष्टि दर्ज हो जाएगी।'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9E2D6]">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8A7F72] hover:bg-black/5 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'रद्द करें'}
                </button>
                <button
                  type="button"
                  disabled={editSaving || !editName.trim()}
                  onClick={handleSaveEdit}
                  className="px-5 py-2.5 rounded-xl bg-[#E8731A] hover:bg-[#d66512] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {editSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Save Changes' : 'बदलाव सहेजें'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Customer Manual Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 z-70 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-[#E9E2D6] flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-[#E9E2D6] pb-3">
                <h3 className="text-lg font-bold text-[#1F1B16]">
                  {isEn ? 'Add New Customer' : 'नया ग्राहक जोड़ें'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-[#FBF7F0] flex items-center justify-center text-[#8A7F72] hover:text-[#1F1B16] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {addError && (
                <div className="p-3 rounded-xl bg-[#FBE6E1] text-[#C23B22] text-xs font-bold">
                  {addError}
                </div>
              )}

              {/* Duplicate check warning */}
              {addName.trim() &&
                customers.some(
                  (c) => c.name.trim().toLowerCase() === addName.trim().toLowerCase()
                ) && (
                  <div className="p-3 rounded-xl bg-[#FFF9E6] border border-[#B7791F]/40 text-xs text-[#B7791F] font-semibold">
                    {isEn
                      ? `⚠️ A customer named "${addName.trim()}" already exists. Please provide more details such as their full name or phone number.`
                      : `⚠️ "${addName.trim()}" नाम का ग्राहक पहले से मौजूद है। कृपया पूरा नाम या फोन नंबर जैसे और विवरण बताएं।`}
                  </div>
                )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F1B16] mb-1">
                    {isEn ? 'Customer Name *' : 'ग्राहक का नाम *'}
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder={isEn ? 'e.g. Ramesh Kumar' : 'उदा. रमेश कुमार'}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#FBF7F0] border border-[#E9E2D6] focus:border-[#E8731A] text-sm font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1B16] mb-1">
                    {isEn ? 'Mobile Phone' : 'मोबाइल नंबर'}
                  </label>
                  <input
                    type="text"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder={isEn ? 'e.g. 9876543210' : 'उदा. 9876543210'}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#FBF7F0] border border-[#E9E2D6] focus:border-[#E8731A] text-sm font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1B16] mb-1">
                    {isEn ? 'Email Address' : 'ईमेल पता'}
                  </label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder={isEn ? 'e.g. ramesh@kirana.com' : 'उदा. ramesh@kirana.com'}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#FBF7F0] border border-[#E9E2D6] focus:border-[#E8731A] text-sm font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1B16] mb-1">
                    {isEn ? 'Opening Balance (₹) [Optional]' : 'शुरुआती उधारी / हिसाब (₹) [वैकल्पिक]'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-[#C23B22]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      placeholder="0"
                      className="w-full h-11 pl-8 pr-3.5 rounded-xl bg-[#FBF7F0] border border-[#E9E2D6] focus:border-[#E8731A] text-sm font-black text-[#C23B22] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9E2D6]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8A7F72] hover:bg-black/5 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'रद्द करें'}
                </button>
                <button
                  type="button"
                  disabled={addSaving || !addName.trim()}
                  onClick={handleCreateCustomer}
                  className="px-5 py-2.5 rounded-xl bg-[#E8731A] hover:bg-[#d66512] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {addSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Add Customer' : 'ग्राहक जोड़ें'}</span>
                    </>
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
