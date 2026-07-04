"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function WriteReviewContent() {
  const searchParams = useSearchParams();
  const reviewId = searchParams.get('reviewId');
  const initialRating = searchParams.get('rating');
  const initialContent = searchParams.get('content');

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (reviewId) {
      if (initialRating) setRating(Number(initialRating));
      if (initialContent) setContent(initialContent);
    }
  }, [reviewId, initialRating, initialContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("별점을 선택해주세요.");
      return;
    }
    if (!content.trim()) {
      alert("리뷰 내용을 입력해주세요.");
      contentRef.current?.focus();
      return;
    }

    const customerId = localStorage.getItem("customerId");
    if (!customerId) {
      alert("로그인이 필요합니다.");
      window.location.href = '/login';
      return;
    }

    try {
      // 1. Fetch customer name
      const nameRes = await fetch(`/api/customer-name?customerId=${customerId}`);
      const nameData = await nameRes.json();
      
      if (!nameRes.ok || !nameData.success) {
        alert("사용자 정보를 불러올 수 없습니다.");
        return;
      }
      
      const customerName = nameData.name;

      // 2. Submit review
      let reviewRes;
      if (reviewId) {
        reviewRes = await fetch('/api/review', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            review_id: reviewId,
            customer_id: customerId,
            rating,
            content
          })
        });
      } else {
        reviewRes = await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: customerId,
            customer_name: customerName,
            product_id: 1,
            rating,
            content
          })
        });
      }

      const reviewData = await reviewRes.json();

      if (reviewData.success) {
        alert(reviewId ? "리뷰가 수정되었습니다." : "리뷰가 등록되었습니다.");
        if (window.opener) {
          window.opener.location.reload();
          window.close();
        } else {
          window.location.href = "/";
        }
      } else {
        alert(reviewData.message || "리뷰 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("오류가 발생했습니다.");
    }
  };

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen antialiased selection:bg-primary-container selection:text-on-primary-container">
      <header className="bg-surface sticky top-0 w-full z-50">
        <div className="flex justify-between items-center w-full px-md py-sm max-w-container-max mx-auto">
          <div className="font-headline-md text-headline-md-mobile md:text-headline-md font-bold text-primary">
            L14 Cordy
          </div>
          <div className="flex items-center gap-sm">
            <span 
              className="material-symbols-outlined text-on-surface-variant hover:opacity-80 transition-opacity cursor-pointer active:scale-95 transition-transform" 
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  window.history.back();
                }
              }}
            >
              close
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow flex flex-col items-center justify-center py-lg md:py-xl px-md w-full">
        {/* Container */}
        <div className="w-full max-w-container-max md:max-w-[800px] md:bg-surface-container-low md:rounded-lg md:p-lg transition-shadow duration-300 flex flex-col gap-lg md:gap-md h-full md:h-auto">
          
          {/* Header Text */}
          <div className="mb-0 md:mb-lg flex flex-col gap-sm md:text-center mt-md md:mt-0">
            <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
              {reviewId ? "리뷰 수정하기" : "리뷰 작성하기"}
            </h1>
          </div>

          <form className="flex flex-col gap-md flex-grow" onSubmit={handleSubmit}>
            {/* Product Selection */}
            <div className="flex flex-col gap-xs">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-xs ml-1 md:ml-0">
                상품
              </label>
              <button 
                className="w-full flex items-center justify-between bg-surface-container border border-outline-variant rounded-lg px-sm py-sm focus:outline-none focus:border-primary transition-colors text-left cursor-default" 
                type="button"
              >
                <span className="font-body-md text-body-md text-on-surface truncate pr-sm">엘포틴 코디 15ml X 15포</span>
              </button>
            </div>

            {/* 5-Star Rating Component */}
            <div className="flex flex-col items-center bg-surface-container-low md:bg-surface-container rounded-lg p-md border border-outline-variant/30">
              <label className="block font-label-md text-label-md text-on-surface mb-sm">
                상품은 어떠셨나요?
              </label>
              <div 
                className="flex gap-xs" 
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <span 
                    key={star}
                    className={`material-symbols-outlined text-[40px] cursor-pointer hover:scale-110 active:scale-95 transition-transform ${
                      (hoverRating || rating) >= star 
                        ? 'text-primary' 
                        : 'text-outline-variant'
                    }`}
                    style={{ fontVariationSettings: (hoverRating || rating) >= star ? "'FILL' 1" : "'FILL' 0" }}
                    onMouseEnter={() => setHoverRating(star)}
                    onClick={() => setRating(star)}
                  >
                    star
                  </span>
                ))}
              </div>
            </div>

            {/* Review Content Textarea */}
            <div className="flex flex-col gap-xs flex-grow min-h-[200px]">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-xs ml-1 md:ml-0" htmlFor="review-content">
                리뷰 내용
              </label>
              <textarea 
                ref={contentRef}
                className="w-full flex-grow bg-surface-container border border-outline-variant rounded-lg p-sm font-body-md text-body-md text-on-surface placeholder:text-outline md:placeholder-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none" 
                id="review-content" 
                placeholder="상품에 대한 솔직한 리뷰를 남겨주세요."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                lang="ko"
              ></textarea>
            </div>



            {/* Submit Action */}
            <div className="mt-xl md:mt-lg md:pt-md md:border-t md:border-outline-variant/30 flex md:justify-end pb-lg md:pb-0">
              <button 
                className="w-full md:w-auto bg-primary text-on-primary font-label-md text-label-md py-[14px] md:py-sm md:px-xl rounded-lg md:rounded-full hover:opacity-90 active:scale-95 transition-all duration-200 flex justify-center items-center shadow-sm md:shadow-none" 
                type="submit"
              >
                {reviewId ? "리뷰 수정" : "리뷰 등록"}
              </button>
            </div>
          </form>
        </div>
      </main>


    </div>
  );
}

export default function WriteReviewPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <WriteReviewContent />
    </Suspense>
  );
}
