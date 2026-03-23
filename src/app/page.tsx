"use client";

import React, { useState, useEffect } from 'react';
import { Menu, X, Edit2, ChevronRight, Wallet, Landmark, Plus, Check, Lock, Unlock, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase'; // 방금 만든 클라이언트 임포트

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [details, setDetails] = useState({
    assets: [] as any[],
    liabilities: [] as any[]
  });

  // 1. Supabase에서 데이터 불러오기 (Read)
  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching data:', error);
    } else if (data) {
      const assets = data.filter(item => item.type === '자산');
      const liabilities = data.filter(item => item.type === '부채');
      setDetails({ assets, liabilities });
    }
    setLoading(false);
  };

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, []);

  // 2. 데이터 저장/수정 (Create/Update)
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const itemData = {
      name: formData.get('name') as string,
      amount: Number(formData.get('amount')),
      type: formData.get('type') as string,
      memo: formData.get('memo') as string,
    };

    if (selectedItem?.isNew) {
      // 신규 추가
      const { error } = await supabase.from('assets').insert([itemData]);
      if (error) alert('저장 실패!');
    } else {
      // 기존 수정
      const { error } = await supabase.from('assets').update(itemData).eq('id', selectedItem.id);
      if (error) alert('수정 실패!');
    }

    setIsModalOpen(false);
    fetchData(); // 데이터 새로고침
  };

  // 3. 데이터 삭제 (Delete)
  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (error) alert('삭제 실패!');
    
    setIsModalOpen(false);
    fetchData();
  };

  const totalAssets = details.assets.reduce((acc, cur) => acc + cur.amount, 0);
  const totalLiabilities = details.liabilities.reduce((acc, cur) => acc + cur.amount, 0);
  const totalData = [{ name: '자산', value: totalAssets || 1, color: '#2563eb' }, { name: '부채', value: totalLiabilities || 0.1, color: '#dc2626' }];

  const openModal = (item: any = null) => {
    setSelectedItem(item || { name: '', amount: '', type: '자산', memo: '', isNew: true });
    setIsModalOpen(true);
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md border-b z-[100] px-4 pt-[env(safe-area-inset-top)] h-[calc(60px+env(safe-area-inset-top))] flex justify-between items-center shadow-sm">
        <div className="w-10" /> 
        <h1 className="text-xl font-black tracking-tighter text-blue-600 italic">PennyWise</h1>
        <button className="p-3 -mr-2"><Menu size={26} /></button>
      </header>

      <main className="pt-[calc(70px+env(safe-area-inset-top))] pb-8 px-5 max-w-md mx-auto">
        {/* 차트 섹션 */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 mb-6 relative">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsEditMode(!isEditMode)}
            className={`absolute top-3 right-3 z-10 p-2.5 rounded-xl shadow-lg transition-colors ${isEditMode ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}
          >
            {isEditMode ? <Check size={16} strokeWidth={3} /> : <Edit2 size={16} strokeWidth={3} />}
          </motion.button>

          <div className="flex items-center justify-between h-40">
            {loading ? (
              <div className="w-full flex justify-center text-slate-300 font-bold italic">Loading...</div>
            ) : (
              <>
                <div className="relative w-3/5 h-full"> 
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={totalData} innerRadius={55} outerRadius={75} paddingAngle={6} dataKey="value" stroke="none">
                        {totalData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <p className="text-red-600 text-lg font-black leading-tight">{Math.round((totalLiabilities / (totalAssets + totalLiabilities || 1)) * 100)}%</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Debt Ratio</p>
                  </div>
                </div>
                <div className="w-2/5 flex flex-col gap-3 pl-4 border-l font-black text-sm">
                  <div><p className="text-[10px] text-slate-400 uppercase">Assets</p><p>{(totalAssets / 10000).toLocaleString()}만</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase">Debt</p><p>{(totalLiabilities / 10000).toLocaleString()}만</p></div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 리스트 영역 (동일) */}
        <div className="space-y-6">
          {[ { title: '자산 내역', data: details.assets, icon: <Wallet size={16}/>, color: 'blue' },
             { title: '부채 내역', data: details.liabilities, icon: <Landmark size={16}/>, color: 'red' }
          ].map((sec) => (
            <div key={sec.title}>
              <div className="flex items-center justify-between mb-3 px-1">
                 <div className="flex items-center gap-2">
                   <div className={`p-1.5 bg-${sec.color}-100 text-${sec.color}-600 rounded-lg`}>{sec.icon}</div>
                   <h3 className="font-black text-lg italic">{sec.title}</h3>
                 </div>
                 {isEditMode ? (
                   <button onClick={() => openModal({ type: sec.title.includes('자산') ? '자산' : '부채', isNew: true })} className={`bg-${sec.color}-600 text-white p-1.5 rounded-full shadow-md active:scale-90 transition-transform`}><Plus size={16}/></button>
                 ) : (
                   <span className={`text-xs font-black text-${sec.color}-600 bg-${sec.color}-50 px-3 py-1 rounded-full`}>
                     총 {(sec.color === 'blue' ? totalAssets : totalLiabilities).toLocaleString()}원
                   </span>
                 )}
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                 {!loading && sec.data.length === 0 && <p className="p-8 text-center text-xs text-slate-300 font-bold italic">내역이 없습니다</p>}
                 {sec.data.map(item => (
                   <motion.div 
                     key={item.id} whileTap={{ backgroundColor: "#f8fafc" }}
                     onClick={() => openModal(item)} 
                     className={`flex justify-between items-center p-4 border-b last:border-0 border-slate-50 transition-all ${isEditMode ? 'bg-blue-50/20' : ''}`}
                   >
                     <span className="font-bold text-slate-500 text-sm">{item.name}</span>
                     <div className="flex items-center gap-2">
                        <span className="font-black text-slate-700 text-base">{item.amount.toLocaleString()}원</span>
                        {isEditMode && <ChevronRight size={14} className="text-blue-400" />}
                     </div>
                   </motion.div>
                 ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Sheet Modal (동일) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.form 
              onSubmit={handleSave}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full h-[75%] bg-white rounded-t-[2.5rem] shadow-2xl px-6 pt-4 pb-10 flex flex-col max-w-md"
            >
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />
              
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-2">
                  {isEditMode || selectedItem?.isNew ? <Unlock size={18} className="text-blue-600"/> : <Lock size={18} className="text-slate-400"/>}
                  <h3 className="text-xl font-black text-slate-800">
                    {selectedItem?.isNew ? '항목 추가' : (isEditMode ? '항목 수정' : '항목 상세')}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {isEditMode && !selectedItem?.isNew && (
                    <button type="button" onClick={() => handleDelete(selectedItem.id)} className="p-2 text-red-400 active:text-red-600"><Trash2 size={20}/></button>
                  )}
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
                </div>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 no-scrollbar flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">항목명</label>
                    <input name="name" required disabled={!isEditMode && !selectedItem?.isNew} type="text" defaultValue={selectedItem?.name} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-70" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">종류</label>
                    <select name="type" disabled={!isEditMode && !selectedItem?.isNew} defaultValue={selectedItem?.type} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none appearance-none disabled:opacity-70">
                      <option value="자산">자산</option>
                      <option value="부채">부채</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">금액 (원)</label>
                  <input name="amount" required disabled={!isEditMode && !selectedItem?.isNew} type="number" defaultValue={selectedItem?.amount} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-70" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">메모</label>
                  <textarea name="memo" disabled={!isEditMode && !selectedItem?.isNew} defaultValue={selectedItem?.memo} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black h-20 focus:ring-2 focus:ring-blue-600 outline-none resize-none disabled:opacity-70" />
                </div>

                {(isEditMode || selectedItem?.isNew) && (
                  <motion.button type="submit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black shadow-lg active:scale-95 transition-all mt-2 uppercase tracking-widest">
                    {selectedItem?.isNew ? 'Add Item' : 'Save Changes'}
                  </motion.button>
                )}
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}