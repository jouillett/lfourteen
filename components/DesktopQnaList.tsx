"use client";

import React, { useEffect, useState, useMemo } from "react";

export default function DesktopQnaList() {
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
    <main className="w-full flex-1 flex flex-col relative m-0 p-md md:p-lg box-border min-h-screen">
      <section className="mb-lg mt-md">
        <h1 className="font-headline-lg text-headline-lg text-primary text-center">Q&A Board</h1>
        <p className="font-body-md text-body-md text-on-surface-variant text-center mt-2">상품이나 서비스에 대해 궁금한 점을 자유롭게 남겨주세요.</p>
      </section>

      <section className="flex flex-col gap-sm mb-lg">
        <div className="flex gap-sm w-full mb-xs">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input 
              value={searchQuery}
              onChange={handleSearch}
              className="w-full bg-surface-container border-outline-variant border rounded-full py-2.5 pl-12 pr-[40px] font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-opacity-50 backdrop-blur-sm" 
              placeholder="검색어를 입력하세요" 
              type="text" 
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center w-full mt-2">
          <div className="flex gap-sm">
            <button 
              onClick={() => { setFilterType("all"); setCurrentPage(1); }}
              className={`font-label-md text-label-md px-5 py-1.5 rounded-full whitespace-nowrap border transition-colors ${filterType === 'all' ? 'bg-secondary-container text-on-secondary-container border-transparent' : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}
            >전체</button>
            <button 
              onClick={() => { setFilterType("waiting"); setCurrentPage(1); }}
              className={`font-label-md text-label-md px-5 py-1.5 rounded-full whitespace-nowrap border transition-colors ${filterType === 'waiting' ? 'bg-secondary-container text-on-secondary-container border-transparent' : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}
            >답변대기</button>
            <button 
              onClick={() => { setFilterType("completed"); setCurrentPage(1); }}
              className={`font-label-md text-label-md px-5 py-1.5 rounded-full whitespace-nowrap border transition-colors ${filterType === 'completed' ? 'bg-secondary-container text-on-secondary-container border-transparent' : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}
            >답변완료</button>
          </div>
          
          <div className="flex items-center gap-md">
            <div className="flex items-center gap-xs">
              <input 
                checked={excludeSecret}
                onChange={(e) => { setExcludeSecret(e.target.checked); setCurrentPage(1); }}
                className="w-4 h-4 rounded-sm border-outline-variant text-primary focus:ring-primary bg-surface cursor-pointer" 
                id="exclude-private" 
                type="checkbox" 
              />
              <label className="font-label-md text-label-md text-on-surface-variant cursor-pointer" htmlFor="exclude-private">비밀글 제외</label>
            </div>
            <button 
              onClick={() => { setMyQnaOnly(!myQnaOnly); setCurrentPage(1); }}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-full border transition-colors font-label-md text-label-md whitespace-nowrap ${myQnaOnly ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-primary hover:bg-surface-container-high'}`}
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
              나의 Q&A
            </button>
          </div>
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
              className="bg-surface-container-low rounded-lg p-md cursor-pointer hover:bg-surface-container transition-colors group flex flex-col gap-0 border border-transparent hover:border-outline-variant"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-md flex-grow min-w-0">
                  {item.is_answer === 1 ? (
                    <span className="bg-primary-container text-on-primary-container font-caption text-caption px-3 py-1.5 rounded-sm tracking-wide shrink-0">답변완료</span>
                  ) : (
                    <span className="bg-surface-variant text-on-surface-variant font-caption text-caption px-3 py-1.5 rounded-sm tracking-wide shrink-0">답변대기</span>
                  )}
                  <h3 className={`font-body-md text-body-md text-on-surface font-semibold flex items-center gap-xs group-hover:text-primary transition-colors m-0 min-w-0 ${isExpanded ? 'hidden' : ''}`}>
                    {item.is_secret === 1 && <span className="material-symbols-outlined text-[18px] text-outline">lock</span>}
                    <span className="truncate">{highlightText(titleLine)}</span>
                  </h3>
                </div>
                <div className="flex items-center text-on-surface-variant font-caption text-caption gap-md shrink-0">
                  {item.customer_id === loggedInUserId && (
                    <div className="flex items-center gap-2 text-on-surface-variant mr-2">
                      <button 
                        className="hover:text-primary transition-colors"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const type = item.inquiry_type || '상품 문의'; 
                          const url = `/inquiry?edit_id=${item.id}&type=${encodeURIComponent(type)}&secret=${item.is_secret}&content=${encodeURIComponent(item.content)}`;
                          window.open(url, 'inquiryPopup', 'width=500,height=700,scrollbars=yes,resizable=yes'); 
                        }}
                      >
                        수정
                      </button>
                      <span className="text-outline-variant">|</span>
                      <button 
                        className="hover:text-primary transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    <span>{item.author_name}</span>
                  </div>
                  <span className="text-secondary">{formatDate(item.created_at)}</span>
                </div>
              </div>
              
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-outline-variant flex flex-col gap-md">
                  <div className="text-on-surface font-body-md whitespace-pre-wrap">
                    {highlightText(item.content)}
                  </div>
                  {item.is_answer === 1 && (
                    <div className="bg-surface rounded-lg p-4 text-on-surface-variant font-body-md mt-4 border border-outline-variant border-opacity-30">
                      <span className="font-semibold text-primary mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">support_agent</span>
                        기쁜하루
                      </span>
                      <div className="whitespace-pre-wrap">{highlightText(item.answer_content)}</div>
                    </div>
                  )}
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
        <nav className="flex justify-center items-center gap-2 mt-lg mb-md">
          <button 
            disabled={currentPage === 1}
            className={`w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.max(1, p - 1)); }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button 
              key={page}
              onClick={(e) => { e.stopPropagation(); setCurrentPage(page); }}
              className={`w-10 h-10 flex items-center justify-center rounded-full font-label-md text-label-md transition-colors ${page === currentPage ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface hover:bg-surface-container'}`}
            >
              {page}
            </button>
          ))}

          <button 
            disabled={currentPage === totalPages}
            className={`w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </nav>
      )}

      <div className="flex justify-end p-md mt-auto">
        <button 
          onClick={handleInquiryClick}
          className="bg-primary text-on-primary font-label-md text-label-md px-6 py-2.5 rounded-lg hover:bg-inverse-surface transition-colors shadow-[0_4px_12px_rgba(80,69,48,0.08)] flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
          문의하기
        </button>
      </div>
    </main>
  );
}
