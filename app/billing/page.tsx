"use client";

import React, { useState, useEffect } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function BillingPage() {
  const [option, setOption] = useState<number>(4);
  const [period, setPeriod] = useState<"weeks" | "months">("weeks");
  const [duration, setDuration] = useState<number | "">(4);
  const [payment, setPayment] = useState<any>(null);

  useEffect(() => {
    const userId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    if (!userId || localStorage.getItem("isLoggedIn") !== "true") {
      alert("로그인이 필요합니다.");
      window.location.href = "/login?redirect=/billing";
      return;
    }

    async function fetchPayment() {
      try {
        const clientKey = process.env.NEXT_PUBLIC_TOSS_API_CLIENT_KEY;
        const tossPayments = await loadTossPayments(clientKey || "");
        
        // Toss requires customerKey to be alphanumeric (not purely numeric)
        const baseUserId = userId || "loginid";
        const validCustomerKey = `user_${baseUserId}`;
        
        const paymentInstance = tossPayments.payment({ customerKey: validCustomerKey });
        setPayment(paymentInstance);
      } catch (error) {
        console.error("Error fetching payment:", error);
      }
    }
    fetchPayment();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const opt = params.get("option");
    if (opt) {
      const numOpt = parseInt(opt, 10);
      if (!isNaN(numOpt)) {
        setOption(numOpt);
      }
    }
  }, []);

  const optionPrices: Record<number, number> = {
    1: 65000,
    2: 110000,
    3: 270000,
    4: 480000,
  };

  const basePrice = optionPrices[option] || 65000;
  const totalPrice = basePrice;
  const formattedPrice = totalPrice.toLocaleString() + "원";

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setDuration(isNaN(val) ? "" : val);
  };

  async function handleBilling() {
    if (!payment) return;
    
    const params = new URLSearchParams({
      option: option.toString(),
      duration: duration.toString(),
      period: period,
    });
    
    await payment.requestBillingAuth({
      method: "CARD",
      successUrl: window.location.origin + "/billing/success?" + params.toString(),
      failUrl: window.location.origin + "/billing/fail",
      customerEmail: "customer123@gmail.com",
      customerName: "김토스",
    });
  }

  return (
    <>
      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        } 
        input[type=number] { 
          -moz-appearance: textfield; 
        }
      `}</style>
      <Header />
      <main className="flex-grow py-xl px-md w-full max-w-[440px] mx-auto flex flex-col gap-lg">
        {/* Header Section */}
        <section className="text-center md:text-left mb-md">
          <h1 className="font-headline-lg text-headline-lg text-primary mb-sm">정기구매</h1>
          <p className="font-body-md text-on-surface-variant">오래도록 유지되는 건강과 아름다움을 위한 현명한 선택을 완료해 주세요.</p>
        </section>

        {/* Subscription Form area */}
        <div className="flex flex-col gap-md">
          
          {/* Period Selection Card */}
          <section className="bg-surface-container rounded-2xl p-lg flex flex-col gap-md shadow-sm border border-surface-container-highest">
            <h2 className="font-headline-md text-headline-md text-primary">기간 선택</h2>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
              {/* Segmented Control */}
              <div className="flex bg-surface-container-high rounded-full p-xs w-full sm:w-auto">
                <button 
                  onClick={() => {
                    setPeriod("weeks");
                    setDuration(4);
                  }}
                  className={`flex-1 sm:px-lg py-sm rounded-full font-label-md transition-all ${
                    period === "weeks" 
                      ? "bg-primary text-on-primary shadow-sm" 
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  주 단위
                </button>
                <button 
                  onClick={() => {
                    setPeriod("months");
                    setDuration(1);
                  }}
                  className={`flex-1 sm:px-lg py-sm rounded-full font-label-md transition-all ${
                    period === "months" 
                      ? "bg-primary text-on-primary shadow-sm" 
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  월 단위
                </button>
              </div>

              {/* Numeric Input */}
              <div className="flex flex-col gap-xs w-full sm:w-32">
                <label className="font-caption text-caption text-on-surface-variant">구독 기간 ({period === "weeks" ? "주" : "개월"})</label>
                <div className="relative flex items-center bg-surface-lowest border border-outline-variant rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all h-[46px] overflow-hidden">
                  <div className="flex items-center flex-1 w-full justify-center pl-4">
                    <input 
                      className="w-12 bg-transparent border-none p-0 text-center font-body-lg outline-none focus:ring-0" 
                      min="1" 
                      type="number" 
                      value={duration}
                      onChange={handleDurationChange}
                      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                    />
                    <div className="flex flex-col justify-center px-1">
                      <button type="button" onClick={() => setDuration(d => (d === "" ? 1 : Number(d)) + 1)} className="text-on-surface-variant hover:text-primary text-[10px] p-1 h-[16px] flex items-center justify-center">
                        ▲
                      </button>
                      <button type="button" onClick={() => setDuration(d => Math.max(1, (d === "" ? 1 : Number(d)) - 1))} className="text-on-surface-variant hover:text-primary text-[10px] p-1 h-[16px] flex items-center justify-center">
                        ▼
                      </button>
                    </div>
                  </div>
                  <span className="pr-4 font-body-md text-on-surface-variant whitespace-nowrap">
                    {period === "weeks" ? "주" : "개월"}
                  </span>
                </div>
                <span className="font-caption text-caption text-outline">{period === "weeks" ? `${duration}주마다 결제됩니다.` : `${duration}개월마다 결제됩니다.`}</span>
              </div>
            </div>
          </section>

          {/* Product Card */}
          <section className="bg-surface-container-lowest rounded-2xl p-lg flex flex-col gap-md shadow-sm border border-outline-variant">
            <div>
              <h3 className="font-headline-md text-headline-md text-primary mb-xs">엘포틴 코디 15ml X 15포</h3>
              <p className="font-caption text-caption text-on-surface-variant">[발효동충하초추출물, 엘포틴유산균]</p>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface-variant">옵션</label>
              <div className="relative">
                <select 
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-sm px-sm font-body-md text-on-surface appearance-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none cursor-pointer"
                  id="pricing-options"
                  value={option}
                  onChange={(e) => setOption(Number(e.target.value))}
                >
                  <option value="1">1개: 65,000원</option>
                  <option value="2">2개: 110,000원</option>
                  <option value="3">6개: 270,000원</option>
                  <option value="4">12개: 480,000원</option>
                </select>
                <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style={{fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"}}>arrow_drop_down</span>
              </div>
            </div>
          </section>

          {/* Order Summary Card */}
          <section className="bg-surface-container rounded-2xl p-lg flex flex-col gap-md shadow-sm border border-surface-container-highest">
            <h3 className="font-headline-md text-headline-md text-primary">주문 요약</h3>
            <div className="flex justify-between items-center py-sm border-b border-outline-variant/30">
              <span className="font-body-md text-on-surface-variant">{duration}{period === "weeks" ? "주" : "개월"} 마다</span>
              <span className="font-body-md text-on-surface font-medium">{formattedPrice}</span>
            </div>
            <div className="flex justify-between items-center pt-sm pb-md">
              <span className="font-headline-md text-headline-md text-primary font-semibold">결제 금액</span>
              <span className="font-headline-lg text-headline-lg text-primary font-semibold">{formattedPrice}</span>
            </div>
            <button onClick={handleBilling} className="w-full bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md py-md rounded-full shadow-sm transition-all flex justify-center items-center gap-xs">
              정기 구매 시작하기
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
