"use client";

import React, { useEffect, useState } from "react";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";

export default function PaymentFailPage() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [code, setCode] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [returnUrl, setReturnUrl] = useState<string>("/order");
  const [countdown, setCountdown] = useState<number>(3);
  const [autoRedirecting, setAutoRedirecting] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get("code") || "";
      const msgParam = params.get("message") || "";
      const orderIdParam = params.get("orderId") || "";

      setCode(codeParam);
      setMessage(msgParam);
      setOrderId(orderIdParam);

      // Restore order return URL from pendingOrderInfo
      let orderTarget = "/order";
      const pendingStr = sessionStorage.getItem("pendingOrderInfo");
      if (pendingStr) {
        try {
          const p = JSON.parse(pendingStr);
          if (p.source && p.priceId) {
            orderTarget = `/order?source=${encodeURIComponent(p.source)}&priceId=${encodeURIComponent(p.priceId)}`;
          } else if (p.reorderId) {
            orderTarget = `/order?orderId=${encodeURIComponent(p.reorderId)}`;
          }
        } catch (e) {
          console.error("Failed to parse pendingOrderInfo:", e);
        }
      }
      setReturnUrl(orderTarget);

      const isCanceled = codeParam === "PAY_PROCESS_CANCELED" || msgParam.includes("취소");

      // Auto-redirect to order sheet after 3 seconds if user canceled to pick another payment
      if (isCanceled) {
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              window.location.href = orderTarget;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        setMounted(true);
        return () => clearInterval(timer);
      } else {
        setAutoRedirecting(false);
        setMounted(true);
      }
    }
  }, []);

  const handleReturnToOrder = () => {
    setAutoRedirecting(false);
    window.location.href = returnUrl;
  };

  const handleGoCart = () => {
    setAutoRedirecting(false);
    window.location.href = "/cart";
  };

  const handleGoHome = () => {
    setAutoRedirecting(false);
    const grade = typeof window !== "undefined" ? localStorage.getItem("customerGrade") : null;
    if (grade === "7") {
      window.location.href = "/올바른걷기";
    } else if (grade === "8") {
      window.location.href = "/confidential";
    } else {
      window.location.href = "/";
    }
  };

  if (!mounted) {
    return (
      <div className="bg-[#FFF8F3] text-on-surface min-h-screen flex flex-col font-['Inter',sans-serif]">
        <Header />
        <main className="flex-grow flex items-center justify-center p-8">
          <div className="w-8 h-8 border-3 border-[#504530] border-t-transparent rounded-full animate-spin"></div>
        </main>
        <Footer />
      </div>
    );
  }

  const isCanceled = code === "PAY_PROCESS_CANCELED" || message.includes("취소");

  return (
    <div className="bg-[#FFF8F3] text-on-surface min-h-screen flex flex-col font-['Inter',sans-serif]">
      <Header />

      <main className="flex-grow flex flex-col items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-[520px] bg-white rounded-2xl md:rounded-3xl p-6 sm:p-8 shadow-sm border border-[#cec5b9]/40 flex flex-col items-center text-center animate-in fade-in duration-200">
          {/* Status Icon */}
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 sm:mb-5 ${
              isCanceled ? "bg-[#fef3c7] text-[#d97706]" : "bg-[#fee2e2] text-[#dc2626]"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "44px", fontVariationSettings: "'FILL' 1" }}
            >
              {isCanceled ? "cancel" : "error"}
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-[22px] sm:text-[26px] font-bold text-[#1F1B15] mb-2 leading-tight">
            {isCanceled ? "결제가 취소되었습니다" : "결제에 실패하였습니다"}
          </h1>

          {/* Subtitle */}
          <p className="text-[14px] sm:text-[15px] text-[#7D766C] mb-6 leading-relaxed">
            {isCanceled
              ? "결제가 중단되었습니다. 다른 결제 수단을 선택하시거나 다시 결제를 진행하실 수 있습니다."
              : message
              ? decodeURIComponent(message)
              : "결제 승인 중 오류가 발생했습니다. 다시 시도해 주세요."}
          </p>

          {/* Info Card */}
          <div className="w-full bg-[#f9f5f1] rounded-xl p-4 sm:p-5 mb-6 text-left border border-[#cec5b9]/30 text-[13px] sm:text-[14px] flex flex-col gap-2">
            {orderId && (
              <div className="flex justify-between items-center text-[#504530]">
                <span className="text-[#8a857d]">주문 식별 번호</span>
                <span className="font-mono font-medium text-[12.5px] sm:text-[13px] truncate max-w-[200px]">{orderId}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-[#504530]">
              <span className="text-[#8a857d]">처리 상태</span>
              <span className="font-semibold text-[#1F1B15]">
                {isCanceled ? "사용자 결제 취소" : "결제 승인 실패"}
              </span>
            </div>
            {code && (
              <div className="flex justify-between items-center text-[#504530]">
                <span className="text-[#8a857d]">오류 코드</span>
                <span className="font-mono text-[12px] text-[#8a857d]">{code}</span>
              </div>
            )}
            {isCanceled && autoRedirecting && (
              <div className="mt-2 pt-2 border-t border-[#cec5b9]/30 text-center text-[12.5px] text-[#b45309] font-medium animate-pulse">
                ⏳ <strong>{countdown}초 후</strong> 이전 주문서 화면으로 자동 이동합니다.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleReturnToOrder}
              className="w-full py-3.5 px-4 rounded-xl bg-[#504530] hover:bg-[#3d3424] text-white font-bold text-[14px] sm:text-[15px] shadow-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">replay</span>
              <span>주문서로 돌아가기 (결제 수단 다시 선택)</span>
            </button>

            <div className="grid grid-cols-2 gap-2 w-full mt-1">
              <button
                type="button"
                onClick={handleGoCart}
                className="py-3 px-3 rounded-xl bg-white hover:bg-[#f3ede8] text-[#504530] border border-[#cec5b9] font-semibold text-[13px] sm:text-[14px] transition-all active:scale-98 cursor-pointer"
              >
                장바구니 보기
              </button>
              <button
                type="button"
                onClick={handleGoHome}
                className="py-3 px-3 rounded-xl bg-white hover:bg-[#f3ede8] text-[#504530] border border-[#cec5b9] font-semibold text-[13px] sm:text-[14px] transition-all active:scale-98 cursor-pointer"
              >
                쇼핑 계속하기
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
