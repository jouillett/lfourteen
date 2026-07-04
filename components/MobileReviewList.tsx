"use client";

import React, { useEffect, useState, useMemo } from "react";
import ReportPopup from "./ReportPopup";
import SharePopup from "./SharePopup";

export default function MobileReviewList() {
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState<"date" | "rating">("date");
  const [dateOrder, setDateOrder] = useState<"desc" | "asc">("desc");
  const [ratingOrder, setRatingOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasDeliveredOrders, setHasDeliveredOrders] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [loggedInId, setLoggedInId] = useState<string | null>(null);
  const [userGrade, setUserGrade] = useState<number | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [reportReviewId, setReportReviewId] = useState<number | null>(null);
  const [shareReviewId, setShareReviewId] = useState<number | null>(null);
  const itemsPerPage = 3;



  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-menu-container') && !target.closest('.dropdown-button')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!isLoggedIn) return;

    const cid = localStorage.getItem('customerId');
    if (cid) {
      setLoggedInId(cid);
      fetch(`/api/customer-name?customerId=${cid}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.grade !== undefined) {
            setUserGrade(data.grade);
          }
        })
        .catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get("id");
      if (idParam) {
        setHighlightId(parseInt(idParam, 10));
      }
    }
  }, []);

  useEffect(() => {
    if (loggedInId && allReviews.length > 0) {
      const pendingAction = sessionStorage.getItem("pendingAction");
      const pendingReviewId = sessionStorage.getItem("pendingReviewId");
      if (pendingAction && pendingReviewId) {
        sessionStorage.removeItem("pendingAction");
        sessionStorage.removeItem("pendingReviewId");
        const rId = parseInt(pendingReviewId, 10);
        
        if (pendingAction === 'report') {
          setReportReviewId(rId);
        } else if (pendingAction === 'edit') {
          const rev = allReviews.find(r => r.id === rId);
          if (rev) {
            window.open(`/review/write?reviewId=${rev.id}&rating=${rev.rating}&content=${encodeURIComponent(rev.content || "")}`, 'writeReviewPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
          }
        }
      }
    }
  }, [loggedInId, allReviews]);

  const handleMenuClick = (action: 'report' | 'edit' | 'delete' | 'share', reviewId: number, review?: any) => {
    if (!loggedInId) {
      sessionStorage.setItem("pendingAction", action);
      sessionStorage.setItem("pendingReviewId", String(reviewId));
      window.location.href = "/login?redirect=/review";
      return;
    }

    if (action === 'report') {
      setActiveDropdownId(null);
      setReportReviewId(reviewId);
    } else if (action === 'edit' && review) {
      window.open(`/review/write?reviewId=${review.id}&rating=${review.rating}&content=${encodeURIComponent(review.content || "")}`, 'writeReviewPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
    } else if (action === 'share') {
      setActiveDropdownId(null);
      setShareReviewId(reviewId);
    } else if (action === 'delete') {
      if (confirm('정말로 이 리뷰를 삭제하시겠습니까?')) {
        fetch('/api/review', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ review_id: reviewId })
        }).then(res => res.json()).then(data => {
          if (data.success) {
            alert('리뷰가 삭제되었습니다.');
            window.location.reload();
          } else {
            alert('리뷰 삭제에 실패했습니다.');
          }
        }).catch(() => alert('오류가 발생했습니다.'));
      }
    }
  };

  // Popup is now handled on the login page directly before redirecting

  const handleWriteReview = () => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!loggedIn) {
      sessionStorage.setItem("pendingAction", "writeReview");
      window.location.href = "/login?redirect=/review";
      return;
    }
    
    if (!hasDeliveredOrders) {
      alert("배송 완료된 주문이 있어야 후기를 작성할 수 있습니다.");
      return;
    }

    window.open('/review/write', 'writeReviewPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
  };

  useEffect(() => {
    const fetchDeliveredOrders = async () => {
      const customerId = localStorage.getItem('customerId');
      if (customerId) {
        try {
          const res = await fetch(`/api/check-order?customerId=${customerId}&status=2,4&unreviewed=true`);
          const data = await res.json();
          if (data.success && data.hasOrder) {
            setHasDeliveredOrders(true);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchDeliveredOrders();
  }, []);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch('/api/review?productId=1', { cache: 'no-store' });
        const data = await res.json();
        if (data.success && data.reviews) {
          setAllReviews(data.reviews);
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
      }
    };
    fetchReviews();
  }, []);

  const totalCount = allReviews.length;
  
  const handleReportSubmit = async (reason: string) => {
    try {
      const res = await fetch('/api/accuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reason, review_id: reportReviewId })
      });
      const data = await res.json();
      if (data.success) {
        alert("신고가 접수되었습니다.");
      } else {
        alert("신고 접수에 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("오류가 발생했습니다.");
    } finally {
      setReportReviewId(null);
    }
  };

  const avg = useMemo(() => {
    if (totalCount === 0) return "0.0";
    const sum = allReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return (sum / totalCount).toFixed(1);
  }, [allReviews, totalCount]);

  const filteredAndSortedReviews = useMemo(() => {
    let filtered = allReviews;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = allReviews.filter(
        (r) =>
          (r.content && r.content.toLowerCase().includes(q)) ||
          (r.customer_name && r.customer_name.toLowerCase().includes(q))
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortType === "date") {
        const valA = new Date(a.created_at).getTime();
        const valB = new Date(b.created_at).getTime();
        return dateOrder === "desc" ? valB - valA : valA - valB;
      } else {
        const valA = Number(a.rating) || 0;
        const valB = Number(b.rating) || 0;
        return ratingOrder === "desc" ? valB - valA : valA - valB;
      }
    });

    if (highlightId !== null) {
      const targetIndex = sorted.findIndex(r => r.id === highlightId);
      if (targetIndex !== -1) {
        const [targetReview] = sorted.splice(targetIndex, 1);
        sorted.unshift(targetReview);
      }
    }

    return sorted;
  }, [allReviews, searchQuery, sortType, dateOrder, ratingOrder, highlightId]);

  const totalPages = Math.ceil(filteredAndSortedReviews.length / itemsPerPage) || 1;
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const paginatedReviews = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedReviews.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedReviews, currentPage]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSortDate = () => {
    if (sortType === "date") {
      setDateOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortType("date");
    }
    setCurrentPage(1);
  };

  const handleSortRating = () => {
    if (sortType === "rating") {
      setRatingOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortType("rating");
    }
    setCurrentPage(1);
  };

  const renderStars = (ratingStr: string | number) => {
    const rating = Number(ratingStr) || 0;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i - 0.25) {
        stars.push(<span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>);
      } else if (rating >= i - 0.75) {
        stars.push(<span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star_half</span>);
      } else {
        stars.push(<span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>star</span>);
      }
    }
    return stars;
  };

  const highlightText = (text: string) => {
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

  return (
    <main className="w-full max-w-[440px] px-md py-md flex-grow flex flex-col gap-lg mx-auto min-h-screen">
      {reportReviewId !== null && <ReportPopup onClose={() => setReportReviewId(null)} onSubmit={handleReportSubmit} />}
      {shareReviewId !== null && <SharePopup reviewId={shareReviewId} onClose={() => setShareReviewId(null)} />}
      <header className="flex justify-between items-center">
        <h1 className="font-headline-md text-headline-md text-primary">고객 리뷰</h1>
      </header>

      <section className="bg-surface-container-low rounded-[16px] p-md flex items-center justify-between shadow-sm">
        <div>
          <div className="flex items-baseline gap-xs mb-xs">
            <span className="font-headline-md text-headline-md font-bold text-primary">평균별점 {avg}/5.0</span>
          </div>
          <div className="flex text-primary mt-xs">
            {renderStars(avg)}
          </div>
        </div>
        <div className="text-right">
          <p className="font-caption text-caption text-on-surface-variant mb-xs">총 리뷰 수</p>
          <span className="font-headline-md text-headline-md font-bold text-primary">{totalCount}</span>
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input 
            value={searchQuery}
            onChange={handleSearch}
            className="w-full bg-surface-container border border-outline-variant rounded-lg py-sm pl-[40px] pr-[40px] font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
            placeholder="리뷰 검색" 
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
            onClick={handleSortDate}
            className={`snap-start shrink-0 px-md py-xs rounded-full font-label-md text-label-md ${sortType === 'date' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container border border-outline-variant text-on-surface'}`}
          >
            {dateOrder === "desc" ? "최신순" : "과거순"}
          </button>
          <button 
            onClick={handleSortRating}
            className={`snap-start shrink-0 px-md py-xs rounded-full font-label-md text-label-md ${sortType === 'rating' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container border border-outline-variant text-on-surface'}`}
          >
            {ratingOrder === "desc" ? "별점 높은 순" : "별점 낮은 순"}
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-md">
        {paginatedReviews.map((review, idx) => (
          <article key={idx} className={`bg-surface-container-low rounded-lg p-md flex flex-col gap-sm shadow-sm relative ${idx > 0 ? 'border-t border-outline-variant mt-sm' : ''} ${activeDropdownId === review.id ? 'z-50' : 'z-0'}`}>
              <div className="absolute top-md right-md z-10">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdownId(activeDropdownId === review.id ? null : review.id);
                  }}
                  className="dropdown-button text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined">more_horiz</span>
                </button>
                {activeDropdownId === review.id && (
                  <div 
                    className="dropdown-menu-container absolute right-0 top-full mt-1 w-32 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-md z-20 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                      <button 
                        onClick={() => handleMenuClick('report', review.id)}
                        className="w-full text-left px-4 py-3 text-label-md font-label-md hover:bg-surface-container transition-colors"
                      >
                        신고
                      </button>
                      { loggedInId && (String(loggedInId) === String(review.customer_id) || userGrade !== 9) && (
                        <>
                          <button 
                            onClick={() => handleMenuClick('edit', review.id, review)}
                            className="w-full text-left px-4 py-3 text-label-md font-label-md hover:bg-surface-container transition-colors"
                          >
                            수정
                          </button>
                          <button 
                            onClick={() => handleMenuClick('delete', review.id)}
                            className="w-full text-left px-4 py-3 text-label-md font-label-md hover:bg-surface-container text-error transition-colors"
                          >
                            삭제
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleMenuClick('share', review.id)}
                        className="w-full text-left px-4 py-3 text-label-md font-label-md hover:bg-surface-container transition-colors"
                      >
                        공유
                      </button>
                    </div>
                )}
              </div>
            <div className="flex items-center gap-xs text-primary text-sm">
              {renderStars(review.rating)}
            </div>
            <div className="flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface font-semibold">{highlightText(review.customer_name || "")}</span>
              <span className="font-caption text-caption text-on-surface-variant">{formatDate(review.created_at)}</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface leading-relaxed">
              {highlightText(review.content || "")}
            </p>
          </article>
        ))}
        {paginatedReviews.length === 0 && (
          <div className="text-center py-10 text-on-surface-variant">
            검색 결과가 없습니다.
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <nav className="flex justify-center items-center gap-sm mt-md">
          <button 
            disabled={currentPage === 1}
            className={`w-[32px] h-[32px] flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="flex gap-xs">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button 
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-[32px] h-[32px] flex items-center justify-center rounded-full font-label-md text-label-md transition-colors ${page === currentPage ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container'}`}
              >
                {page}
              </button>
            ))}
          </div>
          <button 
            disabled={currentPage === totalPages}
            className={`w-[32px] h-[32px] flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </nav>
      )}

      <div className="p-md bg-surface border-t border-outline-variant">
        <button 
          onClick={handleWriteReview}
          className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg hover:bg-inverse-surface transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
          후기쓰기
        </button>
      </div>
    </main>
  );
}
