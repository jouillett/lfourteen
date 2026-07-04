import React from "react";
import DesktopReviewList from "../../components/DesktopReviewList";
import MobileReviewList from "../../components/MobileReviewList";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export const metadata = {
  title: "기쁜하루 - 고객 리뷰"
};

export default function ReviewPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Header />
      <div className="flex-1 max-w-7xl mx-auto w-full">
        <>
          <style>{`
            @media (min-width: 768px) {
              .desktop-only-view { display: block !important; }
              .mobile-only-view { display: none !important; }
            }
            @media (max-width: 767px) {
              .desktop-only-view { display: none !important; }
              .mobile-only-view { display: block !important; }
            }
          `}</style>
          <div className="desktop-only-view">
          <DesktopReviewList />
        </div>
        <div className="mobile-only-view">
          <MobileReviewList />
        </div>
        </>
      </div>
      <Footer />
    </div>
  );
}
