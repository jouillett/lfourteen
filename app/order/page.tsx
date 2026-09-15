"use client";

import { useState, useEffect, useRef } from "react";
import DesktopOrder from "../../components/DesktopOrder";
import MobileOrder from "../../components/MobileOrder";

export default function OrderPage() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const hasAlerted = useRef(false);

  useEffect(() => {
    if (!hasAlerted.current) {
      alert("현대카드, 우리카드, 하나카드는 현재 결제 서비스 준비중입니다.\n다른 카드사를 선택해주세요.");
      hasAlerted.current = true;
    }
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent hydration mismatch and avoid rendering both components simultaneously
  if (isMobile === null) {
    return <div className="min-h-screen bg-surface flex items-center justify-center"></div>;
  }

  return isMobile ? <MobileOrder /> : <DesktopOrder />;
}
