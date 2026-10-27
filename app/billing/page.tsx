"use client";

import React, { useState, useEffect } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function BillingPage() {
  const [option, setOption] = useState<number>(1);
  const [period, setPeriod] = useState<"weeks" | "months">("weeks");
  const [duration, setDuration] = useState<number | "">(2);
  const [payment, setPayment] = useState<any>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [customerPoint, setCustomerPoint] = useState<number>(0);

  useEffect(() => {
    const userId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    if (!userId || localStorage.getItem("isLoggedIn") !== "true") {
      alert("로그인이 필요합니다.");
      window.location.href = "/login?redirect=/billing";
      return;
    }

    // Check subscription eligibility
    fetch(`/api/billing/eligibility?customerId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.eligible === false && data.nextDate) {
          alert(`다음 정기구매가 가능한 날짜는 '${data.nextDate}'입니다.`);
          window.location.href = "/";
        }
      })
      .catch(console.error);
    
    const customerGrade = localStorage.getItem("customerGrade");
    setGrade(customerGrade);

    // Fetch user profile to get points
    fetch(`/api/profile?customerId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setCustomerPoint(Number(data.data.point) || 0);
          if (data.data.grade) {
            setGrade(String(data.data.grade));
          }
        }
      })
      .catch(console.error);

    async function fetchPayment() {
      try {
        const clientKey = process.env.NEXT_PUBLIC_TOSS_API_CLIENT_KEY || process.env.NEXT_PUBLIC_TOSS_API_CL || "live_ck_yL0qZ4G1VO1m4aeQ66pM8oWb2MQY";
        const tossPayments = await loadTossPayments(clientKey);
        
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
    } else {
      const customerGrade = localStorage.getItem("customerGrade");
      if (customerGrade === "8") {
        setOption(5);
      } else {
        setOption(1);
      }
    }
  }, []);

  const isGrade8 = grade === "8";

  // Regular prices (id 1~4 for grade 9, 5~8 for grade 8)
  const optionPrices: Record<number, number> = isGrade8 ? {
    5: 45000,
    6: 85000,
    7: 250000,
    8: 480000,
  } : {
    1: 65000,
    2: 110000,
    3: 270000,
    4: 480000,
    // fallback if legacy 9~12
    9: 65000,
    10: 110000,
    11: 270000,
    12: 480000,
  };

  // Points rewarded upon delivery complete for each option
  const deliveryRewardPoints: Record<number, number> = isGrade8 ? {
    5: 0, 6: 0, 7: 0, 8: 0
  } : {
    1: 5000,   // 65,000 - 60,000
    2: 10000,  // 110,000 - 100,000
    3: 20000,  // 270,000 - 250,000
    4: 30000,  // 480,000 - 450,000
    9: 5000,
    10: 10000,
    11: 20000,
    12: 30000,
  };

  const basePrice = optionPrices[option] || (isGrade8 ? 45000 : 65000);
  
  // 첫 정기 결제: 현재 보유 포인트 자동 적용
  const firstPointDeduct = isGrade8 ? 0 : Math.min(customerPoint, basePrice);
  const firstEstimatedPrice = Math.max(0, basePrice - firstPointDeduct);

  // 다음 정기 결제: 배송완료 후 적립 포인트 적용
  const rewardPoint = deliveryRewardPoints[option] || 0;
  const nextPointDeduct = isGrade8 ? 0 : Math.min(rewardPoint, basePrice);
  const nextEstimatedPrice = Math.max(0, basePrice - nextPointDeduct);

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setDuration("");
      return;
    }
    const maxVal = period === "weeks" ? 4 : 1;
    setDuration(Math.min(maxVal, Math.max(1, val)));
  };

  async function handleBilling() {
    if (!payment) return;

    const userId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    if (userId) {
      try {
        const checkRes = await fetch(`/api/billing/eligibility?customerId=${userId}`);
        const checkData = await checkRes.json();
        if (checkData.eligible === false && checkData.nextDate) {
          alert(`다음 정기구매가 가능한 날짜는 '${checkData.nextDate}'입니다.`);
          window.location.href = "/";
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    
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
      windowTarget: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? "self" : "iframe",
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
              {/* Segmented Control Removed as requested (Only weekly unit is allowed) */}
              <div className="flex bg-surface-container-high rounded-full p-xs w-full sm:w-auto invisible hidden">
              </div>

              {/* Numeric Input */}
              <div className="flex flex-col gap-xs w-full">
                <label className="font-caption text-caption text-on-surface-variant">구독 기간 ({period === "weeks" ? "주" : "개월"})</label>
                <div className="flex flex-row items-center gap-sm">
                  <div className="relative flex items-center bg-surface-lowest border border-outline-variant rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all h-[46px] overflow-hidden w-32 shrink-0">
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
                        <button type="button" onClick={() => {
                          const maxVal = period === "weeks" ? 4 : 1;
                          setDuration(d => Math.min(maxVal, (d === "" ? 1 : Number(d)) + 1));
                        }} className="text-on-surface-variant hover:text-primary text-[10px] p-1 h-[16px] flex items-center justify-center">
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
                  <span className="font-caption text-caption text-outline">
                    {period === "weeks" ? `${duration}주마다 결제됩니다.` : `${duration}개월마다 결제됩니다.`}<br />
                    (최대 4주까지 조절 가능합니다)
                  </span>
                </div>
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
                  {isGrade8 ? (
                    <>
                      <option value="5">1개: 45,000원</option>
                      <option value="6">2개: 85,000원</option>
                      <option value="7">6개: 250,000원</option>
                      <option value="8">12개: 480,000원</option>
                    </>
                  ) : (
                    <>
                      <option value="1">1개: 65,000원 (배송완료 시 5,000P 적립)</option>
                      <option value="2">2개: 110,000원 (배송완료 시 10,000P 적립)</option>
                      <option value="3">6개: 270,000원 (배송완료 시 20,000P 적립)</option>
                      <option value="4">12개: 480,000원 (배송완료 시 30,000P 적립)</option>
                    </>
                  )}
                </select>
                <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style={{fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"}}>arrow_drop_down</span>
              </div>
            </div>
          </section>

          {/* Order Summary Card */}
          <section className="bg-surface-container rounded-2xl p-lg flex flex-col gap-md shadow-sm border border-surface-container-highest">
            <h3 className="font-headline-md text-headline-md text-primary">주문 요약</h3>
            
            <div className="flex justify-between items-center py-sm border-b border-outline-variant/30">
              <span className="font-body-md text-on-surface-variant">정기 배송 주기</span>
              <span className="font-body-md text-on-surface font-medium">{duration}{period === "weeks" ? "주" : "개월"} 마다</span>
            </div>
            
            <div className="flex justify-between items-center py-xs text-sm">
              <span className="text-on-surface-variant">상품 금액</span>
              <span className="text-on-surface font-medium">{basePrice.toLocaleString()}원</span>
            </div>

            {/* 첫 정기 결제 예상 금액 */}
            <div className="bg-surface-container-lowest rounded-xl p-3.5 border border-outline-variant/30 flex flex-col gap-1.5 my-1">
              <div className="flex justify-between items-baseline gap-2">
                <span className="font-label-md text-[14px] font-bold text-primary shrink-0">첫 정기 결제 예상 금액</span>
                <span className="font-bold text-[18px] text-primary whitespace-nowrap">{firstEstimatedPrice.toLocaleString()}원</span>
              </div>
              {!isGrade8 && (
                <div className="flex justify-between items-center text-xs text-[#a8442a] pt-1 border-t border-outline-variant/20">
                  <span>보유 포인트 자동 적용</span>
                  <span className="font-medium">{firstPointDeduct > 0 ? `-${firstPointDeduct.toLocaleString()}원` : "0원"}</span>
                </div>
              )}
            </div>

            {/* 다음 정기 결제 예상 금액 */}
            {!isGrade8 && rewardPoint > 0 && (
              <div className="bg-surface-container-lowest rounded-xl p-3.5 border border-outline-variant/30 flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-label-md text-[14px] font-bold text-on-surface shrink-0">다음 정기 결제 예상 금액</span>
                  <span className="font-bold text-[18px] text-on-surface whitespace-nowrap">{nextEstimatedPrice.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center text-xs text-primary pt-1 border-t border-outline-variant/20">
                  <span>(배송완료후 적립 포인트 {rewardPoint.toLocaleString()}원 적용)</span>
                  <span className="font-medium">-{rewardPoint.toLocaleString()}원</span>
                </div>
              </div>
            )}

            {!isGrade8 && (
              <p className="font-caption text-[11px] text-on-surface-variant text-center my-0.5 leading-relaxed">
                ※ 정기구매는 배송완료 시 포인트가 적립되며, 다음 결제 시 보유 포인트가 자동 차감되어 결제됩니다.
              </p>
            )}

            <button onClick={handleBilling} className="w-full bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md py-md rounded-full shadow-sm transition-all flex justify-center items-center gap-xs cursor-pointer mt-1">
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
