"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function FailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get("message") || "알 수 없는 오류가 발생했습니다.";

  return (
    <div className="flex-grow flex items-center justify-center py-32 bg-surface">
      <div className="bg-surface-container rounded-xl p-lg shadow-sm border border-outline-variant max-w-md w-full text-center">
        <span className="material-symbols-outlined text-6xl text-error mb-md">error</span>
        <h1 className="font-headline-md text-headline-md text-error mb-sm">결제 등록 실패</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-lg">{message}</p>
        <button 
          onClick={() => router.push("/billing")} 
          className="w-full bg-primary text-on-primary font-label-md py-md rounded-xl hover:opacity-90 transition-all"
        >
          결제 다시 시도하기
        </button>
      </div>
    </div>
  );
}

export default function FailPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<div className="py-32 text-center">Loading...</div>}>
        <FailContent />
      </Suspense>
      <Footer />
    </>
  );
}
