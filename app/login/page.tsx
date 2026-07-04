"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import PhoneInput from "@/components/PhoneInput";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const phoneParam = params.get("phone");
      if (phoneParam) {
        setPhone(phoneParam);
      }
    }
  }, []);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) return;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: phone.replace(/\D/g, ""),
          password: password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("customerId", data.userId);
        localStorage.setItem("lastActivity", Date.now().toString());
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect") || "/";

        const pendingAction = sessionStorage.getItem("pendingAction");
        if (pendingAction === "writeReview") {
          sessionStorage.removeItem("pendingAction");
          const orderRes = await fetch(`/api/check-order?customerId=${data.userId}&status=2,4&unreviewed=true`);
          const orderData = await orderRes.json();
          if (orderData.success && orderData.hasOrder) {
            window.open('/review/write', 'writeReviewPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
          } else {
            alert("배송 완료된 주문이 있어야 후기를 작성할 수 있습니다.");
          }
        }
        
        // Slight delay before redirecting to allow popup to open securely
        setTimeout(() => {
          window.location.href = redirect;
        }, 100);

      } else {
        if (data.reason === "incorrect_password") {
          const wantsReset = window.confirm("잘못된 비밀번호를 입력하셨습니다. 새비밀번호를 설정할까요?");
          if (wantsReset) {
            window.location.href = `/password_auth?phone=${encodeURIComponent(phone.replace(/\D/g, ""))}`;
          }
        } else {
          alert(data.message || "로그인에 실패했습니다.");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("서버 오류가 발생했습니다.");
    }
  };

  const handleFindPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    const wantsReset = window.confirm("새비밀번호를 설정할까요?");
    if (wantsReset) {
      window.location.href = `/password_auth?phone=${encodeURIComponent(phone.replace(/\D/g, ""))}`;
    }
  };

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen antialiased selection:bg-primary-container selection:text-on-primary-container">
      <Header />

      <main className="flex-grow flex flex-col items-center justify-center w-full px-md md:px-lg py-xl max-w-7xl mx-auto">
        <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-xl p-md sm:p-lg shadow-sm border border-surface-variant flex flex-col gap-md">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">로그인</h2>
          <form className="flex flex-col gap-md" onSubmit={handleLogin}>
            {/* Phone Number Input */}
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="phone">휴대폰 번호</label>
              <PhoneInput
                className="w-full px-sm py-sm rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-body-md text-body-md focus:border-primary focus:ring-2 focus:ring-primary-container focus:outline-none transition-all placeholder:text-on-surface-variant/50"
                id="phone"
                placeholder="휴대폰 번호를 입력해주세요."
                value={phone}
                onChange={setPhone}
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="password">비밀번호</label>
              <input
                className="w-full px-sm py-sm rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-body-md text-body-md focus:border-primary focus:ring-2 focus:ring-primary-container focus:outline-none transition-all placeholder:text-on-surface-variant/50"
                id="password"
                placeholder="비밀번호를 입력해주세요."
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Action Area */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-sm mt-xs sm:mt-sm">
              <div className="flex items-center justify-center gap-xs font-label-md text-label-md text-on-surface-variant w-full sm:w-auto order-2 sm:order-1 mt-xs sm:mt-0">
                <Link className="hover:text-primary transition-colors" href="/join">회원가입</Link>
                <span className="text-outline-variant">|</span>
                <button type="button" onClick={handleFindPassword} className="hover:text-primary transition-colors">비밀번호 찾기</button>
              </div>
              <button
                className="w-full sm:w-auto bg-primary text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-sm active:scale-95 order-1 sm:order-2"
                type="submit"
              >
                로그인
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
