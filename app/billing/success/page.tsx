"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { issueBillingKeyAndSave, executeBillingPayment } from "@/app/actions/billing";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("정기 결제 인증 진행 중...");
  const [error, setError] = useState("");
  // "issuing" | "ask" | "paying" | "done"
  const [phase, setPhase] = useState<"issuing" | "ask" | "paying" | "done">("issuing");
  const [billingResult, setBillingResult] = useState<{
    customerId: number;
    billingKey: string;
    customerKey: string;
    option: number;
  } | null>(null);

  useEffect(() => {
    const authKey = searchParams.get("authKey");
    const customerKey = searchParams.get("customerKey");
    const option = searchParams.get("option");
    const duration = searchParams.get("duration");
    const period = searchParams.get("period");

    if (authKey && customerKey) {
      issueBillingKeyAndSave(
        customerKey,
        authKey,
        parseInt(option || "1", 10),
        parseInt(duration || "4", 10),
        (period as "weeks" | "months") || "weeks"
      )
        .then((res) => {
          setBillingResult({
            customerId: res.customerId!,
            billingKey: res.billingKey!,
            customerKey: res.customerKey!,
            option: parseInt(option || "1", 10),
          });
          setStatus("정기 구매가 성공적으로 설정되었습니다!");
          setPhase("ask");
        })
        .catch((err) => {
          console.error(err);
          setError("인증 과정에서 오류가 발생했습니다: " + err.message);
          setPhase("done");
        });
    } else {
      setError("잘못된 접근입니다. 필요한 결제 정보가 없습니다.");
      setPhase("done");
    }
  }, [searchParams]);

  const handlePayNow = async () => {
    if (!billingResult) return;
    setPhase("paying");
    setStatus("첫 결제를 진행하고 있습니다...");
    try {
      const buyRes = await executeBillingPayment(
        billingResult.customerId,
        billingResult.billingKey,
        billingResult.customerKey,
        billingResult.option,
        true
      );
      if (buyRes.success === false && buyRes.requireAddress) {
        alert(buyRes.message);
        router.push("/mypage/profile");
        return;
      }
      setPhase("done");
      router.push(`/payment/success?orderId=${buyRes.orderId}`);
    } catch (buyErr: any) {
      console.error(buyErr);
      if (buyErr.message && buyErr.message.includes("등록된 주소가 없어 진행할 수 없습니다.")) {
        alert("등록된 주소가 없어 진행할 수 없습니다.");
        router.push("/mypage/profile");
        return;
      }
      setError("결제 중 오류가 발생했습니다: " + buyErr.message);
      setPhase("done");
    }
  };

  const handlePayLater = () => {
    router.push("/");
  };

  return (
    <div className="flex-grow flex items-center justify-center py-32 bg-surface" style={{ writingMode: 'horizontal-tb' }}>
      <div className="bg-surface-container rounded-xl shadow-sm border border-outline-variant w-full" style={{ maxWidth: '520px', padding: '40px 36px', writingMode: 'horizontal-tb' }}>
        {error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}>
            <span className="material-symbols-outlined text-error" style={{ fontSize: '64px', marginBottom: '16px' }}>error</span>
            <h1 className="font-headline-md text-headline-md text-error" style={{ marginBottom: '8px' }}>결제 실패</h1>
            <p className="font-body-md text-body-md text-on-surface-variant" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', lineHeight: '1.6' }}>{error}</p>
            <button
              onClick={() => router.push("/billing")}
              style={{ marginTop: '32px', width: '100%', maxWidth: '280px', background: 'var(--color-primary)', color: 'var(--color-on-primary)', fontWeight: 600, padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
            >
              결제 다시 시도하기
            </button>
          </div>
        ) : phase === "issuing" || phase === "paying" ? (
          <div className="flex items-center justify-center gap-md">
            <span className="material-symbols-outlined text-5xl text-primary animate-pulse">check_circle</span>
            <div className="text-left">
              <h1 className="font-headline-md text-headline-md text-primary">{status}</h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">잠시만 기다려 주세요...</p>
            </div>
          </div>
        ) : phase === "ask" ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}>
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '64px', marginBottom: '16px' }}>event_available</span>
            <h1 className="font-headline-md text-headline-md text-on-surface" style={{ marginBottom: '8px' }}>{status}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant" style={{ marginBottom: '32px', lineHeight: '1.6' }}>
              첫 정기구매를 지금 결제하시겠습니까?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '280px' }}>
              <button
                onClick={handlePayNow}
                style={{ width: '100%', background: 'var(--color-primary)', color: 'var(--color-on-primary)', fontWeight: 600, padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '15px' }}
              >
                지금 결제하기
              </button>
              <button
                onClick={handlePayLater}
                style={{ width: '100%', background: 'transparent', color: 'var(--color-on-surface-variant)', fontWeight: 500, padding: '14px', borderRadius: '12px', border: '1px solid var(--color-outline-variant)', cursor: 'pointer', fontSize: '14px' }}
              >
                나중에 결제하기
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<div className="py-32 text-center">Loading...</div>}>
        <SuccessContent />
      </Suspense>
      <Footer />
    </>
  );
}
