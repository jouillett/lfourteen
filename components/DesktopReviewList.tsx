"use client";

import React, { useEffect, useState, useMemo } from "react";
import ReportPopup from "./ReportPopup";
import SharePopup from "./SharePopup";

export default function DesktopReviewList() {
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
  const [reportReviewId, setReportReviewId] = useState<number | null>(null);
  const [shareReviewId, setShareReviewId] = useState<number | null>(null);
  const itemsPerPage = 3;

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
      setReportReviewId(reviewId);
    } else if (action === 'edit' && review) {
      window.open(`/review/write?reviewId=${review.id}&rating=${review.rating}&content=${encodeURIComponent(review.content || "")}`, 'writeReviewPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
    } else if (action === 'share') {
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
  // Ensure current page is valid when filtering changes
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
    <main className="w-full flex-1 flex flex-col relative m-0 p-md md:p-lg box-border min-h-screen">
      <section className="mb-lg">
        <div className="flex justify-between items-center mb-md">
          <h1 className="font-headline-lg text-headline-lg text-primary">고객 리뷰</h1>
        </div>
        <div className="w-full">
          <div className="bg-surface-container-low rounded-xl p-md flex items-center justify-between shadow-sm transition-transform hover:scale-[1.01] duration-300">
            <div>
              <div className="flex items-baseline gap-xs mb-xs">
                <span className="text-[32px] font-bold text-primary leading-tight">평균별점 {avg}/5.0</span>
              </div>
              <div className="flex text-primary mt-xs">
                {renderStars(avg)}
              </div>
            </div>
            <div className="text-right">
              <p className="font-label-md text-label-md text-on-surface-variant mb-xs">총 리뷰 수</p>
              <span className="text-[48px] font-bold text-primary leading-tight">{totalCount}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md mb-md border-b border-outline-variant pb-md">
        <div className="flex gap-sm">
          <button 
            onClick={handleSortDate}
            className={`rounded-full px-md py-xs font-label-md text-label-md transition-all active:scale-95 ${sortType === 'date' ? 'bg-primary text-on-primary' : 'bg-secondary-container text-on-secondary-container hover:bg-outline-variant'}`}
          >
            {dateOrder === "desc" ? "최신순" : "과거순"}
          </button>
          <button 
            onClick={handleSortRating}
            className={`rounded-full px-md py-xs font-label-md text-label-md transition-all active:scale-95 ${sortType === 'rating' ? 'bg-primary text-on-primary' : 'bg-secondary-container text-on-secondary-container hover:bg-outline-variant'}`}
          >
            {ratingOrder === "desc" ? "별점 높은 순" : "별점 낮은 순"}
          </button>
        </div>
        <div className="relative w-full sm:w-auto">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline">search</span>
          <input 
            value={searchQuery}
            onChange={handleSearch}
            className="w-full sm:w-64 pl-xl pr-[40px] py-xs bg-surface-container border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-label-md font-label-md transition-colors" 
            placeholder="리뷰 검색" 
            type="text" 
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
              className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-md">
        {paginatedReviews.map((review, idx) => (
          <article key={idx} className="bg-surface-container-low rounded-xl p-md border border-transparent hover:border-outline-variant transition-all duration-300 transform hover:-translate-y-[2px]">
            <div className="flex justify-between items-start mb-sm">
              <div className="flex flex-col">
                <div className="flex text-primary mb-xs">
                  {renderStars(review.rating)}
                </div>
                <div className="flex gap-sm items-center">
                  <span className="font-label-md text-label-md text-on-surface font-bold">{highlightText(review.customer_name || "")}</span>
                  <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                  <span className="font-caption text-caption text-outline">{formatDate(review.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-xs">
                <button 
                  onClick={() => handleMenuClick('report', review.id)}
                  className="px-2 py-1 text-caption font-label-md text-outline hover:text-primary transition-colors"
                >
                  신고
                </button>
                { loggedInId && (String(loggedInId) === String(review.customer_id) || userGrade !== 9) && (
                  <>
                    <span className="w-[1px] h-3 bg-outline-variant mx-xs"></span>
                    <button 
                      onClick={() => handleMenuClick('edit', review.id, review)}
                      className="px-2 py-1 text-caption font-label-md text-outline hover:text-primary transition-colors"
                    >
                      수정
                    </button>
                    <span className="w-[1px] h-3 bg-outline-variant mx-xs"></span>
                    <button 
                      onClick={() => handleMenuClick('delete', review.id)}
                      className="px-2 py-1 text-caption font-label-md text-outline hover:text-error transition-colors"
                    >
                      삭제
                    </button>
                  </>
                )}
                <span className="w-[1px] h-3 bg-outline-variant mx-xs"></span>
                <button 
                  onClick={() => handleMenuClick('share', review.id)}
                  className="px-2 py-1 text-caption font-label-md text-outline hover:text-primary transition-colors"
                >
                  공유
                </button>
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              {highlightText(review.content || "")}
            </p>
          </article>
        ))}
        {paginatedReviews.length === 0 && (
          <div className="text-center py-10 text-on-surface-variant">
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-xl flex justify-center items-center gap-md">
          <button 
            disabled={currentPage === 1}
            className={`material-symbols-outlined text-outline hover:text-primary transition-colors ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            chevron_left
          </button>
          <div className="flex gap-sm">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button 
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-full font-label-md text-label-md flex items-center justify-center transition-colors ${page === currentPage ? 'bg-primary text-on-primary' : 'hover:bg-surface-container text-on-surface'}`}
              >
                {page}
              </button>
            ))}
          </div>
          <button 
            disabled={currentPage === totalPages}
            className={`material-symbols-outlined text-outline hover:text-primary transition-colors ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : ''}`}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            chevron_right
          </button>
        </div>
      )}

      <div className="flex justify-end p-md mt-auto">
        <button 
          onClick={handleWriteReview}
          className="bg-primary text-on-primary font-label-md text-label-md px-6 py-2.5 rounded-lg hover:bg-inverse-surface transition-colors shadow-[0_4px_12px_rgba(80,69,48,0.08)] flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
          후기쓰기
        </button>
      </div>

      {reportReviewId !== null && (
        <ReportPopup 
          onClose={() => setReportReviewId(null)}
          onSubmit={handleReportSubmit}
        />
      )}

      {shareReviewId !== null && (
        <SharePopup 
          reviewId={shareReviewId}
          onClose={() => setShareReviewId(null)}
        />
      )}
    </main>
  );
}
