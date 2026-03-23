"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Edit2, ChevronRight, Wallet, Landmark, Plus, Check, Lock, Unlock, Trash2, Download, Apple, Info, RefreshCcw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const BANKS = ['농협', '카카오페이', 'KB국민', '네이버페이', 'KB증권', '신한', '우리', '하나', '기타'];

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [details, setDetails] = useState({ assets: [] as any[], liabilities: [] as any[] });
  const [pendingChanges, setPendingChanges] = useState<any[]>([]); 
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);

  const [showInstallToast, setShowInstallToast] = useState(false);
  const [userAgent, setUserAgent] = useState({ isIOS: false, isAndroid: false });

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('assets').select('*');
    if (!error && data) {
      const sortByAmount = (a: any, b: any) => b.amount - a.amount;
      setDetails({
        assets: data.filter(item => item.type === '자산').sort(sortByAmount),
        liabilities: data.filter(item => item.type === '부채').sort(sortByAmount)
      });
      setPendingChanges([]);
      setPendingDeletes([]);
    }
    setLoading(false);
    setIsRefreshing(false);
    setPullDistance(0);
  };

  useEffect(() => {
    setIsMounted(true);
    fetchData();
    const ua = window.navigator.userAgent.toLowerCase();
    setUserAgent({ isIOS: /iphone|ipad|ipod/.test(ua), isAndroid: /android/.test(ua) });
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) startY.current = e.touches[0].pageY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchY = e.touches[0].pageY;
    const diff = touchY - startY.current;
    if (window.scrollY === 0 && diff > 0 && diff < 150) {
      setPullDistance(diff);
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 80) {
      setIsRefreshing(true);
      fetchData();
    } else {
      setPullDistance(0);
    }
  };

  const commitChanges = async () => {
    setLoading(true);
    if (pendingDeletes.length > 0) {
      await supabase.from('assets').delete().in('id', pendingDeletes);
    }
    for (const item of pendingChanges) {
      const { isNew, ...dbItem } = item;
      if (isNew) {
        await supabase.from('assets').insert([dbItem]);
      } else {
        await supabase.from('assets').update(dbItem).eq('id', item.id);
      }
    }
    setIsEditMode(false);
    await fetchData();
  };

  const handleTempSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const itemData = {
      id: selectedItem?.id || `temp-${Date.now()}`,
      name: formData.get('name') as string,
      bank: formData.get('bank') as string || '기타',
      amount: Math.max(0, Number(formData.get('amount'))),
      type: formData.get('type') as string,
      memo: formData.get('memo') as string,
      isNew: selectedItem?.isNew || false
    };

    const filterOut = (list: any[]) => list.filter(i => i.id !== itemData.id);
    const newAssets = itemData.type === '자산' ? [...filterOut(details.assets), itemData] : filterOut(details.assets);
    const newLiabilities = itemData.type === '부채' ? [...filterOut(details.liabilities), itemData] : filterOut(details.liabilities);

    setDetails({
      assets: newAssets.sort((a, b) => b.amount - a.amount),
      liabilities: newLiabilities.sort((a, b) => b.amount - a.amount)
    });

    setPendingChanges(prev => [...prev.filter(i => i.id !== itemData.id), itemData]);
    setIsModalOpen(false);
  };

  const handleTempDelete = (id: any) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setDetails({
      assets: details.assets.filter(i => i.id !== id),
      liabilities: details.liabilities.filter(i => i.id !== id)
    });
    if (!String(id).startsWith('temp-')) {
      setPendingDeletes(prev => [...prev, id]);
    }
    setPendingChanges(prev => prev.filter(i => i.id !== id));
    setIsModalOpen(false);
  };

  const totalAssets = details.assets.reduce((acc, cur) => acc + cur.amount, 0);
  const totalLiabilities = details.liabilities.reduce((acc, cur) => acc + cur.amount, 0);
  const totalData = [{ name: '자산', value: totalAssets || 1, color: '#2563eb' }, { name: '부채', value: totalLiabilities || 0.1, color: '#dc2626' }];

  if (!isMounted) return null;

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden pb-10 relative touch-pan-y"
    >
      <div 
        className="absolute w-full flex justify-center items-center overflow-hidden pointer-events-none z-[200]"
        style={{ height: pullDistance, top: 0, transition: isRefreshing ? 'none' : 'height 0.2s' }}
      >
        <div className="flex flex-col items-center gap-1 opacity-60">
          <RefreshCcw size={20} className={`text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDistance * 2}deg)` }} />
          <p className="text-[10px] font-black italic uppercase tracking-tighter text-blue-600">
            {pullDistance > 80 ? "Release to refresh" : "Pull to refresh"}
          </p>
        </div>
      </div>

      <header className="fixed top-0 left-0 w-full bg-white/95 backdrop-blur-md border-b z-[150] px-4 pt-[env(safe-area-inset-top)] h-[calc(60px+env(safe-area-inset-top))] flex justify-between items-center">
        <div className="w-10" /> 
        <h1 className="text-xl font-black tracking-tighter text-blue-600 italic">PennyWise</h1>
        <button onClick={() => setIsMenuOpen(true)} className="p-3 -mr-2"><Menu size={26} className="text-slate-800" /></button>
      </header>

      <main className="pt-[calc(75px+env(safe-area-inset-top))] pb-8 px-5 max-w-md mx-auto relative z-10">
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 mb-6 relative">
          <button 
            onClick={() => isEditMode ? commitChanges() : setIsEditMode(true)} 
            className={`absolute top-3 right-3 z-10 p-2.5 rounded-xl shadow-lg transition-all active:scale-95 ${isEditMode ? 'bg-green-600 text-white animate-bounce' : 'bg-slate-900 text-white'}`}
          >
            {isEditMode ? <Check size={18} strokeWidth={4} /> : <Edit2 size={16} strokeWidth={3} />}
          </button>
          
          <div className="flex items-center justify-between h-40">
            {loading ? <div className="w-full text-center text-slate-200 italic font-bold animate-pulse text-sm">Synchronizing...</div> : (
              <>
                <div className="relative w-3/5 h-full">
                  <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={totalData} innerRadius={55} outerRadius={75} paddingAngle={6} dataKey="value" stroke="none">{totalData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}</Pie></PieChart></ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <p className="text-red-600 text-lg font-black leading-tight">{Math.round((totalLiabilities / (totalAssets + totalLiabilities || 1)) * 100)}%</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Debt Ratio</p>
                  </div>
                </div>
                <div className="w-2/5 flex flex-col gap-3 pl-4 border-l font-black text-sm text-center">
                  <div><p className="text-[10px] text-slate-400 uppercase tracking-tighter">Assets</p><p>{(totalAssets / 10000).toLocaleString()}만</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase tracking-tighter">Debt</p><p>{(totalLiabilities / 10000).toLocaleString()}만</p></div>
                </div>
              </>
            )}
          </div>
          {isEditMode && <p className="text-[9px] text-center font-bold text-green-600 mt-2 animate-pulse uppercase tracking-widest">Editing Mode: Press Check to Save all</p>}
        </section>

        <div className="space-y-6">
          {[ { title: '자산 내역', data: details.assets, icon: <Wallet size={16}/>, color: 'blue' }, { title: '부채 내역', data: details.liabilities, icon: <Landmark size={16}/>, color: 'red' } ].map((sec) => (
            <div key={sec.title}>
              <div className="flex items-center justify-between mb-3 px-1">
                 <div className="flex items-center gap-2"><div className={`p-1.5 rounded-lg ${sec.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>{sec.icon}</div><h3 className="font-black text-lg italic">{sec.title}</h3></div>
                 {isEditMode && (
                   <button 
                    onClick={() => { setSelectedItem({ type: sec.title.includes('자산') ? '자산' : '부채', isNew: true }); setIsModalOpen(true); }} 
                    className={`p-1.5 rounded-full shadow-md active:scale-90 transition-all ${sec.color === 'blue' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}
                   >
                    <Plus size={16}/>
                   </button>
                 )}
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[100px] flex flex-col transition-all">
                 {sec.data.length === 0 ? <div className="flex-1 p-10 text-center flex flex-col items-center justify-center"><p className="text-xs text-slate-300 font-bold italic tracking-tight">비어있음</p></div> : sec.data.map(item => (
                   <div key={item.id} onClick={() => { setSelectedItem(item); setIsModalOpen(true); }} className={`flex justify-between items-center p-4 border-b last:border-0 border-slate-50 active:bg-slate-50 transition-all ${isEditMode ? 'bg-blue-50/20' : ''}`}>
                     <div className="flex flex-col"><span className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1 tracking-tighter">{item.bank || '기타'}</span><span className="font-bold text-slate-600 text-sm">{item.name}</span></div>
                     <div className="flex items-center gap-2"><span className="font-black text-slate-800 text-base">{item.amount.toLocaleString()}원</span>{isEditMode && <ChevronRight size={14} className="text-blue-400" />}</div>
                   </div>
                 ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Side Menu & Modal & Install Toast (생략 없이 전문 포함) */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[250] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-[75%] max-sm h-full bg-white shadow-2xl p-6 pt-[calc(20px+env(safe-area-inset-top))] flex flex-col">
              <button className="self-start mb-10 p-3 -ml-2 rounded-full" onClick={() => setIsMenuOpen(false)}><X size={26} /></button>
              <nav className="flex flex-col gap-8 text-xl font-bold">
                <button className="flex items-center justify-between py-1 text-left" onClick={() => { setIsMenuOpen(false); fetchData(); }}>
                   <span>새로고침</span> <RefreshCcw size={20} className="text-slate-300" />
                </button>
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">기관(은행)</label><select name="bank" disabled={!isEditMode && !selectedItem?.isNew} defaultValue={selectedItem?.bank || '기타'} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black outline-none">{BANKS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">종류</label><select name="type" disabled={!isEditMode && !selectedItem?.isNew} defaultValue={selectedItem?.type} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black outline-none"><option value="자산">자산</option><option value="부채">부채</option></select></div>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">항목 상세명</label><input name="name" required disabled={!isEditMode && !selectedItem?.isNew} type="text" defaultValue={selectedItem?.name} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black outline-none" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">금액 (원)</label><input name="amount" required min="0" disabled={!isEditMode && !selectedItem?.isNew} type="number" defaultValue={selectedItem?.amount} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black outline-none" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">메모</label><textarea name="memo" disabled={!isEditMode && !selectedItem?.isNew} defaultValue={selectedItem?.memo} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black h-20 outline-none resize-none" /></div>
                {(isEditMode || selectedItem?.isNew) && <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl font-black shadow-lg active:scale-95 transition-all mt-2 uppercase tracking-widest text-sm text-center">Apply Changes</button>}
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        html, body { background-color: white !important; overscroll-behavior-y: contain; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}