"use client";

import React, { useEffect, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function DesktopPaymentSuccess() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const fetchStarted = React.useRef(false);

  useEffect(() => {
    if (fetchStarted.current) return;
    fetchStarted.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const orderIdRaw = urlParams.get("orderId");
    const parsedOrderId = orderIdRaw ? orderIdRaw.replace(/^order_/, "") : null;
    const amountParam = urlParams.get("amount");
    const paymentKey = urlParams.get("paymentKey");
    const fallbackMethod = sessionStorage.getItem("selectedPaymentMethod") || "결제수단";

    if (parsedOrderId) setOrderId(parsedOrderId);
    if (amountParam) setAmount("₩" + Number(amountParam).toLocaleString());
    
    setPaymentMethod("");

    const pendingOrderStr = sessionStorage.getItem('pendingOrderInfo');
    const userId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    
    if (pendingOrderStr && userId) {
      try {
        const pendingOrder = JSON.parse(pendingOrderStr);
        if (pendingOrder.pointUsed > 0) {
          fetch('/api/order/deduct-points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, usedPoints: Number(pendingOrder.pointUsed) })
          }).catch(err => console.error(err));
        }
      } catch(e) {}
    }

    let pendingAddressObj = null;
    const pendingAddressStr = sessionStorage.getItem("pendingAddress");
    if (pendingAddressStr) {
      try {
        pendingAddressObj = JSON.parse(pendingAddressStr);
      } catch(e) {}
    }

    let pendingOrderObj: any = null;
    if (pendingOrderStr) {
      try {
        pendingOrderObj = JSON.parse(pendingOrderStr);
      } catch(e) {}
    }

    // Always ensure userId is in orderInfo
    if (!pendingOrderObj) pendingOrderObj = {};
    if (!pendingOrderObj.userId) {
      pendingOrderObj.userId = userId;
    }

    if (paymentKey && orderIdRaw && amountParam) {
      // Normal checkout flow — confirm with Toss
      fetch("/api/order/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          paymentKey, 
          orderId: orderIdRaw, 
          amount: amountParam,
          pendingAddress: pendingAddressObj,
          orderInfo: pendingOrderObj
        })
      })
      .then(res => res.json().catch(() => ({ success: false, message: 'Invalid JSON response from server' })))
      .then(data => {
        if (data.success && data.payment) {
          let realMethod = data.payment.method || data.payment.type;
          if (data.payment.easyPay?.provider) realMethod = data.payment.easyPay.provider;
          if (data.payment.card && !data.payment.easyPay) realMethod = "카드";
          if (data.payment.transfer) realMethod = "계좌이체";
          if (data.payment.virtualAccount) realMethod = "가상계좌";
          if (data.payment.mobilePhone) realMethod = "휴대폰";
          if (realMethod === "QUICK_TRANSFER") realMethod = "퀵계좌이체";
          if (realMethod) {
            setPaymentMethod(realMethod);
            sessionStorage.setItem("selectedPaymentMethod", realMethod);
          }
        } else {
          console.error("[DesktopPaymentSuccess] confirm failed:", data);
          alert("[DEBUG] 주문 저장 실패: " + (data.message || JSON.stringify(data)));
          setPaymentMethod(fallbackMethod);
        }
      })
      .catch(err => {
        console.error(err);
        alert("[DEBUG] 네트워크 오류: " + err.message);
        setPaymentMethod(fallbackMethod);
      });
    } else if (parsedOrderId && userId) {
      // Billing flow — fetch order details from DB
      fetch(`/api/order-detail?id=${parsedOrderId}&customerId=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.order) {
            const o = data.order;
            setAmount("₩" + Number(o.total_price).toLocaleString());
            setPaymentMethod(o.payment_method || fallbackMethod);
          } else {
            setPaymentMethod(fallbackMethod);
          }
        })
        .catch(() => setPaymentMethod(fallbackMethod));
    } else {
      setPaymentMethod(fallbackMethod);
    }

    if (pendingAddressStr) {
      sessionStorage.removeItem("pendingAddress");
    }
    
    sessionStorage.removeItem('pendingOrderInfo');
  }, []);

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-['Inter']" style={{ writingMode: 'horizontal-tb' }}>
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center p-md">
        <div className="w-full max-w-[600px] mt-8 pb-xl">
          <div className="bg-surface-container-lowest rounded-2xl p-xl shadow-[0_4px_24px_rgba(80,69,48,0.04)] border border-surface-container flex flex-col items-center text-center opacity-0 animate-fade-up">
            {/* Success Icon */}
            <div className="w-24 h-24 rounded-full bg-primary-fixed flex items-center justify-center mb-md shadow-sm">
              <span className="material-symbols-outlined filled text-primary" style={{ fontSize: "48px" }}>check_circle</span>
            </div>
            {/* Headlines */}
            <h1 className="font-headline-lg text-headline-lg text-primary mb-sm">결제가 완료되었습니다</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-xl">주문해주셔서 감사합니다</p>
            {/* Order Summary Card */}
            <div className="w-full bg-surface-container rounded-lg p-md mb-xl text-left opacity-0 animate-fade-up delay-100 border border-outline-variant/30">
              <div className="flex flex-col gap-sm">
                <div className="flex justify-between items-center py-sm border-b border-outline-variant/20">
                  <span className="font-label-md text-label-md text-on-surface-variant">주문 번호</span>
                  <span className="font-body-md text-body-md text-on-surface font-medium">{orderId || "-"}</span>
                </div>
                <div className="flex justify-between items-center py-sm border-b border-outline-variant/20">
                  <span className="font-label-md text-label-md text-on-surface-variant">결제 수단</span>
                  <span className="font-body-md text-body-md text-on-surface">{paymentMethod || "-"}</span>
                </div>
                <div className="flex justify-between items-center pt-sm">
                  <span className="font-label-md text-label-md text-on-surface-variant">총 결제 금액</span>
                  <span className="font-headline-md text-headline-md text-primary font-semibold">{amount || "-"}</span>
                </div>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-sm opacity-0 animate-fade-up delay-200">
              <button onClick={() => window.location.href = "/"} className="w-full py-md bg-primary text-on-primary rounded-full font-label-md text-label-md hover:bg-primary/90 transition-colors duration-200 active:scale-[0.98]">
                쇼핑 계속하기
              </button>
              <button onClick={() => window.location.href = "/mypage/order"} className="w-full py-md bg-transparent text-primary border border-outline-variant rounded-full font-label-md text-label-md hover:bg-surface-container-low transition-colors duration-200 active:scale-[0.98]">
                주문 내역 보기
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
