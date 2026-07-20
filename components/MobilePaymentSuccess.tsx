"use client";

import React, { useEffect, useState } from "react";

export default function MobilePaymentSuccess() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [visible, setVisible] = useState(false);
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

    const pendingOrderStr = sessionStorage.getItem("pendingOrderInfo");
    const userId = localStorage.getItem("customerId") || localStorage.getItem("userId");

    if (pendingOrderStr && userId) {
      try {
        const pendingOrder = JSON.parse(pendingOrderStr);
        // Points are now safely deducted on the backend during /api/order/confirm transaction
      } catch (e) {}
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
      // Normal checkout flow
      fetch("/api/order/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          paymentKey, 
          orderId: orderIdRaw, 
          amount: amountParam,
          pendingAddress: pendingAddressObj,
          orderInfo: pendingOrderObj
        }),
      })
        .then((res) => res.json().catch(() => ({ success: false, message: 'Invalid JSON response from server' })))
        .then((data) => {
          if (data.success && data.payment) {
            let m = data.payment.method || data.payment.type;
            if (data.payment.easyPay?.provider) m = data.payment.easyPay.provider;
            if (data.payment.card && !data.payment.easyPay) m = "카드";
            if (data.payment.transfer) m = "계좌이체";
            if (data.payment.virtualAccount) m = "가상계좌";
            if (data.payment.mobilePhone) m = "휴대폰";
            if (m === "QUICK_TRANSFER") m = "퀵계좌이체";
            if (m) { setPaymentMethod(m); sessionStorage.setItem("selectedPaymentMethod", m); }
          } else {
            console.error("[MobilePaymentSuccess] confirm failed:", data);
            alert("[DEBUG] 주문 저장 실패: " + (data.message || JSON.stringify(data)));
            setPaymentMethod(fallbackMethod);
          }
        })
        .catch((err) => {
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

    // Clean up sessionStorage
    sessionStorage.removeItem("pendingAddress");
    sessionStorage.removeItem("pendingOrderInfo");

    // Trigger fade-in after mount
    requestAnimationFrame(() => setTimeout(() => setVisible(true), 50));
  }, []);

  const fadeStyle = (delay = 0): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <div style={{
      backgroundColor: "#FFF8F3",
      color: "#1F1B15",
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "Inter, 'Noto Sans KR', sans-serif",
      overflow: "hidden",
      writingMode: "horizontal-tb",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@400,1&display=swap');
        .mat-icon { font-family: 'Material Symbols Outlined'; font-style: normal; font-size: 48px; color: #504530; font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; user-select: none; }
      `}</style>

      {/* Main — centered content */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px 24px",
      }}>
        <div style={{ width: "100%", maxWidth: "384px", display: "flex", flexDirection: "column", alignItems: "center" }}>

          {/* Success icon */}
          <div style={{
            ...fadeStyle(0),
            width: 96, height: 96, borderRadius: "50%",
            backgroundColor: "#f2e0c3",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 24,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}>
            <span className="mat-icon">check_circle</span>
          </div>

          {/* Headline */}
          <h1 style={{
            ...fadeStyle(0),
            fontSize: 28, lineHeight: "36px", fontWeight: 600,
            letterSpacing: "-0.02em", color: "#504530",
            marginBottom: 12, textAlign: "center", whiteSpace: "nowrap",
          }}>결제가 완료되었습니다</h1>

          {/* Sub */}
          <p style={{
            ...fadeStyle(100),
            fontSize: 17, lineHeight: "26px", fontWeight: 400,
            color: "#4b463d", marginBottom: 64, textAlign: "center",
          }}>주문해주셔서 감사합니다</p>

          {/* Summary Card */}
          <div style={{
            ...fadeStyle(200),
            width: "100%",
            backgroundColor: "#f3ede8",
            borderRadius: 16,
            padding: 20,
            border: "1px solid rgba(206,197,185,0.3)",
          }}>
            {/* Order ID */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid rgba(206,197,185,0.2)" }}>
              <span style={{ fontSize: 14, lineHeight: "20px", letterSpacing: "0.01em", fontWeight: 500, color: "#4b463d" }}>주문 번호</span>
              <span style={{ fontSize: 16, lineHeight: "24px", fontWeight: 500, color: "#1F1B15" }}>{orderId || "-"}</span>
            </div>
            {/* Payment method */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, paddingBottom: 12, borderBottom: "1px solid rgba(206,197,185,0.2)" }}>
              <span style={{ fontSize: 14, lineHeight: "20px", letterSpacing: "0.01em", fontWeight: 500, color: "#4b463d" }}>결제 수단</span>
              <span style={{ fontSize: 16, lineHeight: "24px", fontWeight: 400, color: "#1F1B15" }}>{paymentMethod || "-"}</span>
            </div>
            {/* Total */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12 }}>
              <span style={{ fontSize: 14, lineHeight: "20px", letterSpacing: "0.01em", fontWeight: 500, color: "#4b463d" }}>총 결제 금액</span>
              <span style={{ fontSize: 24, lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: 600, color: "#504530" }}>{amount || "-"}</span>
            </div>
          </div>

        </div>
      </main>

      {/* Bottom buttons */}
      <div style={{
        ...fadeStyle(300),
        width: "100%",
        display: "flex", flexDirection: "column", gap: 12,
        padding: "16px 24px 48px",
        backgroundColor: "#FFF8F3",
      }}>
        <button
          onClick={() => (window.location.href = "/")}
          style={{
            width: "100%", padding: "16px 0",
            backgroundColor: "#504530", color: "#ffffff",
            border: "none", borderRadius: 9999,
            fontSize: 14, fontWeight: 500, letterSpacing: "0.01em",
            cursor: "pointer", fontFamily: "inherit",
          }}
        >쇼핑 계속하기</button>
        <button
          onClick={() => (window.location.href = "/mypage/order")}
          style={{
            width: "100%", padding: "16px 0",
            backgroundColor: "transparent", color: "#504530",
            border: "1px solid #cec5b9", borderRadius: 9999,
            fontSize: 14, fontWeight: 500, letterSpacing: "0.01em",
            cursor: "pointer", fontFamily: "inherit",
          }}
        >주문 내역 보기</button>
      </div>
    </div>
  );
}
