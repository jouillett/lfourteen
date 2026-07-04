"use client";

import { useState, useEffect } from "react";

export default function InquiryHistoryPage() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchInquiries = async (start?: string, end?: string) => {
    setLoading(true);
    const customerId = localStorage.getItem("customerId") || "3";
    try {
      const qStart = start !== undefined ? start : startDate;
      const qEnd = end !== undefined ? end : endDate;

      let url = `/api/my_qna?customerId=${customerId}`;
      if (qStart && qEnd) {
        url += `&startDate=${qStart}&endDate=${qEnd}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.data) {
        setInquiries(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set default to last 1 week and fetch immediately
    handleDateRangeChange("1week");

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'RELOAD_QNA') {
        fetchInquiries(); // Will use current state values for dates
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleDateRangeChange = (range: string) => {
    const end = new Date();
    const start = new Date();
    if (range === "1week") start.setDate(start.getDate() - 7);
    if (range === "1month") start.setMonth(start.getMonth() - 1);
    if (range === "3months") start.setMonth(start.getMonth() - 3);

    const sDate = start.toISOString().split("T")[0];
    const eDate = end.toISOString().split("T")[0];
    setStartDate(sDate);
    setEndDate(eDate);
    
    // Fetch immediately when a quick filter is clicked or on initial load
    fetchInquiries(sDate, eDate);
  };

  const handleSearch = () => {
    fetchInquiries();
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const customerId = localStorage.getItem("customerId") || "3";
    try {
      const res = await fetch(`/api/my_qna?id=${id}&customerId=${customerId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("삭제되었습니다.");
        fetchInquiries();
      } else {
        alert("삭제 실패: " + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("오류가 발생했습니다.");
    }
  };

  return (
    <div className="bg-surface min-h-screen text-on-surface antialiased flex flex-col">
      <header className="bg-surface sticky top-0 w-full z-50 border-b border-outline-variant/30">
        <div className="flex justify-between items-center w-full px-md py-sm max-w-container-max mx-auto">
          <div className="font-headline-md text-headline-md-mobile md:text-headline-md font-bold text-primary">
            1:1 문의/답변 내역
          </div>
          <button 
            className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors"
            onClick={() => {
              if (window.opener) {
                window.close();
              } else {
                window.history.back();
              }
            }}
          >
            close
          </button>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[800px] mx-auto p-md md:p-xl">
        <div className="border border-outline-variant/30 rounded-lg p-6 mb-8">
          <h2 className="font-headline-sm font-bold mb-4">1:1 문의/답변 내역</h2>
          
          <div className="flex flex-col gap-4">
            {/* Quick Filters */}
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => handleDateRangeChange("1week")}
                className="bg-surface-variant/30 text-on-surface-variant hover:bg-surface-variant/50 px-6 py-2 rounded-full font-label-md"
              >
                1주
              </button>
              <button 
                type="button" 
                onClick={() => handleDateRangeChange("1month")}
                className="bg-surface-variant/30 text-on-surface-variant hover:bg-surface-variant/50 px-6 py-2 rounded-full font-label-md"
              >
                1개월
              </button>
              <button 
                type="button" 
                onClick={() => handleDateRangeChange("3months")}
                className="bg-surface-variant/30 text-on-surface-variant hover:bg-surface-variant/50 px-6 py-2 rounded-full font-label-md"
              >
                3개월
              </button>
            </div>

            {/* Date Inputs & Search */}
            <div className="flex flex-col md:flex-row items-center gap-2 mt-2 w-full">
              <div className="flex items-center justify-center gap-2 w-full md:flex-grow md:justify-start pl-0">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-outline-variant/50 rounded-md px-2 py-2 text-on-surface text-sm focus:outline-primary bg-transparent"
                />
                <span className="text-on-surface-variant shrink-0">~</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-outline-variant/50 rounded-md px-2 py-2 text-on-surface text-sm focus:outline-primary bg-transparent"
                />
              </div>
              <button 
                type="button"
                onClick={handleSearch}
                className="bg-primary text-on-primary font-label-md font-semibold px-8 py-2.5 rounded-lg shadow-sm hover:bg-primary/90 transition-colors w-full md:w-auto mt-2 md:mt-0"
              >
                검색
              </button>
            </div>
          </div>
        </div>

        {/* Inquiry List */}
        <div className="flex flex-col border-t border-outline-variant/30">
          {loading ? (
            <div className="py-8 text-center text-on-surface-variant">불러오는 중...</div>
          ) : inquiries.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant">문의 내역이 없습니다.</div>
          ) : (
            inquiries.map((inquiry) => (
              <div key={inquiry.id} className="border-b border-outline-variant/30">
                {/* List Item Header */}
                <div 
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 cursor-pointer hover:bg-surface-container-lowest transition-colors group relative"
                  onClick={() => setExpandedId(expandedId === inquiry.id ? null : inquiry.id)}
                >
                  <div className="flex flex-col gap-2 flex-grow min-w-0 pr-8">
                    <h3 className={`font-body-lg truncate ${expandedId === inquiry.id ? "font-bold" : ""}`}>
                      {inquiry.content.length > 50 ? inquiry.content.substring(0, 50) + "..." : inquiry.content}
                    </h3>
                    <div className="flex items-center gap-3 font-body-sm text-on-surface-variant flex-wrap">
                      <span className="hidden md:inline">{inquiry.masked_phone}</span>
                      <span className="w-[1px] h-3 bg-outline-variant/50 hidden md:block"></span>
                      <span>{new Date(inquiry.created_at).toLocaleDateString().replace(/\.\s/g, '-').replace(/\./g, '')}</span>
                      <span className="w-[1px] h-3 bg-outline-variant/50 hidden md:block"></span>
                      <span className={inquiry.is_answer ? "text-primary font-bold" : "text-outline font-medium"}>
                        {inquiry.is_answer ? "답변완료" : "답변대기"}
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 md:static md:mt-0 flex-shrink-0 flex items-center gap-2">
                    <button 
                      className="text-outline hover:text-primary md:bg-on-surface-variant/40 md:hover:bg-on-surface-variant/60 md:text-surface md:px-4 md:py-1.5 md:rounded-full font-label-sm font-medium transition-colors flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = `/inquiry?edit_id=${inquiry.id}&type=my_qna&secret=${inquiry.is_secret || 0}&content=${encodeURIComponent(inquiry.content)}`;
                        window.open(url, 'inquiryPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
                      }}
                      aria-label="수정"
                    >
                      <span className="hidden md:inline">수정</span>
                      <span className="material-symbols-outlined text-[18px] md:hidden leading-none font-bold">edit</span>
                    </button>
                    <button 
                      className="text-outline hover:text-primary md:bg-on-surface-variant/40 md:hover:bg-on-surface-variant/60 md:text-surface md:px-4 md:py-1.5 md:rounded-full font-label-sm font-medium transition-colors flex items-center justify-center"
                      onClick={(e) => handleDelete(e, inquiry.id)}
                      aria-label="삭제"
                    >
                      <span className="hidden md:inline">삭제</span>
                      <span className="material-symbols-outlined text-[18px] md:hidden leading-none font-bold">close</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === inquiry.id && (
                  <div className="bg-surface-container-lowest p-6 border-t border-outline-variant/10">
                    <div className="font-body-md whitespace-pre-wrap leading-relaxed text-on-surface mb-8">
                      {inquiry.content}
                    </div>

                    {Boolean(inquiry.is_answer) && inquiry.answer_content ? (
                      <div className="rounded-lg overflow-hidden border border-primary/20">
                        <div className="bg-primary text-on-primary px-4 py-3 flex justify-between items-center">
                          <div className="flex items-center gap-2 font-label-md font-bold">
                            <span className="material-symbols-outlined text-[18px]">chat</span>
                            상담사 답변입니다.
                          </div>
                          {inquiry.answer_date && (
                            <div className="font-caption text-on-primary/80">
                              답변일 {new Date(inquiry.answer_date).toLocaleDateString().replace(/\.\s/g, '-').replace(/\./g, '')}
                            </div>
                          )}
                        </div>
                        <div className="bg-surface p-4 md:p-6 font-body-md whitespace-pre-wrap leading-relaxed text-on-surface-variant">
                          {inquiry.answer_content}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 bg-surface-variant/20 rounded-lg text-on-surface-variant font-body-md flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">pending</span>
                        답변대기
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
