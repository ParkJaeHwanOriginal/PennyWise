"use client";

import React, { useState, useEffect } from 'react';
import { Menu, X, Edit2, ChevronRight, Wallet, Landmark } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function Dashboard() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // 차트 렌더링 에러 방지용

  // 1. 차트가 클라이언트에서만 그려지도록 보장 (PWA 필수)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalData = [
    { name: '자산', value: 15000000, color: '#2563eb' },
    { name: '부채', value: 5000000, color: '#dc2626' },
  ];

  const details = {
    assets: [
      { id: 1, name: '현금/예금', amount: 8000000 },
      { id: 2, name: '주식 (KB증권)', amount: 7000000 },
    ],
    liabilities: [
      { id: 3, name: '학자금 대출', amount: 5000000 },
    ]
  };

  const netWorth = totalData[0].value - totalData[1].value;

  // 차트가 안 보이는 현상 방지: 클라이언트 마운트 전에는 빈 공간만 둠
  if (!isMounted) return <div className="min-h-screen bg-slate-50" />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 overflow-x-hidden">
      
      {/* --- 1. Header (상단 노치/상태바 대응 추가) --- */}
      <header className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md border-b z-[100] px-4 pt-[env(safe-area-inset-top)] h-[calc(64px+env(safe-area-inset-top))] flex justify-between items-center shadow-sm">
        <div className="w-10" /> 
        
        <h1 className="text-xl font-black tracking-tighter text-blue-600">PennyWise</h1>
        
        {/* 메뉴 버튼: z-index를 최상위로 올리고, 터치 가능 영역을 대폭 확대 */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(true);
          }}
          className="relative z-[110] p-3 -mr-2 active:bg-slate-100 rounded-full transition-all touch-auto"
          aria-label="Open Menu"
        >
          <Menu size={28} className="text-slate-800" />
        </button>
      </header>

      {/* --- 2. Right Sidebar Modal (가시성 및 터치 이벤트 강화) --- */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          {/* 배경 오버레이 */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMenuOpen(false)} 
          />
          
          {/* 사이드바 본체 */}
          <div className="relative w-[75%] h-full bg-white shadow-2xl p-6 pt-[calc(24px+env(safe-area-inset-top))] flex flex-col animate-in slide-in-from-right duration-300">
            <button 
              className="self-start mb-10 p-3 -ml-2 active:bg-slate-100 rounded-full z-[210]" 
              onClick={() => setIsMenuOpen(false)}
            >
              <X size={28} />
            </button>
            
            <nav className="flex flex-col gap-8 text-xl font-bold">
              <p className="text-blue-600 text-xs uppercase tracking-[0.2em] border-b pb-2">Menu</p>
              <button className="flex items-center justify-between py-2 text-left active:text-blue-600 border-b border-slate-50">
                <span>총자산</span> <ChevronRight size={20} className="text-slate-300" />
              </button>
              <button className="flex items-center justify-between py-2 text-left active:text-blue-600 border-b border-slate-50">
                <span>월자산</span> <ChevronRight size={20} className="text-slate-300" />
              </button>
              <button className="flex items-center justify-between py-2 text-left active:text-blue-600">
                <span>가계부</span> <ChevronRight size={20} className="text-slate-300" />
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* --- 3. Main Content --- */}
      <main className="pt-[calc(80px+env(safe-area-inset-top))] pb-12 px-6 max-w-md mx-auto">
        
        <section className="mb-8 text-center">
          <p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-widest">Hi, Park Jaehwan</p>
          <h2 className="text-4xl font-black tracking-tight mb-2">
            {netWorth.toLocaleString()}원
          </h2>
          <div className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
            Net Worth
          </div>
        </section>

        {/* 차트 섹션: 고정 높이를 주어 모바일에서 안 사라지게 함 */}
        <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 mb-8 relative">
          <div className="h-[280px] w-full"> {/* 높이 명시적 지정 */}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totalData}
                  innerRadius={75}
                  outerRadius={95}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {totalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-slate-400 text-[10px] font-black uppercase">Debt</p>
                <p className="text-2xl font-black text-red-600">
                  {Math.round((totalData[1].value / totalData[0].value) * 100)}%
                </p>
            </div>
          </div>
        </section>

        {/* 수정 버튼 */}
        <div className="flex justify-center mb-10">
          <button className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl active:scale-95 transition-all touch-manipulation">
            <Edit2 size={18} /> 수기 입력 및 수정
          </button>
        </div>

        {/* 리스트 (간략화) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
             <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
             <h3 className="font-black text-xl">자산 내역</h3>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm">
             {details.assets.map(item => (
               <div key={item.id} className="flex justify-between p-5 border-b last:border-0 border-slate-50">
                 <span className="font-bold text-slate-500">{item.name}</span>
                 <span className="font-black">{item.amount.toLocaleString()}원</span>
               </div>
             ))}
          </div>
        </div>
      </main>
    </div>
  );
}