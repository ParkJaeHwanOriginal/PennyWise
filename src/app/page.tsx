"use client";

import React, { useState, useEffect } from 'react';
import { Menu, X, Edit2, ChevronRight, Wallet, Landmark, Plus, Check, Lock, Unlock, Trash2, Share, Download } from 'lucide-react';
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
  
  // PWA 설치 안내 상태
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const [details, setDetails] = useState({ assets: [] as any[], liabilities: [] as any[] });

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('assets').select('*');
    if (!error && data) {
      const sortByAmount = (a: any, b: any) => b.amount - a.amount;
      setDetails({
        assets: data.filter(item => item.type === '자산').sort(sortByAmount),
        liabilities: data.filter(item => item.type === '부채').sort(sortByAmount)
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    setIsMounted(true);
    fetchData();

    // --- PWA 설치 여부 확인 로직 ---
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                       || (window.navigator as any).standalone 
                       || document.referrer.includes('android-app://');
    
    // 설치되지 않은 상태로 브라우저 접속 시 3초 후 팝업 노출
    if (!isStandalone) {
      const timer = setTimeout(() => setShowInstallPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const itemData = {
      name: formData.get('name') as string,
      bank: formData.get('bank') as string || '기타',
      amount: Math.max(0, Number(formData.get('amount'))),
      type: formData.get('type') as string,
      memo: formData.get('memo') as string,
    };
    if (selectedItem?.isNew) await supabase.from('assets').insert([itemData]);
    else await supabase.from('assets').update(itemData).eq('id', selectedItem.id);
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await supabase.from('assets').delete().eq('id', id);
    setIsModalOpen(false);
    fetchData();
  };

  const totalAssets = details.assets.reduce((acc, cur) => acc + cur.amount, 0);
  const totalLiabilities = details.liabilities.reduce((acc, cur) => acc + cur.amount, 0);
  const totalData = [{ name: '자산', value: totalAssets || 1, color: '#2563eb' }, { name: '부채', value: totalLiabilities || 0.1, color: '#dc2626' }];

  const openModal = (item: any = null) => {
    setSelectedItem(item || { name: '', bank: '농협', amount: '', type: '자산', memo: '', isNew: true });
    setIsModalOpen(true);
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden pb-20">
      
      {/* --- 1. Header --- */}
      <header className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md border-b z-[150] px-4 pt-[env(safe-area-inset-top)] h-[calc(60px+env(safe-area-inset-top))] flex justify-between items-center shadow-sm">
        <div className="w-10" /> 
        <h1 className="text-xl font-black tracking-tighter text-blue-600 italic">PennyWise</h1>
        <button onClick={() => setIsMenuOpen(true)} className="p-3 -mr-2 active:opacity-50"><Menu size={26} className="text-slate-800" /></button>
      </header>

      {/* --- 2. Side Menu --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[250] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-[75%] max-w-sm h-full bg-white shadow-2xl p-6 pt-[calc(20px+env(safe-area-inset-top))] flex flex-col">
              <button className="self-start mb-10 p-3 -ml-2 active:bg-slate-100 rounded-full" onClick={() => setIsMenuOpen(false)}><X size={26} /></button>
              <nav className="flex flex-col gap-8 text-xl font-bold">
                <p className="text-blue-600 text-xs uppercase tracking-[0.2em] border-b pb-2">Navigation</p>
                <button className="flex items-center justify-between py-1 text-left active:text-blue-600 group" onClick={() => setIsMenuOpen(false)}><span>총자산 대시보드</span> <ChevronRight size={20} className="text-slate-300" /></button>
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- 3. Main Content --- */}
      <main className="pt-[calc(70px+env(safe-area-inset-top))] pb-8 px-5 max-w-md mx-auto relative z-10">
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 mb-6 relative">
          <button onClick={() => setIsEditMode(!isEditMode)} className={`absolute top-3 right-3 z-10 p-2.5 rounded-xl shadow-lg transition-all active:scale-95 ${isEditMode ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
            {isEditMode ? <Check size={16} strokeWidth={3} /> : <Edit2 size={16} strokeWidth={3} />}
          </button>
          <div className="flex items-center justify-between h-40">
            {loading ? <div className="w-full text-center text-slate-200 italic font-bold animate-pulse text-sm tracking-tighter">Syncing...</div> : (
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
        </section>

        <div className="space-y-6">
          {[ { title: '자산 내역', data: details.assets, icon: <Wallet size={16}/>, color: 'blue' }, { title: '부채 내역', data: details.liabilities, icon: <Landmark size={16}/>, color: 'red' } ].map((sec) => (
            <div key={sec.title}>
              <div className="flex items-center justify-between mb-3 px-1">
                 <div className="flex items-center gap-2"><div className={`p-1.5 rounded-lg ${sec.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>{sec.icon}</div><h3 className="font-black text-lg italic">{sec.title}</h3></div>
                 {isEditMode && <button onClick={() => openModal({ type: sec.title.includes('자산') ? '자산' : '부채', isNew: true })} className={`p-1.5 rounded-full shadow-md active:scale-90 transition-all ${sec.color === 'blue' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}><Plus size={16}/></button>}
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[100px] flex flex-col">
                 {!loading && sec.data.length === 0 ? <div className="flex-1 p-10 text-center flex flex-col items-center justify-center"><div className="mb-2 text-slate-200">{sec.color === 'blue' ? <Wallet size={32} /> : <Landmark size={32} />}</div><p className="text-xs text-slate-300 font-bold italic tracking-tight">등록된 내역이 없습니다</p></div> : sec.data.map(item => (
                   <div key={item.id} onClick={() => openModal(item)} className="flex justify-between items-center p-4 border-b last:border-0 border-slate-50 active:bg-slate-50 transition-all">
                     <div className="flex flex-col"><span className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1 tracking-tighter">{item.bank || '기타'}</span><span className="font-bold text-slate-600 text-sm">{item.name}</span></div>
                     <div className="flex items-center gap-2"><span className="font-black text-slate-800 text-base">{item.amount.toLocaleString()}원</span>{isEditMode && <ChevronRight size={14} className="text-blue-400" />}</div>
                   </div>
                 ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- 4. PWA 설치 유도 플로팅 바 (최하단) --- */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-5 right-5 z-[400] bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl"><Download size={20} className="text-white" /></div>
              <div>
                <p className="text-xs font-black leading-tight">PennyWise 앱 설치</p>
                <p className="text-[10px] text-slate-400 font-bold tracking-tighter">바탕화면에 추가하여 더 편하게 사용하세요!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 아이폰용 안내 */}
              <div className="hidden sm:block text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md">
                Safari: 공유 {'>'} 홈 화면 추가
              </div>
              <button onClick={() => setShowInstallPrompt(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- 5. Bottom Sheet Modal --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.form onSubmit={handleSave} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-h-[85%] bg-white rounded-t-[2.5rem] shadow-2xl px-6 pt-4 pb-6 flex flex-col max-w-md">
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-2">{isEditMode || selectedItem?.isNew ? <Unlock size={18} className="text-blue-600"/> : <Lock size={18} className="text-slate-400"/>}<h3 className="text-xl font-black text-slate-800">{selectedItem?.isNew ? '항목 추가' : (isEditMode ? '항목 수정' : '상세 정보')}</h3></div>
                <div className="flex items-center gap-2">{isEditMode && !selectedItem?.isNew && <button type="button" onClick={() => handleDelete(selectedItem.id)} className="p-2 text-red-400 active:scale-90 transition-transform"><Trash2 size={20}/></button>}<button type="button" onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button></div>
              </div>
              <div className="space-y-4 overflow-y-auto pr-1 no-scrollbar pb-2 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">기관(은행)</label><select name="bank" disabled={!isEditMode && !selectedItem?.isNew} defaultValue={selectedItem?.bank || '기타'} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none appearance-none disabled:opacity-70">{BANKS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">종류</label><select name="type" disabled={!isEditMode && !selectedItem?.isNew} defaultValue={selectedItem?.type} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none appearance-none disabled:opacity-70"><option value="자산">자산</option><option value="부채">부채</option></select></div>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">항목 상세명</label><input name="name" required disabled={!isEditMode && !selectedItem?.isNew} type="text" defaultValue={selectedItem?.name} placeholder="예: 비상금 통장" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-70" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">금액 (원)</label><input name="amount" required min="0" disabled={!isEditMode && !selectedItem?.isNew} type="number" defaultValue={selectedItem?.amount} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-70" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">메모</label><textarea name="memo" disabled={!isEditMode && !selectedItem?.isNew} defaultValue={selectedItem?.memo} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black h-20 focus:ring-2 focus:ring-blue-600 outline-none resize-none disabled:opacity-70" /></div>
                {(isEditMode || selectedItem?.isNew) && <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black shadow-lg active:scale-95 transition-all mt-2 uppercase tracking-widest text-sm">{selectedItem?.isNew ? 'Add Record' : 'Save Changes'}</button>}
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}