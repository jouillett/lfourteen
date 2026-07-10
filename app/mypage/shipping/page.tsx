"use client";

import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AddressList from "../../../components/AddressList";

export default function ShippingPage() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("customerId") || localStorage.getItem("userId");
    if (!id) {
        alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }
    setCustomerId(id);

    fetch(`/api/check-order?customerId=${id}&status=1,2,4&unreviewed=true`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setReviewCount(data.count || 0);
        }
      })
      .catch(console.error);
  }, [router]);

  const handleWriteReview = (e: React.MouseEvent) => {
    e.preventDefault();
    if (reviewCount === null || reviewCount === 0) {
      alert("작성 가능한 후기가 없습니다.");
      return;
    }
    window.open('/review/write', 'writeReviewPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
  };

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row pt-6 md:pt-16 px-4 md:px-16 pb-24 gap-6 md:gap-12 lg:gap-24" data-purpose="mypage-layout">
        
        {/* Mobile Sidebar Menu (Horizontal Scroll) */}
        <nav aria-label="Mobile My Page Navigation" className="md:hidden w-full overflow-x-auto hide-scrollbar border-b border-outline-variant/30 pb-2 -mx-4 px-4">
          <ul className="flex space-x-6 text-[14px] text-on-surface-variant whitespace-nowrap">
            <li><Link href="/mypage/order" className="hover:text-on-surface transition-colors pb-2">주문/배송 내역</Link></li>
            <li><Link className="hover:text-on-surface transition-colors pb-2" href="/mypage/cancel">취소/교환/반품</Link></li>
            <li><Link className="hover:text-on-surface transition-colors pb-2" href="/mypage/billing">정기구매</Link></li>
            <li><Link href="/mypage/inquiry" className="hover:text-on-surface transition-colors pb-2">상품문의</Link></li>
            <li><button onClick={handleWriteReview} className="hover:text-on-surface transition-colors pb-2">구매후기 작성</button></li>
            <li><Link className="hover:text-on-surface transition-colors pb-2" href="/mypage/review">내가 쓴 구매후기</Link></li>
            <li><Link href="/mypage/shipping" className="font-bold text-primary border-b-2 border-primary pb-2">배송지 관리</Link></li>
            <li><Link href="/mypage/profile" className="hover:text-on-surface transition-colors pb-2">회원정보 수정</Link></li>
          </ul>
        </nav>
        {/* Sidebar Menu (Desktop only) */}
        <nav aria-label="My Page Navigation" className="hidden md:flex flex-col w-48 flex-shrink-0">
          <h1 className="text-[22px] font-bold mb-8 text-on-surface">마이페이지</h1>
          <ul className="flex flex-col space-y-5 text-[15px] text-on-surface-variant">
            <li><Link href="/mypage/order" className="hover:text-on-surface transition-colors">주문/배송 내역</Link></li>
            <li><Link className="hover:text-on-surface transition-colors" href="/mypage/cancel">취소/교환/반품</Link></li>
            <li><Link className="hover:text-on-surface transition-colors" href="/mypage/billing">정기구매</Link></li>
            <li><Link href="/mypage/inquiry" className="hover:text-on-surface transition-colors">상품문의</Link></li>
            <li><a href="#" onClick={handleWriteReview} className="hover:text-on-surface transition-colors flex items-center justify-between">구매후기 작성 <span className="text-outline text-sm">{reviewCount && reviewCount > 0 ? reviewCount : ''}</span></a></li>
            <li><Link className="hover:text-on-surface transition-colors" href="/mypage/review">내가 쓴 구매후기</Link></li>
            <li><Link href="/mypage/shipping" className="font-bold text-on-surface hover:underline underline-offset-4">배송지 관리</Link></li>
            <li><Link href="/mypage/profile" className="hover:text-on-surface transition-colors">회원정보 수정</Link></li>
          </ul>
        </nav>

        {/* Content Area */}
        <section className="flex-1 flex flex-col space-y-6" data-purpose="shipping-content">
          <h2 className="text-[20px] font-bold text-on-surface">배송지 관리</h2>
          
          <div className="w-full">
            {customerId ? (
              <AddressList userId={customerId} />
            ) : (
          <div className="text-center py-10">로그인 정보를 불러오는 중입니다...</div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
