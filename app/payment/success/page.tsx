"use client";

import { useState, useEffect } from "react";
import DesktopPaymentSuccess from "../../../components/DesktopPaymentSuccess";
import MobilePaymentSuccess from "../../../components/MobilePaymentSuccess";

export default function PaymentSuccessPage() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile === null) {
    return <div className="min-h-screen bg-surface" />;
  }

  return isMobile ? <MobilePaymentSuccess /> : <DesktopPaymentSuccess />;
}
