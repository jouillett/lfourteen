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
          setStatus("정기 구매가 성공적으로 설정되었습니다!");
          setTimeout(() => {
            if (window.confirm("오늘부터 결제할까요?")) {
              setStatus("첫 결제를 진행하고 있습니다...");
              executeBillingPayment(res.customerId!, res.billingKey!, res.customerKey!, parseInt(option || "1", 10))
                .then((buyRes) => {
                  if (buyRes.success === false && buyRes.requireAddress) {
                    alert(buyRes.message);
                    router.push("/mypage/profile");
                    return;
                  }
                  // payment/success page might expect orderId in query param or localStorage
                  router.push(`/payment/success?orderId=${buyRes.orderId}`);
                })
                .catch((buyErr) => {
                  console.error(buyErr);
                  if (buyErr.message && buyErr.message.includes("등록된 주소가 없어 진행할 수 없습니다.")) {
                    alert("등록된 주소가 없어 진행할 수 없습니다.");
                    router.push("/mypage/profile");
                    return;
                  }
                  setError("결제 중 오류가 발생했습니다: " + buyErr.message);
                  setStatus("");
                });
            } else {
              router.push("/");
            }
          }, 500); // slight delay to show the success message
        })
        .catch((err) => {
          console.error(err);
          setError("인증 과정에서 오류가 발생했습니다: " + err.message);
          setStatus("");
        });
    } else {
      setError("잘못된 접근입니다. 필요한 결제 정보가 없습니다.");
      setStatus("");
    }
  }, [searchParams, router]);

  return (
    <div className="flex-grow flex items-center justify-center py-32 bg-surface" style={{ writingMode: 'horizontal-tb' }}>
      <div className="bg-surface-container rounded-xl shadow-sm border border-outline-variant w-full" style={{ maxWidth: '520px', padding: '40px 36px', writingMode: 'horizontal-tb' }}>
        {status && (
          <div className="flex items-center justify-center gap-md">
            <span className="material-symbols-outlined text-5xl text-primary animate-pulse">check_circle</span>
            <div className="text-left">
              <h1 className="font-headline-md text-headline-md text-primary">{status}</h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">잠시 후 메인 화면으로 이동합니다...</p>
            </div>
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', writingMode: 'horizontal-tb' }}>
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
        )}
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
