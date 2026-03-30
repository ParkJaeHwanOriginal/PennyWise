"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Edit2, ChevronRight, Wallet, Landmark, Plus, Check, Lock, Unlock, Trash2, RefreshCcw, PieChartIcon, BookOpen, ChevronLeft, GripVertical, Pencil, Calculator, X, Calendar, Delete, StickyNote, Minimize2, Save } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from 'recharts';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const BANKS = ['농협', '카카오페이', 'KB국민', '네이버페이', 'KB증권', '신한', '우리', '하나', '기타'];

const formatDate = (date: Date) => `${date.getFullYear().toString().slice(2)}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;

const getDbDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getMonthString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const getAccountName = (key: string) => {
  const map: Record<string, string> = { isa: 'ISA (증권)', kb_bank: 'KB국민', nonghyup: '농협', kakao: '카카오', naver: '네이버', cash: '현금', kb_pointree: 'KB 포인트리', card_bill: '이번달 카드값' };
  return map[key] || key;
};

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);
  
  // --- Auth & Splash States ---
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'budget'>('dashboard');
  
  // --- Dates ---
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [budgetMonthStr, setBudgetMonthStr] = useState(() => getMonthString(new Date()));
  
  // --- Dashboard states ---
  const [details, setDetails] = useState({ assets: [] as any[], liabilities: [] as any[] });
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [pendingChanges, setPendingChanges] = useState<any[]>([]); 
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [showIsaProfit, setShowIsaProfit] = useState(true); 
  
  // --- Ledger states ---
  const [ledger, setLedger] = useState<any>({ isa: 0, isa_profit: 0, isa_deposit: 0, card_bill: 0, kb_bank: 0, nonghyup: 0, kakao: 0, naver: 0, cash: 0, kb_pointree: 0 });
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>('');
  
  // --- Ledger Form states ---
  const [txType, setTxType] = useState<'+' | '-'>('-');
  const [txAmount, setTxAmount] = useState('');
  const [txItemName, setTxItemName] = useState('');
  const [editingTx, setEditingTx] = useState<any>(null); 
  const [dailyTransactions, setDailyTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]); 

  // --- Budget states ---
  const [budget, setBudget] = useState({ income: 0, savings: 0 });
  const [fixedExpenses, setFixedExpenses] = useState<any[]>([]);

  // --- [NEW] Memo States ---
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [memoContent, setMemoContent] = useState("");
  const [isMemoSaving, setIsMemoSaving] = useState(false);
  
  // --- Common states ---
  const [loading, setLoading] = useState(true);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isAtTopOnStart = useRef(false);
  const [isChartVisible, setIsChartVisible] = useState(true);

  // Initial Render Refs (To prevent double fetching on mount)
  const isFirstRender = useRef(true);
  const isFirstBudgetRender = useRef(true);

  // --- Data Fetching Logic ---
  const fetchMemo = async () => {
    const { data } = await supabase.from('app_memo').select('content').eq('id', 1).single();
    if (data) setMemoContent(data.content);
  };

  const saveMemo = async () => {
    setIsMemoSaving(true);
    await supabase.from('app_memo').upsert({ id: 1, content: memoContent, updated_at: new Date() });
    setTimeout(() => setIsMemoSaving(false), 500); // 로딩 피드백용 약간의 지연
  };

  const fetchMainData = async () => {
    setLoading(true);
    const dbDate = getDbDateString(currentDate);

    // 1. Asset Data
    const { data: assetData } = await supabase.from('assets').select('*');
    if (assetData) {
      const sortByAmount = (a: any, b: any) => b.amount - a.amount;
      setDetails({ assets: assetData.filter(item => item.type === '자산').sort(sortByAmount), liabilities: assetData.filter(item => item.type === '부채').sort(sortByAmount) });
      setPendingChanges([]); setPendingDeletes([]);
    }

    // 2. Ledger Data
    const { data: ledgerData } = await supabase.from('daily_ledger').select('*').eq('date', dbDate).single();
    
    if (ledgerData) {
      setLedger(ledgerData);
    } else {
      const { data: lastData } = await supabase
        .from('daily_ledger')
        .select('*')
        .lt('date', dbDate)
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      if (lastData) {
        setLedger({ ...lastData, date: dbDate, isa_profit: 0, isa_deposit: 0 });
      } else {
        setLedger({ date: dbDate, isa: 0, isa_profit: 0, isa_deposit: 0, card_bill: 0, kb_bank: 0, nonghyup: 0, kakao: 0, naver: 0, cash: 0, kb_pointree: 0 });
      }
    }

    // 3. Transactions
    const { data: txData } = await supabase.from('ledger_transactions').select('*').eq('date', dbDate).order('sort_order', { ascending: true });
    setDailyTransactions(txData || []);

    // 4. Chart Data
    const { data: historyData } = await supabase.from('daily_ledger').select('date, kb_bank, cash, card_bill').lte('date', dbDate).order('date', { ascending: false }).limit(10);
    if (historyData) {
      setChartData(historyData.reverse().map(d => ({ name: d.date.split('-')[2] + '일', value: (d.kb_bank || 0) + (d.cash || 0) - (d.card_bill || 0) })));
    }

    setLoading(false);
    setTimeout(() => { setIsRefreshing(false); setPullDistance(0); }, 400); 
  };

  const fetchBudgetData = async () => {
    const { data: budgetData } = await supabase.from('monthly_budget').select('*').eq('month', budgetMonthStr).single();
    if (budgetData) {
      setBudget({ income: budgetData.income, savings: budgetData.savings });
    } else {
      const initialBudget = { income: 0, savings: 0 };
      setBudget(initialBudget);
      await supabase.from('monthly_budget').insert([{ month: budgetMonthStr, ...initialBudget }]);
    }
    const { data: expensesData } = await supabase.from('fixed_expenses').select('*').eq('month', budgetMonthStr).order('sort_order', { ascending: true });
    setFixedExpenses(expensesData || []);
  };

  // --- App Initialization & Splash Screen ---
  useEffect(() => {
    setIsMounted(true);
    
    // 최소 1.5초 대기 + 데이터(자산, 가계부, 예산, 메모) 로딩 병렬 처리
    const initApp = async () => {
      const minSplashTime = new Promise(resolve => setTimeout(resolve, 1500));
      await Promise.all([fetchMainData(), fetchBudgetData(), fetchMemo(), minSplashTime]);
      setShowSplash(false);
    };
    initApp();

    const handleScroll = () => setIsChartVisible(window.scrollY < 150);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 날짜/달 변경 시 리렌더링 방어 로직
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchMainData();
  }, [currentDate]);

  useEffect(() => {
    if (isFirstBudgetRender.current) { isFirstBudgetRender.current = false; return; }
    fetchBudgetData();
  }, [budgetMonthStr]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditMode) return; 
    if (window.scrollY <= 0) { isAtTopOnStart.current = true; startY.current = e.touches[0].pageY; } else { isAtTopOnStart.current = false; }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isEditMode || !isAtTopOnStart.current) return;
    const diff = e.touches[0].pageY - startY.current;
    if (window.scrollY <= 0 && diff > 0) setPullDistance(Math.min(diff * 0.4, 100));
  };
  const handleTouchEnd = () => {
    if (isEditMode || !isAtTopOnStart.current) return;
    if (pullDistance > 60) { setIsRefreshing(true); setPullDistance(60); fetchMainData(); fetchBudgetData(); fetchMemo(); } else { setPullDistance(0); }
    isAtTopOnStart.current = false;
  };

  // --- PIN Pad Logic ---
  const handlePinClick = (num: string) => {
    if (pinCode.length < 4) {
      const newPin = pinCode + num;
      setPinCode(newPin);
      if (newPin.length === 4) {
        if (newPin === "0519") {
          setTimeout(() => setIsAuthenticated(true), 200);
        } else {
          setPinError(true);
          setTimeout(() => { setPinCode(""); setPinError(false); }, 500);
        }
      }
    }
  };

  const handlePinDelete = () => {
    if (pinCode.length > 0) setPinCode(prev => prev.slice(0, -1));
  };

  // --- Calculations ---
  const isaBase = ledger.isa || 0; 
  const isaDeposit = ledger.isa_deposit || 0; 
  const isaProfit = ledger.isa_profit || 0; 

  const isaPrincipal = isaBase + isaDeposit; 
  const isaTotal = isaPrincipal + isaProfit; 

  const totalAssets = details.assets.reduce((acc, cur) => {
    if (cur.name.toUpperCase() === 'ISA') return acc + isaTotal; 
    return acc + cur.amount;
  }, 0);
  const totalLiabilities = details.liabilities.reduce((acc, cur) => acc + cur.amount, 0);
  const totalData = [{ name: '자산', value: totalAssets || 1, color: '#2563eb' }, { name: '부채', value: totalLiabilities || 0.1, color: '#dc2626' }];

  const totalFixedExpenses = fixedExpenses.reduce((acc, exp) => acc + exp.amount, 0);
  const budgetSpareMoney = budget.income - budget.savings - totalFixedExpenses;
  const finalSpareMoney = (ledger.kb_bank || 0) + (ledger.cash || 0) - (ledger.card_bill || 0) + budgetSpareMoney;
  const isChartDataValid = chartData.some(d => d.value !== 0) || finalSpareMoney !== 0;

  // --- Budget Functions ---
  const handleUpdateBudget = async (field: 'income' | 'savings', value: number) => {
    const newBudget = { ...budget, [field]: value };
    setBudget(newBudget);
    await supabase.from('monthly_budget').upsert({ month: budgetMonthStr, ...newBudget });
  };

  const handleAddFixedExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newExpense = { month: budgetMonthStr, name: formData.get('name') as string, amount: Number(formData.get('amount')), sort_order: Date.now() };
    await supabase.from('fixed_expenses').insert([newExpense]);
    (e.target as HTMLFormElement).reset();
    fetchBudgetData(); 
  };

  const handleDeleteFixedExpense = async (id: string) => {
    if(!confirm("고정비용 항목을 삭제하시겠습니까?")) return;
    await supabase.from('fixed_expenses').delete().eq('id', id);
    fetchBudgetData();
  };

  const handleReorderFixedExpenses = async (newOrder: any[]) => {
    setFixedExpenses(newOrder);
    for (let i = 0; i < newOrder.length; i++) await supabase.from('fixed_expenses').update({ sort_order: i }).eq('id', newOrder[i].id);
  };

  // --- Ledger Functions ---
  const updateLedgerDirect = async (field: string, value: number) => {
    const newLedger = { ...ledger, [field]: value, date: getDbDateString(currentDate) };
    setLedger(newLedger);
    await supabase.from('daily_ledger').upsert(newLedger);
    if (['kb_bank', 'cash', 'card_bill'].includes(field)) fetchMainData();
  };

  const openLedgerModal = (accountKey: string) => {
    setSelectedLedgerAccount(accountKey);
    setTxType(accountKey === 'card_bill' ? '+' : '-');
    setIsLedgerModalOpen(true);
  };

  const closeLedgerModal = () => {
    setIsLedgerModalOpen(false);
    setEditingTx(null);
    setTxAmount(''); setTxItemName(''); setTxType('-');
  };

  const handleLedgerTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amountNum = Number(txAmount);
    
    let finalAmount = 0;
    if (selectedLedgerAccount === 'card_bill') finalAmount = amountNum; 
    else finalAmount = txType === '+' ? amountNum : -amountNum;
    
    if (editingTx) {
      const oldFinalAmount = selectedLedgerAccount === 'card_bill' ? editingTx.amount : (editingTx.type === '+' ? editingTx.amount : -editingTx.amount);
      const diff = finalAmount - oldFinalAmount;
      const newBalance = (ledger[selectedLedgerAccount] || 0) + diff;
      
      await updateLedgerDirect(selectedLedgerAccount, newBalance);
      await supabase.from('ledger_transactions').update({ item_name: txItemName, amount: amountNum, type: txType }).eq('id', editingTx.id);
      setEditingTx(null);
    } else {
      const newBalance = (ledger[selectedLedgerAccount] || 0) + finalAmount;
      await updateLedgerDirect(selectedLedgerAccount, newBalance);
      await supabase.from('ledger_transactions').insert([{ date: getDbDateString(currentDate), account: selectedLedgerAccount, item_name: txItemName, amount: amountNum, type: txType, sort_order: Date.now() }]);
    }
    setTxAmount(''); setTxItemName(''); fetchMainData();
  };

  const deleteTransaction = async (tx: any) => {
    if (!confirm(`'${tx.item_name}' 내역을 삭제할까요?`)) return;
    let revertAmount = 0;
    if (selectedLedgerAccount === 'card_bill') revertAmount = -tx.amount;
    else revertAmount = tx.type === '+' ? -tx.amount : tx.amount;
    
    const newBalance = (ledger[selectedLedgerAccount] || 0) + revertAmount;
    await updateLedgerDirect(selectedLedgerAccount, newBalance);
    await supabase.from('ledger_transactions').delete().eq('id', tx.id);
    fetchMainData();
  };

  const startEditTx = (tx: any) => {
    setEditingTx(tx); setTxType(tx.type); setTxAmount(tx.amount.toString()); setTxItemName(tx.item_name);
  };

  const handleReorder = async (newOrder: any[]) => {
    const otherTx = dailyTransactions.filter(tx => tx.account !== selectedLedgerAccount);
    setDailyTransactions([...otherTx, ...newOrder]);
    for (let i = 0; i < newOrder.length; i++) await supabase.from('ledger_transactions').update({ sort_order: i }).eq('id', newOrder[i].id);
  };

  // --- Dashboard Functions ---
  const commitChanges = async () => {
    setLoading(true);
    if (pendingDeletes.length > 0) await supabase.from('assets').delete().in('id', pendingDeletes);
    for (const item of pendingChanges) {
      const { isNew, id, ...dbItem } = item;
      if (isNew) await supabase.from('assets').insert([dbItem]); else await supabase.from('assets').update(dbItem).eq('id', id);
    }
    setIsEditMode(false); await fetchMainData();
  };

  const handleTempSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const itemData = { id: selectedItem?.id || `temp-${Date.now()}`, name: formData.get('name') as string, bank: formData.get('bank') as string || '기타', amount: Math.max(0, Number(formData.get('amount'))), type: formData.get('type') as string, memo: formData.get('memo') as string, isNew: selectedItem?.isNew || false };
    const filterOut = (list: any[]) => list.filter(i => i.id !== itemData.id);
    const newAssets = itemData.type === '자산' ? [...filterOut(details.assets), itemData] : filterOut(details.assets);
    const newLiabilities = itemData.type === '부채' ? [...filterOut(details.liabilities), itemData] : filterOut(details.liabilities);
    setDetails({ assets: newAssets.sort((a, b) => b.amount - a.amount), liabilities: newLiabilities.sort((a, b) => b.amount - a.amount) });
    setPendingChanges(prev => [...prev.filter(i => i.id !== itemData.id), itemData]);
    setIsModalOpen(false);
  };

  const handleTempDelete = (id: any) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setDetails({ assets: details.assets.filter(i => i.id !== id), liabilities: details.liabilities.filter(i => i.id !== id) });
    if (!String(id).startsWith('temp-')) setPendingDeletes(prev => [...prev, id]);
    setPendingChanges(prev => prev.filter(i => i.id !== id));
    setIsModalOpen(false);
  };

  if (!isMounted) return null;

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.6 }} className="fixed inset-0 z-[9999] bg-blue-600 flex flex-col items-center justify-center text-white">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-white/20 rounded-3xl backdrop-blur-md flex items-center justify-center mb-6"><Wallet size={40} /></div>
              <h1 className="text-4xl font-black italic tracking-tighter mb-2">PennyWise</h1>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isAuthenticated ? (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white pb-20 relative z-[9000]">
          <div className="mb-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6"><Lock size={32} className="text-blue-400" /></div>
            <h2 className="text-sm font-bold tracking-[0.3em] text-slate-400 uppercase">Enter PIN Code</h2>
          </div>
          <motion.div animate={pinError ? { x: [-10, 10, -10, 10, 0] } : {}} className="flex gap-6 mb-16">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 ${pinCode.length > i ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`} />
            ))}
          </motion.div>
          <div className="grid grid-cols-3 gap-x-10 gap-y-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button key={num} onClick={() => handlePinClick(num.toString())} className="w-20 h-20 rounded-full bg-slate-800 text-3xl font-bold active:scale-95 transition-all flex items-center justify-center">{num}</button>
            ))}
            <div />
            <button onClick={() => handlePinClick('0')} className="w-20 h-20 rounded-full bg-slate-800 text-3xl font-bold active:scale-95 flex items-center justify-center">0</button>
            <button onClick={handlePinDelete} className="w-20 h-20 flex items-center justify-center text-slate-400"><Delete size={28} /></button>
          </div>
        </div>
      ) : (
        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden pb-24 relative">
          
          {/* ==================== [NEW] Floating Memo Widget ==================== */}
          <div className="fixed top-4 right-4 z-[500] flex flex-col items-end">
            <button 
              onClick={() => setIsMemoOpen(!isMemoOpen)}
              className={`p-3 rounded-2xl shadow-xl transition-all active:scale-90 ${isMemoOpen ? 'bg-slate-900 text-white' : 'bg-white text-blue-600'}`}
            >
              {isMemoOpen ? <Minimize2 size={22} /> : <StickyNote size={22} />}
            </button>
            
            <AnimatePresence>
              {isMemoOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: -20, transformOrigin: 'top right' }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  className="mt-3 w-[280px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
                >
                  <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-b">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Memo</span>
                    <button onClick={saveMemo} className="text-blue-600 active:scale-90 transition-transform">
                      {isMemoSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                  </div>
                  <textarea 
                    value={memoContent}
                    onChange={(e) => setMemoContent(e.target.value)}
                    placeholder="여기에 자유롭게 메모하세요..."
                    className="w-full h-[220px] p-4 text-sm font-bold outline-none resize-none bg-white text-slate-700 leading-relaxed"
                  />
                  <div className="px-4 py-2 bg-slate-50 text-[9px] text-slate-400 font-bold text-center">
                    우측 상단의 저장 아이콘을 눌러주세요
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* ==================================================================== */}

          <div className="fixed left-0 w-full flex justify-center items-end z-[140] pointer-events-none" style={{ top: 'calc(60px + env(safe-area-inset-top))', height: 60, opacity: pullDistance > 0 || isRefreshing ? 1 : 0, transform: `translateY(${Math.min(pullDistance - 60, 0)}px)`, transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease, opacity 0.3s' : 'none' }}>
            <div className="flex flex-col items-center gap-1 opacity-80 pb-2"><RefreshCcw size={20} className={`text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDistance * 3}deg)` }} /></div>
          </div>

          <header className="fixed top-0 left-0 w-full bg-white/95 backdrop-blur-md border-b z-[150] flex flex-col shadow-sm">
            <div className="h-[calc(60px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] px-4 flex justify-center items-center w-full">
              <h1 className="text-xl font-black tracking-tighter text-blue-600 italic mr-auto ml-4">PennyWise</h1>
            </div>
            <div className="overflow-hidden bg-slate-50/90 border-t border-slate-100" style={{ maxHeight: isChartVisible || activeTab !== 'dashboard' ? 0 : '40px', opacity: isChartVisible || activeTab !== 'dashboard' ? 0 : 1, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
              <div className="px-4 py-2.5 flex justify-center gap-6 text-[11px] font-black tracking-tight">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /><span className="text-slate-400 uppercase">Assets</span><span className="text-blue-700">{(totalAssets / 10000).toLocaleString()}만</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-600" /><span className="text-slate-400 uppercase">Debt</span><span className="text-red-700">{(totalLiabilities / 10000).toLocaleString()}만</span></div>
              </div>
            </div>
          </header>

          <main className="px-5 max-w-md mx-auto relative z-10" style={{ paddingTop: 'calc(75px + env(safe-area-inset-top))', transform: `translateY(${pullDistance}px)`, transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none' }}>
            
            {/* --- TAB 1: Dashboard --- */}
            {activeTab === 'dashboard' && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 mb-6 relative">
                  <div className="flex items-center justify-between h-40">
                    {loading ? <div className="w-full text-center text-slate-200 italic font-bold">Syncing...</div> : (
                      <>
                        <div className="relative w-3/5 h-full">
                          <ResponsiveContainer><PieChart><Pie data={totalData} innerRadius={55} outerRadius={75} paddingAngle={6} dataKey="value" stroke="none">{totalData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}</Pie></PieChart></ResponsiveContainer>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <p className="text-red-600 text-lg font-black leading-tight">{Math.round((totalLiabilities / (totalAssets + totalLiabilities || 1)) * 100)}%</p>
                          </div>
                        </div>
                        <div className="w-2/5 flex flex-col gap-3 pl-4 border-l font-black text-sm text-center">
                          <div><p className="text-[10px] text-slate-400 uppercase tracking-tighter">Assets</p><p>{(totalAssets / 10000).toLocaleString()}만</p></div>
                          <div><p className="text-[10px] text-slate-400 uppercase tracking-tighter">Debt</p><p>{(totalLiabilities / 10000).toLocaleString()}만</p></div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-4 bg-blue-50/50 rounded-2xl p-4 flex justify-between items-center border border-blue-100/50">
                    <span className="text-xs font-black text-blue-600 tracking-tighter">총자산규모 (자산+부채)</span>
                    <span className="text-xl font-black text-slate-800">{(totalAssets + totalLiabilities).toLocaleString()}원</span>
                  </div>
                </section>

                <div className="space-y-6">
                  {[ { title: '자산 내역', data: details.assets, icon: <Wallet size={16}/>, color: 'blue' }, { title: '부채 내역', data: details.liabilities, icon: <Landmark size={16}/>, color: 'red' } ].map((sec) => (
                    <div key={sec.title}>
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2"><div className={`p-1.5 rounded-lg ${sec.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>{sec.icon}</div><h3 className="font-black text-lg italic">{sec.title}</h3></div>
                        {isEditMode && <button onClick={() => { setSelectedItem({ type: sec.title.includes('자산') ? '자산' : '부채', isNew: true }); setIsModalOpen(true); }} className={`p-1.5 rounded-full shadow-md active:scale-90 transition-all ${sec.color === 'blue' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}><Plus size={16}/></button>}
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        {sec.data.length === 0 ? <div className="p-8 text-center text-slate-300 font-bold text-xs italic">Empty</div> : sec.data.map(item => {
                          const isISA = item.name.toUpperCase() === 'ISA';
                          const displayAmount = isISA ? (showIsaProfit ? isaTotal : isaPrincipal) : item.amount;
                          
                          return (
                            <div key={item.id} onClick={() => { setSelectedItem(item); setIsModalOpen(true); }} className={`flex justify-between items-center p-4 border-b last:border-0 border-slate-50 ${isEditMode ? 'bg-blue-50/20 active:bg-blue-100' : 'active:bg-slate-50'}`}>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400">{item.bank || '기타'}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm">{item.name}</span>
                                  {isISA && (
                                    <button onClick={(e) => { e.stopPropagation(); setShowIsaProfit(!showIsaProfit); }} className="active:scale-95 transition-transform">
                                      {showIsaProfit ? <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded shadow-sm font-bold border border-blue-200">수익 포함</span> : <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shadow-sm font-bold border border-slate-200">원금만</span>}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2"><span className="font-black text-base">{displayAmount.toLocaleString()}원</span>{isEditMode && <ChevronRight size={14} className="text-blue-400" />}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* --- TAB 2: Ledger --- */}
            {activeTab === 'ledger' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                  <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)))} className="p-2 active:bg-slate-100 rounded-full"><ChevronLeft size={20}/></button>
                  <h2 className="font-black text-slate-800 tracking-tighter">{formatDate(currentDate)}</h2>
                  <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)))} className="p-2 active:bg-slate-100 rounded-full"><ChevronRight size={20}/></button>
                </div>

                <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 relative h-[220px] flex flex-col overflow-hidden">
                  <div className="flex justify-between items-end mb-2 relative z-10">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-tighter">최종 여윳돈 흐름</h3>
                    <p className="text-xl font-black text-blue-600">{finalSpareMoney.toLocaleString()}원</p>
                  </div>
                  <div className="flex-1 -ml-6 -mb-2 relative">
                    {isChartDataValid ? (
                      <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><XAxis dataKey="name" hide /><Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}/><Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"><BookOpen size={24} className="text-slate-200" /><p className="text-slate-400 font-bold text-xs tracking-tighter">가계부를 작성해 주세요</p></div>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="font-black text-lg italic mb-3 px-1 text-slate-700">증권</h3>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div onClick={() => openLedgerModal('isa')} className="flex justify-between items-center p-4 active:bg-slate-50 transition-colors cursor-pointer">
                      <span className="font-bold text-sm text-slate-600">ISA</span>
                      <div className="flex items-center gap-2"><span className="font-black text-slate-800">{isaTotal.toLocaleString()}원</span><ChevronRight size={14} className="text-slate-300" /></div>
                    </div>
                  </div>
                </section>

                {[
                  { title: '은행', keys: [{k: 'kb_bank', n: 'KB국민'}, {k: 'nonghyup', n: '농협'}, {k: 'kakao', n: '카카오'}, {k: 'naver', n: '네이버'}] },
                  { title: '현금', keys: [{k: 'cash', n: '현금'}] },
                  { title: '기타', keys: [{k: 'kb_pointree', n: 'KB 포인트리'}] }
                ].map(sec => (
                  <section key={sec.title}>
                    <h3 className="font-black text-lg italic mb-3 px-1 text-slate-700">{sec.title}</h3>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      {sec.keys.map(item => (
                        <div key={item.k} onClick={() => openLedgerModal(item.k)} className="flex justify-between items-center p-4 border-b last:border-0 border-slate-50 active:bg-slate-50 transition-colors cursor-pointer">
                          <span className="font-bold text-sm text-slate-600">{item.n}</span>
                          <div className="flex items-center gap-2"><span className="font-black text-slate-800">{ledger[item.k]?.toLocaleString()}원</span><ChevronRight size={14} className="text-slate-300" /></div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

                <section>
                  <h3 className="font-black text-lg italic mb-3 px-1 text-red-600">카드결제 예정</h3>
                  <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                    <div onClick={() => openLedgerModal('card_bill')} className="flex justify-between items-center p-4 active:bg-red-50 transition-colors cursor-pointer">
                      <span className="font-bold text-sm text-slate-600">이번달 카드값</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-red-600">{ledger.card_bill?.toLocaleString() || 0}원</span>
                        <ChevronRight size={14} className="text-red-300" />
                      </div>
                    </div>
                  </div>
                </section>
                <div className="h-10"></div>
              </motion.div>
            )}

            {/* --- TAB 3: Budget --- */}
            {activeTab === 'budget' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                
                <div className="flex justify-center items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 relative">
                  <h2 className="font-black text-blue-600 text-lg tracking-tighter uppercase">{budgetMonthStr.split('-')[0]}년 {budgetMonthStr.split('-')[1]}월 예산 계획</h2>
                  <div className="absolute right-4 flex items-center justify-center p-2 bg-slate-50 rounded-full hover:bg-blue-50 transition-colors cursor-pointer">
                    <input type="month" value={budgetMonthStr} onChange={(e) => setBudgetMonthStr(e.target.value)} className="opacity-0 absolute inset-0 w-full h-full z-10 cursor-pointer" />
                    <Calendar size={18} className="text-blue-600" />
                  </div>
                </div>

                <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-4 relative border border-blue-100 flex justify-between items-center mb-2">
                   <div>
                     <span className="text-xs font-black text-blue-800 tracking-tighter block">이번 달 예산 잔여금</span>
                     <span className="text-[9px] text-blue-500 font-bold tracking-tight">가계부의 '최종 여윳돈'에 합산됨</span>
                   </div>
                   <span className="text-2xl font-black text-blue-600">{budgetSpareMoney.toLocaleString()}원</span>
                </section>

                <section className="space-y-4">
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-tighter block mb-2">월급 (총 수입)</label>
                    <div className="flex items-center gap-2 border-b pb-2">
                      <input type="number" value={budget.income || ''} onChange={(e) => handleUpdateBudget('income', Number(e.target.value))} placeholder="0" className="flex-1 bg-transparent text-2xl font-black text-slate-800 outline-none" />
                      <span className="font-black text-slate-400">원</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-tighter block mb-2">목표 저금액</label>
                    <div className="flex items-center gap-2 border-b pb-2">
                      <input type="number" value={budget.savings || ''} onChange={(e) => handleUpdateBudget('savings', Number(e.target.value))} placeholder="0" className="flex-1 bg-transparent text-2xl font-black text-blue-600 outline-none" />
                      <span className="font-black text-slate-400">원</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="font-black text-lg italic mb-3 px-1 text-slate-700">고정비용</h3>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 bg-slate-50 border-b border-slate-100">
                      <form onSubmit={handleAddFixedExpense} className="flex gap-2">
                        <input name="name" required placeholder="항목 (예: 통신비)" className="flex-1 p-3 rounded-xl border border-slate-200 text-sm font-bold min-w-0 outline-none focus:border-blue-400" />
                        <input name="amount" required type="number" placeholder="금액" className="w-24 p-3 rounded-xl border border-slate-200 text-sm font-bold min-w-0 outline-none focus:border-blue-400" />
                        <button type="submit" className="bg-slate-900 text-white p-3 rounded-xl font-black active:scale-95 shrink-0"><Plus size={18} /></button>
                      </form>
                    </div>
                    
                    {fixedExpenses.length === 0 ? (
                       <div className="p-8 text-center text-slate-300 font-bold text-xs italic">등록된 고정비가 없습니다</div>
                    ) : (
                      <Reorder.Group axis="y" values={fixedExpenses} onReorder={handleReorderFixedExpenses} className="flex flex-col">
                        {fixedExpenses.map(exp => (
                          <Reorder.Item key={exp.id} value={exp} className="flex justify-between items-center p-4 border-b last:border-0 border-slate-50 bg-white">
                            <div className="flex items-center gap-2">
                              <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-300"><GripVertical size={16} /></div>
                              <span className="font-bold text-sm text-slate-700">{exp.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-red-600 text-sm">-{exp.amount.toLocaleString()}원</span>
                              <button onClick={() => handleDeleteFixedExpense(exp.id)} className="p-1.5 text-slate-400 hover:text-red-600 active:bg-red-50 rounded-md transition-colors border-l pl-2"><Trash2 size={14} /></button>
                            </div>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    )}
                  </div>
                </section>
                
                <div className="h-10"></div>
              </motion.div>
            )}
          </main>

          {/* FAB (Dashboard Only) */}
          <div className="fixed bottom-24 right-5 z-[140] flex flex-col items-end gap-2 pointer-events-none">
            <AnimatePresence>
              {isEditMode && activeTab === 'dashboard' && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }} className="bg-green-100 text-green-800 border border-green-200 text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm pointer-events-auto">SAVE CHANGES</motion.div>
              )}
            </AnimatePresence>
            {activeTab === 'dashboard' && (
              <button onClick={() => isEditMode ? commitChanges() : setIsEditMode(true)} className={`p-4 rounded-full shadow-2xl transition-all active:scale-90 pointer-events-auto flex items-center justify-center ${isEditMode ? 'bg-green-600 text-white animate-bounce' : 'bg-slate-900 text-white'}`}>
                {isEditMode ? <Check size={24} strokeWidth={3} /> : <Edit2 size={24} strokeWidth={2.5} />}
              </button>
            )}
          </div>

          {/* --- Dashboard Asset Modal --- */}
          <AnimatePresence>
            {isModalOpen && (
              <div className="fixed inset-0 z-[300] flex items-end justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                <motion.form onSubmit={handleTempSave} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-h-[85%] bg-white rounded-t-[2.5rem] shadow-2xl px-6 pt-4 pb-6 flex flex-col max-w-md">
                  <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />
                  <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-2">{isEditMode || selectedItem?.isNew ? <Unlock size={18} className="text-blue-600"/> : <Lock size={18} className="text-slate-400"/>}<h3 className="text-xl font-black text-slate-800">{selectedItem?.isNew ? '항목 추가' : (isEditMode ? '항목 수정' : '상세 정보')}</h3></div>
                    <div className="flex items-center gap-2">
                      {isEditMode && !selectedItem?.isNew && <button type="button" onClick={() => handleTempDelete(selectedItem.id)} className="p-2 text-red-400 active:scale-90 transition-transform"><Trash2 size={20}/></button>}
                      <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
                    </div>
                  </div>
                  <div className="space-y-4 overflow-y-auto pr-1 no-scrollbar pb-2 flex-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">기관(은행)</label><select name="bank" disabled={!isEditMode && !selectedItem?.isNew} defaultValue={selectedItem?.bank || '기타'} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black outline-none min-w-0">{BANKS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">종류</label><select name="type" disabled={!isEditMode && !selectedItem?.isNew} defaultValue={selectedItem?.type} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black outline-none min-w-0"><option value="자산">자산</option><option value="부채">부채</option></select></div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">항목 상세명</label><input name="name" required disabled={!isEditMode && !selectedItem?.isNew} type="text" defaultValue={selectedItem?.name} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black outline-none min-w-0" /></div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">금액 (원)</label>
                      {selectedItem?.name?.toUpperCase() === 'ISA' ? (
                         <div className="w-full bg-slate-100 border-none rounded-xl p-3 text-sm font-black text-slate-400 flex items-center justify-between">
                           <span>가계부 탭에서 관리됩니다</span>
                           <BookOpen size={16} className="text-slate-300" />
                         </div>
                      ) : (
                        <input name="amount" required min="0" disabled={!isEditMode && !selectedItem?.isNew} type="number" defaultValue={selectedItem?.amount} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black outline-none min-w-0" />
                      )}
                    </div>
                    
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">메모</label><textarea name="memo" disabled={!isEditMode && !selectedItem?.isNew} defaultValue={selectedItem?.memo} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black h-20 outline-none resize-none min-w-0" /></div>
                    {(isEditMode || selectedItem?.isNew) && <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl font-black shadow-lg active:scale-95 transition-all mt-2 uppercase tracking-widest text-xs text-center shrink-0">Apply Changes</button>}
                  </div>
                </motion.form>
              </div>
            )}
          </AnimatePresence>

          {/* --- Ledger Transaction Modal --- */}
          <AnimatePresence>
            {isLedgerModalOpen && (
              <div className="fixed inset-0 z-[300] flex items-end justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeLedgerModal} />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full h-[85vh] bg-white rounded-t-[2.5rem] shadow-2xl px-6 pt-4 pb-8 flex flex-col max-w-md overflow-hidden">
                  <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />
                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{getAccountName(selectedLedgerAccount)}</h3>
                    <button type="button" onClick={closeLedgerModal} className="p-2 bg-slate-100 rounded-full shrink-0"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 flex flex-col pb-[env(safe-area-inset-bottom)]">
                    
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shrink-0">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter block mb-2">현재 잔액 (기본금 수정)</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={ledger[selectedLedgerAccount] || ''} onChange={(e) => updateLedgerDirect(selectedLedgerAccount, Number(e.target.value))} className="flex-1 bg-white p-3 rounded-xl font-black outline-none border border-slate-200 text-lg shadow-sm min-w-0" placeholder="0" />
                        <span className="font-black text-slate-500 shrink-0">원</span>
                      </div>
                    </div>

                    {selectedLedgerAccount === 'isa' && (
                      <div className="grid grid-cols-2 gap-3 shrink-0 mt-4">
                         <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter block mb-2">예수금 (추가 투입)</label>
                            <div className="flex items-center gap-1">
                              <input type="number" value={ledger.isa_deposit || ''} onChange={(e) => updateLedgerDirect('isa_deposit', Number(e.target.value))} className="w-full bg-transparent font-black text-lg outline-none" placeholder="0" />
                              <span className="text-slate-400 font-bold text-sm">원</span>
                            </div>
                         </div>
                         <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col justify-center">
                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-tighter block mb-2">현재 총 수익</label>
                            <div className="flex items-center gap-1">
                              <input type="number" value={ledger.isa_profit || ''} onChange={(e) => updateLedgerDirect('isa_profit', Number(e.target.value))} className="w-full bg-transparent font-black text-lg outline-none text-blue-600" placeholder="0" />
                              <span className="text-blue-400 font-bold text-sm">원</span>
                            </div>
                         </div>
                      </div>
                    )}

                    {selectedLedgerAccount !== 'isa' && (
                      <form onSubmit={handleLedgerTransaction} className="space-y-4 shrink-0 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                        {editingTx && <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter border-b pb-2 mb-2">내역 수정 모드</p>}
                        <div className="flex gap-2">
                          {selectedLedgerAccount === 'card_bill' ? (
                            <div className="flex bg-red-50 p-1 rounded-xl w-[120px] shrink-0 items-center justify-center border border-red-100">
                              <span className="text-red-600 font-black text-xs">💳 카드 사용</span>
                            </div>
                          ) : (
                            <div className="flex bg-slate-100 p-1 rounded-xl w-[120px] shrink-0">
                              <button type="button" onClick={() => setTxType('-')} className={`flex-1 rounded-lg text-xs font-black transition-all ${txType === '-' ? 'bg-white shadow text-red-600' : 'text-slate-400'}`}>- 지출</button>
                              <button type="button" onClick={() => setTxType('+')} className={`flex-1 rounded-lg text-xs font-black transition-all ${txType === '+' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>+ 수입</button>
                            </div>
                          )}
                          <input value={txAmount} onChange={(e) => setTxAmount(e.target.value)} required type="number" placeholder="금액" className="flex-1 bg-slate-50 p-3 rounded-xl font-black outline-none border border-slate-100 focus:border-blue-400 min-w-0" />
                        </div>
                        <input value={txItemName} onChange={(e) => setTxItemName(e.target.value)} required type="text" placeholder="사용 내역 (예: 스타벅스)" className="w-full bg-slate-50 p-3 rounded-xl font-black outline-none border border-slate-100 focus:border-blue-400 min-w-0" />
                        <div className="flex gap-2">
                          {editingTx && <button type="button" onClick={() => { setEditingTx(null); setTxAmount(''); setTxItemName(''); }} className="bg-slate-100 text-slate-600 px-4 rounded-xl font-black active:scale-95 text-xs shrink-0">취소</button>}
                          <button type="submit" className={`flex-1 min-w-0 ${editingTx ? 'bg-blue-600' : 'bg-slate-900'} text-white py-4 rounded-xl font-black shadow-lg active:scale-95 transition-all uppercase text-sm tracking-widest`}>
                            {editingTx ? '수정 내용 저장' : '기록 추가하기'}
                          </button>
                        </div>
                      </form>
                    )}

                    {selectedLedgerAccount !== 'isa' && (
                      <div className="flex-1 flex flex-col min-h-[150px]">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-3 border-b pb-2 shrink-0">오늘의 내역 (위아래로 드래그하여 순서 변경)</h4>
                        <div className="flex-1 relative">
                          {dailyTransactions.filter(tx => tx.account === selectedLedgerAccount).length === 0 ? (
                            <p className="text-center text-xs text-slate-300 font-bold py-10">기록된 내역이 없습니다</p>
                          ) : (
                            <Reorder.Group axis="y" values={dailyTransactions.filter(tx => tx.account === selectedLedgerAccount)} onReorder={handleReorder} className="space-y-2 pb-10">
                              {dailyTransactions.filter(tx => tx.account === selectedLedgerAccount).map(tx => (
                                <Reorder.Item key={tx.id} value={tx} className={`flex justify-between items-center p-3 rounded-xl border transition-all gap-2 ${editingTx?.id === tx.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-slate-100 rounded-md shrink-0"><GripVertical size={16} className="text-slate-300" /></div>
                                    <span className="font-bold text-sm text-slate-700 truncate">{tx.item_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`font-black text-sm whitespace-nowrap ${tx.type === '+' || selectedLedgerAccount === 'card_bill' ? 'text-blue-600' : 'text-red-600'}`}>
                                      {selectedLedgerAccount === 'card_bill' ? '+' : (tx.type === '+' ? '+' : '-')}{tx.amount.toLocaleString()}
                                    </span>
                                    <div className="flex items-center gap-1 border-l pl-2 border-slate-100 shrink-0">
                                      <button type="button" onClick={() => startEditTx(tx)} className="p-1.5 text-slate-400 hover:text-blue-600 active:bg-blue-50 rounded-md transition-colors"><Pencil size={14} /></button>
                                      <button type="button" onClick={() => deleteTransaction(tx)} className="p-1.5 text-slate-400 hover:text-red-600 active:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
                                    </div>
                                  </div>
                                </Reorder.Item>
                              ))}
                            </Reorder.Group>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* --- 네비게이션 탭 --- */}
          <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-100 pb-[env(safe-area-inset-bottom)] z-[200]">
            <div className="flex justify-around items-center h-[70px] px-6 max-w-md mx-auto">
              <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
                <PieChartIcon size={22} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Dashboard</span>
              </button>
              <button onClick={() => setActiveTab('ledger')} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'ledger' ? 'text-blue-600' : 'text-slate-400'}`}>
                <BookOpen size={22} strokeWidth={activeTab === 'ledger' ? 2.5 : 2} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Ledger</span>
              </button>
              <button onClick={() => setActiveTab('budget')} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'budget' ? 'text-blue-600' : 'text-slate-400'}`}>
                <Calculator size={22} strokeWidth={activeTab === 'budget' ? 2.5 : 2} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Budget</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      <style jsx global>{`html, body { background-color: white !important; overscroll-behavior-y: none; } .no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </>
  );
}