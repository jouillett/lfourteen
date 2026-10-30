"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DesktopQuickNav() {
  const pathname = usePathname();
  const [isCheckingReview, setIsCheckingReview] = useState(false);

  // Smooth scroll to reviews or redirect to /#reviews
  const handleViewReviews = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === "/") {
      const reviewEl = document.getElementById("reviews");
      if (reviewEl) {
        reviewEl.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.location.href = "/#reviews";
  };

  // Review write handler: check login and unreviewed orders
  const handleWriteReview = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCheckingReview) return;

    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!loggedIn) {
      alert("로그인이 필요한 서비스입니다.");
      window.location.href = "/login?redirect=/review";
      return;
    }

    const customerId = localStorage.getItem("customerId");
    if (!customerId) {
      alert("로그인 정보를 확인할 수 없습니다.");
      window.location.href = "/login";
      return;
    }

    try {
      setIsCheckingReview(true);
      const res = await fetch(`/api/check-order?customerId=${customerId}&status=2,4&unreviewed=true`);
      const data = await res.json();

      if (data.success && data.hasOrder) {
        window.open(
          "/review/write",
          "writeReviewPopup",
          "width=500,height=720,scrollbars=yes,resizable=yes"
        );
      } else {
        alert("작성 가능한 후기가 없습니다.\n(배송 완료된 주문 건에 한해 작성하실 수 있습니다)");
      }
    } catch (err) {
      console.error("Error checking review eligibility:", err);
      // Fallback open popup
      window.open(
        "/review/write",
        "writeReviewPopup",
        "width=500,height=720,scrollbars=yes,resizable=yes"
      );
    } finally {
      setIsCheckingReview(false);
    }
  };

  const handleScrollTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <aside
      aria-label="데스크톱 퀵 네비게이션"
      className="hidden lg:flex fixed right-5 top-1/2 -translate-y-1/2 z-40 flex-col items-center bg-white/95 backdrop-blur-md rounded-2xl border border-[#e8e1dc] shadow-[0_8px_24px_rgba(43,35,29,0.08)] overflow-hidden w-[72px] transition-all duration-300"
      style={{ writingMode: "horizontal-tb" }}
    >
      {/* 1. 주문배송 */}
      <Link
        href="/mypage/order"
        className="w-full py-3 px-1 flex flex-col items-center justify-center text-[#504530] hover:text-[#a8442a] hover:bg-[#FAF6F2] transition-colors group cursor-pointer"
        title="주문/배송 조회"
      >
        <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">
          local_shipping
        </span>
        <span className="text-[11px] font-medium tracking-tight mt-1 text-[#504530] group-hover:text-[#a8442a] transition-colors">
          주문배송
        </span>
      </Link>

      <div className="w-10 h-px bg-[#eee7e2]"></div>

      {/* 2. 인스타그램 */}
      <a
        href="https://www.instagram.com/lfourteen.life/"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 px-1 flex flex-col items-center justify-center text-[#504530] hover:text-[#E1306C] hover:bg-[#FAF6F2] transition-colors group cursor-pointer"
        title="공식 인스타그램 새창 열기"
      >
        <svg
          className="w-[20px] h-[20px] fill-current group-hover:scale-110 transition-transform"
          viewBox="0 0 24 24"
        >
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
        <span className="text-[11px] font-medium tracking-tight mt-1 text-[#504530] group-hover:text-[#E1306C] transition-colors">
          인스타그램
        </span>
      </a>

      <div className="w-10 h-px bg-[#eee7e2]"></div>

      {/* 3. 리뷰보기 */}
      <button
        type="button"
        onClick={handleViewReviews}
        className="w-full py-3 px-1 flex flex-col items-center justify-center text-[#504530] hover:text-[#a8442a] hover:bg-[#FAF6F2] transition-colors group cursor-pointer"
        title="고객 리뷰 전체보기"
      >
        <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">
          forum
        </span>
        <span className="text-[11px] font-medium tracking-tight mt-1 text-[#504530] group-hover:text-[#a8442a] transition-colors">
          리뷰보기
        </span>
      </button>

      <div className="w-10 h-px bg-[#eee7e2]"></div>

      {/* 4. 리뷰작성 */}
      <button
        type="button"
        onClick={handleWriteReview}
        className="w-full py-3 px-1 flex flex-col items-center justify-center text-[#504530] hover:text-[#a8442a] hover:bg-[#FAF6F2] transition-colors group cursor-pointer"
        title="구매후기 작성하기"
      >
        <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">
          rate_review
        </span>
        <span className="text-[11px] font-medium tracking-tight mt-1 text-[#504530] group-hover:text-[#a8442a] transition-colors">
          리뷰작성
        </span>
      </button>

      {/* 5. TOP 버튼 (하단 강조) */}
      <button
        type="button"
        onClick={handleScrollTop}
        className="w-full py-2.5 flex flex-col items-center justify-center bg-[#504530] text-white hover:bg-[#3d3424] transition-colors cursor-pointer group"
        title="맨 위로 이동"
      >
        <span className="material-symbols-outlined text-[17px] group-hover:-translate-y-0.5 transition-transform">
          arrow_upward
        </span>
        <span className="text-[10.5px] font-bold tracking-wider mt-0.5">
          TOP
        </span>
      </button>
    </aside>
  );
}
