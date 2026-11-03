"use client";

import React, { useEffect, useState } from "react";

export default function BandwalkGuard({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Set cookies and session storage so all login/signup links keep this destination
      document.cookie = "bandwalk_entry=1; path=/; max-age=7200";
      document.cookie = `oauth_redirect=${encodeURIComponent("/올바른걷기")}; path=/; max-age=7200`;
      sessionStorage.setItem("bandwalkRedirect", "/올바른걷기");
      sessionStorage.setItem("specialEntry", "bandwalk");

      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      const customerGrade = localStorage.getItem("customerGrade");

      if (loggedIn) {
        // If logged in, only grade '7' is allowed to access
        if (customerGrade === "7") {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          alert("올바른걷기밴드 전용 혜택 페이지입니다.\n(이미 혜택을 이용하셨거나 일반 회원인 경우 메인 페이지로 이동합니다)");
          window.location.href = "/";
        }
      } else {
        // Not logged in: allow band members to view special prices and sign up
        setAuthorized(true);
      }
    }
  }, []);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-[#FFF8F3] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <>
      {/* Exclusive Top Promo Banner */}
      <div className="bg-[#464837] text-white py-2 px-4 text-center text-[12.5px] sm:text-[13.5px] font-medium tracking-tight shadow-sm flex items-center justify-center gap-1.5">
        <span className="material-symbols-outlined text-[16px] text-[#f2e0c3]">directions_walk</span>
        <span>올바른걷기밴드 회원 전용 첫 구매 1회 특별 혜택가</span>
      </div>
      {children}
    </>
  );
}
