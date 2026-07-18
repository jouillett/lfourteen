"use client";

import React, { useEffect, useState, useMemo } from "react";

export default function MobileQnaList() {
  const [allQna, setAllQna] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "waiting" | "completed">("all");
  const [excludeSecret, setExcludeSecret] = useState(false);
  const [myQnaOnly, setMyQnaOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);
  
  useEffect(() => {
    const userIdStr = localStorage.getItem("customerId");
    if (userIdStr) {
      setLoggedInUserId(parseInt(userIdStr, 10));
    }

    const fetchQna = async () => {
      try {
        const res = await fetch('/api/qna?productId=1', { cache: 'no-store' });
        const data = await res.json();
        if (data.success && data.data) {
          setAllQna(data.data);
        }
      } catch (err) {
        console.error('Error fetching qna:', err);
      }
    };
    fetchQna();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'RELOAD_QNA') {
        fetchQna();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const filteredQna = useMemo(() => {
    let filtered = allQna;
    if (filterType === "waiting") filtered = filtered.filter(q => q.is_answer === 0);
    if (filterType === "completed") filtered = filtered.filter(q => q.is_answer === 1);
    if (excludeSecret) filtered = filtered.filter(q => q.is_secret === 0);
    if (myQnaOnly) {
      filtered = loggedInUserId ? filtered.filter(q => q.customer_id === loggedInUserId) : [];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.content && item.content.toLowerCase().includes(q)) ||
          (item.answer_content && item.answer_content.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [allQna, filterType, excludeSecret, myQnaOnly, searchQuery, loggedInUserId]);

  const totalPages = Math.ceil(filteredQna.length / itemsPerPage) || 1;
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const paginatedQna = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredQna.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQna, currentPage]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleToggleExpand = (qna: any) => {
    if (qna.is_secret === 1 && qna.customer_id !== loggedInUserId) {
      alert('비밀글입니다.');
      return;
    }
    setExpandedId(prev => (prev === qna.id ? null : qna.id));
  };

  const highlightText = (text: string) => {
    if (!text) return "";
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <strong key={i} className="font-bold text-primary">{part}</strong>
      ) : (
        part
      )
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return "";
    const yy = String(dateObj.getFullYear());
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };

  const handleInquiryClick = () => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      if (!loggedIn) {
        alert("로그인이 필요합니다.");
        window.location.href = '/login';
        return;
      }
      window.open('/inquiry', 'inquiryPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const customerId = localStorage.getItem("customerId");
    try {
      const res = await fetch(`/api/qna?id=${id}&customerId=${customerId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert("삭제되었습니다.");
        setAllQna(prev => prev.filter(q => q.id !== id));
      } else {
        alert("삭제 실패: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("오류가 발생했습니다.");
    }
  };

  return (
    <main className="w-full max-w-[440px] px-md py-md flex-grow flex flex-col gap-lg mx-auto min-h-screen">
      <header className="flex flex-col items-center mt-sm">
        <h1 className="font-headline-md text-headline-md text-primary text-center">Q&A Board</h1>
        <p className="font-caption text-caption text-on-surface-variant text-center mt-1">상품이나 서비스에 대해 궁금한 점을 남겨주세요.</p>
      </header>

      <section className="flex flex-col gap-sm">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input 
            value={searchQuery}
            onChange={handleSearch}
            className="w-full bg-surface-container border border-outline-variant rounded-lg py-sm pl-[40px] pr-[40px] font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
            placeholder="검색어를 입력하세요" 
            type="text" 
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
              className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>
        
        <div className="flex gap-sm overflow-x-auto pb-xs snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button 
            onClick={() => { setFilterType("all"); setCurrentPage(1); }}
            className={`snap-start shrink-0 px-md py-xs rounded-full font-label-md text-label-md transition-colors ${filterType === 'all' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface border border-outline-variant text-on-surface-variant'}`}
          >전체</button>
          <button 
            onClick={() => { setFilterType("waiting"); setCurrentPage(1); }}
            className={`snap-start shrink-0 px-md py-xs rounded-full font-label-md text-label-md transition-colors ${filterType === 'waiting' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface border border-outline-variant text-on-surface-variant'}`}
          >답변대기</button>
          <button 
            onClick={() => { setFilterType("completed"); setCurrentPage(1); }}
            className={`snap-start shrink-0 px-md py-xs rounded-full font-label-md text-label-md transition-colors ${filterType === 'completed' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface border border-outline-variant text-on-surface-variant'}`}
          >답변완료</button>
          
          <button 
            onClick={() => { setExcludeSecret(!excludeSecret); setCurrentPage(1); }}
            className={`snap-start shrink-0 px-md py-xs rounded-full font-label-md text-label-md transition-colors ${excludeSecret ? 'bg-primary text-on-primary' : 'bg-surface border border-outline-variant text-on-surface-variant'}`}
          >
            비밀글 제외
          </button>
          
          <button 
            onClick={() => { setMyQnaOnly(!myQnaOnly); setCurrentPage(1); }}
            className={`snap-start shrink-0 px-md py-xs rounded-full font-label-md text-label-md transition-colors flex items-center gap-1 ${myQnaOnly ? 'bg-primary text-on-primary' : 'bg-surface border border-outline-variant text-on-surface-variant'}`}
          >
            <span className="material-symbols-outlined text-[16px]">person</span>
            나의 Q&A
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        {paginatedQna.map((item, idx) => {
          const isExpanded = expandedId === item.id;
          const titleLine = item.content ? item.content.split('\n')[0] : "";
          
          return (
            <article 
              key={idx} 
              onClick={() => handleToggleExpand(item)}
              className="bg-surface-container-low rounded-lg p-md cursor-pointer hover:bg-surface-container transition-colors group min-w-0 border border-transparent hover:border-outline-variant"
            >
              <div className="flex justify-between items-start mb-sm">
                {item.is_answer === 1 ? (
                  <span className="bg-primary-container text-on-primary-container font-caption text-caption px-2 py-1 rounded-sm tracking-wide">답변완료</span>
                ) : (
                  <span className="bg-surface-variant text-on-surface-variant font-caption text-caption px-2 py-1 rounded-sm tracking-wide">답변대기</span>
                )}
                <span className="font-caption text-caption text-secondary">{formatDate(item.created_at)}</span>
              </div>
              
              <h3 className={`font-label-md text-label-md text-on-surface font-semibold mb-xs flex items-center gap-xs group-hover:text-primary transition-colors min-w-0 ${isExpanded ? 'hidden' : 'truncate'}`}>
                {item.is_secret === 1 && <span className="material-symbols-outlined text-[16px] text-outline">lock</span>}
                <span className="truncate">{highlightText(titleLine)}</span>
              </h3>
              
              {!isExpanded && (
                <div className="flex items-center text-on-surface-variant font-caption text-caption w-full">
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    <span>{item.author_name}</span>
                  </div>
                  {item.customer_id === loggedInUserId && (
                    <div className="flex items-center gap-2 text-on-surface-variant ml-auto">
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        const type = item.inquiry_type || '상품 문의'; 
                        const url = `/inquiry?edit_id=${item.id}&type=${encodeURIComponent(type)}&secret=${item.is_secret}&content=${encodeURIComponent(item.content)}`;
                        window.open(url, 'inquiryPopup', 'width=500,height=700,scrollbars=yes,resizable=yes'); 
                      }} className="hover:text-primary transition-colors">수정</button>
                      <span className="text-outline-variant">|</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="hover:text-primary transition-colors">삭제</button>
                    </div>
                  )}
                </div>
              )}
              
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-outline-variant flex flex-col gap-md">
                  <div className="text-on-surface font-label-md whitespace-pre-wrap">
                    {highlightText(item.content)}
                  </div>
                  {item.is_answer === 1 && (
                    <div className="bg-surface rounded-lg p-3 text-on-surface-variant font-label-md border border-outline-variant border-opacity-30">
                      <span className="font-bold text-primary mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">support_agent</span>
                        기쁜하루
                      </span>
                      <div className="whitespace-pre-wrap">{highlightText(item.answer_content)}</div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center text-on-surface-variant font-caption text-caption gap-xs">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      <span>{item.author_name}</span>
                    </div>
                    {item.customer_id === loggedInUserId && (
                      <div className="flex items-center gap-2 text-on-surface-variant font-caption text-caption">
                        <button onClick={(e) => { 
                          e.stopPropagation(); 
                          const type = item.inquiry_type || '상품 문의'; 
                          const url = `/inquiry?edit_id=${item.id}&type=${encodeURIComponent(type)}&secret=${item.is_secret}&content=${encodeURIComponent(item.content)}`;
                          window.open(url, 'inquiryPopup', 'width=500,height=700,scrollbars=yes,resizable=yes'); 
                        }} className="hover:text-primary transition-colors">수정</button>
                        <span className="text-outline-variant">|</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="hover:text-primary transition-colors">삭제</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {paginatedQna.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">
            등록된 게시글이 없습니다.
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <nav className="flex justify-center items-center gap-sm mt-md mb-md">
          <button 
            disabled={currentPage === 1}
            className={`w-[32px] h-[32px] flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.max(1, p - 1)); }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          
          <div className="flex gap-xs">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button 
                key={page}
                onClick={(e) => { e.stopPropagation(); setCurrentPage(page); }}
                className={`w-[32px] h-[32px] flex items-center justify-center rounded-full font-label-md text-label-md transition-colors ${page === currentPage ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface hover:bg-surface-container'}`}
              >
                {page}
              </button>
            ))}
          </div>

          <button 
            disabled={currentPage === totalPages}
            className={`w-[32px] h-[32px] flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </nav>
      )}

      <div className="p-md mt-auto mb-xl">
        <button 
          onClick={handleInquiryClick}
          className="w-full bg-primary text-on-primary font-label-md text-label-md py-2.5 rounded-lg hover:bg-inverse-surface transition-colors shadow-[0_4px_12px_rgba(80,69,48,0.08)] flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
          문의하기
        </button>
      </div>
    </main>
  );
}
