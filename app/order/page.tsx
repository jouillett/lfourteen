"use client";

import { useState, useEffect } from "react";
import DesktopOrder from "../../components/DesktopOrder";
import MobileOrder from "../../components/MobileOrder";

export default function OrderPage() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
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
