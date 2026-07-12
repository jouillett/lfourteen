"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import TrackingModal from "../../components/TrackingModal";

function TrackingContent() {
  const searchParams = useSearchParams();
  const tracking = searchParams.get("shipment");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (tracking) {
      setIsOpen(true);
    }
  }, [tracking]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
         {!isOpen && tracking && (
            <div className="text-center">
               <h2 className="text-xl font-bold mb-4 text-on-surface">배송조회</h2>
               <p className="text-on-surface-variant mb-6">배송조회 창이 닫혔습니다.</p>
               <button 
                 onClick={() => setIsOpen(true)} 
                 className="px-6 py-2 bg-primary text-on-primary rounded-md font-bold hover:bg-primary-fixed-dim transition-colors"
               >
                 배송조회 다시 열기
               </button>
            </div>
         )}
         {!tracking && (
            <div className="text-center text-on-surface-variant">
              잘못된 접근입니다. 송장번호가 없습니다.
            </div>
         )}
         {tracking && (
           <TrackingModal 
             isOpen={isOpen} 
             onClose={() => setIsOpen(false)} 
             shipmentString={tracking} 
           />
         )}
      </main>
      <Footer />
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩중...</div>}>
      <TrackingContent />
    </Suspense>
  );
}
