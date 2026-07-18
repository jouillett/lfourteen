"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "./Header";
import Footer from "./Footer";

interface BillingItem {
  item_id: number;
  product_id: number;
  priced_id: number;
  quantity: number;
  product_name: string;
  option_quantity_val: string;
  price: string;
}

interface BillingInfo {
  id: number;
  interval: number;
  period: number;
  next_billing_at: string;
  created_at: string;
}

interface AvailableOption {
  priced_id: number;
  product_name: string;
  option_quantity_val: string;
  price: string;
}

export default function MypageBilling() {
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [items, setItems] = useState<(BillingItem & { isNew?: boolean })[]>([]);
  const [availableOptions, setAvailableOptions] = useState<AvailableOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<number | "">("");
  const [reviewCount, setReviewCount] = useState<number | null>(null);

  useEffect(() => {
    const customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    if (!customerId) {
      window.location.href = "/login?redirect=/mypage/billing";
      return;
    }

    fetchBillingInfo(customerId);

    // Fetch review count for sidebar
    fetch(`/api/check-order?customerId=${customerId}&status=1,2,4&unreviewed=true`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setReviewCount(data.count || 0);
        }
      })
      .catch(console.error);
  }, []);

  const fetchBillingInfo = async (customerId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mypage/billing?userId=${customerId}`);
      const data = await res.json();
      if (data.success) {
        setIsSubscribed(data.subscribed);
        if (data.subscribed) {
          setBillingInfo(data.billing);
          setItems(data.items);
          setAvailableOptions(data.availableOptions || []);
        }
      } else {
        alert("정보를 불러오는데 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("정말 정기구매를 취소하시겠습니까?")) return;
    
    const customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    try {
      const res = await fetch(`/api/mypage/billing?userId=${customerId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        alert("정기구매가 취소되었습니다.");
        fetchBillingInfo(customerId as string);
      } else {
        alert("취소 처리에 실패했습니다: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("오류가 발생했습니다.");
    }
  };

  const handleUpdate = async () => {
    const customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    if (!billingInfo) return;

    try {
      const res = await fetch(`/api/mypage/billing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: customerId,
          billingId: billingInfo.id,
          interval: billingInfo.interval,
          period: billingInfo.period,
          items: items.map(item => ({
            action: item.quantity === 0 ? "delete" : (item.isNew ? "add" : "update"),
            item_id: item.item_id,
            quantity: item.quantity,
            priced_id: item.priced_id
          }))
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("변경사항이 저장되었습니다.");
        fetchBillingInfo(customerId as string);
      } else {
        alert("변경에 실패했습니다: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("오류가 발생했습니다.");
    }
  };

  const handleAddProduct = () => {
    if (selectedOptionId === "") return;
    const option = availableOptions.find(o => o.priced_id === selectedOptionId);
    if (!option) return;

    // Check if already in items
    const existing = items.find(i => i.priced_id === selectedOptionId);
    if (existing) {
      alert("이미 추가된 상품 옵션입니다.");
      return;
    }

    const newItem = {
      item_id: Date.now(), // temporary ID
      product_id: 1,
      priced_id: option.priced_id,
      quantity: 1,
      product_name: option.product_name,
      option_quantity_val: option.option_quantity_val,
      price: option.price,
      isNew: true
    };
    setItems(prev => [...prev, newItem]);
    setSelectedOptionId("");
  };

  const handleQuantityChange = (itemId: number, newQty: number) => {
    if (newQty < 1) {
      if (confirm("이 상품을 정기구매에서 제외하시겠습니까? (저장 시 반영됩니다)")) {
        setItems(prev => prev.map(i => i.item_id === itemId ? { ...i, quantity: 0 } : i));
      }
      return;
    }
    setItems(prev => prev.map(i => i.item_id === itemId ? { ...i, quantity: newQty } : i));
  };

  const handleWriteReview = (e: React.MouseEvent) => {
    e.preventDefault();
    if (reviewCount === null || reviewCount === 0) {
      alert("작성 가능한 후기가 없습니다.");
      return;
    }
    window.open('/review/write', 'writeReviewPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
  };

  const renderSidebar = () => (
    <>
      {/* Mobile Sidebar */}
      <nav aria-label="Mobile My Page Navigation" className="md:hidden w-full overflow-x-auto hide-scrollbar border-b border-outline-variant/30 pb-2 -mx-4 px-4">
        <ul className="flex space-x-6 text-[14px] text-on-surface-variant whitespace-nowrap">
          <li><Link href="/mypage/order" className="hover:text-on-surface transition-colors pb-2">주문/배송 내역</Link></li>
          <li><Link href="/mypage/cancel" className="hover:text-on-surface transition-colors pb-2">취소/교환/반품</Link></li>
          <li><Link href="/mypage/billing" className="font-bold text-primary border-b-2 border-primary pb-2">정기구매</Link></li>
          <li><Link href="/mypage/inquiry" className="hover:text-on-surface transition-colors pb-2">상품문의</Link></li>
          <li><button onClick={handleWriteReview} className="hover:text-on-surface transition-colors pb-2">구매후기 작성</button></li>
          <li><Link href="/mypage/review" className="hover:text-on-surface transition-colors pb-2">내가 쓴 구매후기</Link></li>
          <li><Link href="/mypage/shipping" className="hover:text-on-surface transition-colors pb-2">배송지 관리</Link></li>
          <li><Link href="/mypage/profile" className="hover:text-on-surface transition-colors pb-2">회원정보 수정</Link></li>
        </ul>
      </nav>
      {/* Desktop Sidebar */}
      <nav aria-label="My Page Navigation" className="hidden md:flex flex-col w-48 flex-shrink-0">
        <h1 className="text-[22px] font-bold mb-8 text-on-surface">마이페이지</h1>
        <ul className="flex flex-col space-y-5 text-[15px] text-on-surface-variant">
          <li><Link href="/mypage/order" className="hover:text-on-surface transition-colors">주문/배송 내역</Link></li>
          <li><Link href="/mypage/cancel" className="hover:text-on-surface transition-colors">취소/교환/반품</Link></li>
          <li><Link href="/mypage/billing" className="font-bold text-on-surface hover:underline underline-offset-4">정기구매</Link></li>
          <li><Link href="/mypage/inquiry" className="hover:text-on-surface transition-colors">상품문의</Link></li>
          <li><a href="#" onClick={handleWriteReview} className="hover:text-on-surface transition-colors flex items-center justify-between">구매후기 작성 <span className="text-outline text-sm">{reviewCount && reviewCount > 0 ? reviewCount : ''}</span></a></li>
          <li><Link href="/mypage/review" className="hover:text-on-surface transition-colors">내가 쓴 구매후기</Link></li>
          <li><Link href="/mypage/shipping" className="hover:text-on-surface transition-colors">배송지 관리</Link></li>
          <li><Link href="/mypage/profile" className="hover:text-on-surface transition-colors">회원정보 수정</Link></li>
        </ul>
      </nav>
    </>
  );

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row pt-6 md:pt-16 px-4 md:px-16 pb-24 gap-6 md:gap-12 lg:gap-24">
        {renderSidebar()}
        <section className="flex-1 flex flex-col space-y-6">
          <h2 className="text-[22px] font-bold mb-2 text-on-surface">정기구매 관리</h2>
          
          {loading ? (
            <div className="py-20 text-center">로딩 중...</div>
          ) : !isSubscribed ? (
            <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant flex flex-col items-center justify-center py-20">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4">event_repeat</span>
              <p className="text-on-surface-variant text-lg mb-6">현재 이용 중인 정기구매 서비스가 없습니다.</p>
              <Link href="/billing" className="bg-primary text-on-primary px-8 py-3 rounded-full font-bold hover:opacity-90 transition-opacity">
                정기구매 신청하기
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Subscription Summary */}
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant">
                <h3 className="font-bold text-lg mb-4 text-on-surface">정기구매 요약</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between md:block">
                    <span className="text-on-surface-variant md:block mb-1">다음 결제 예정일</span>
                    <span className="font-bold text-primary text-base">
                      {billingInfo?.next_billing_at ? new Date(billingInfo.next_billing_at).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between md:block">
                    <span className="text-on-surface-variant md:block mb-1">배송 주기 설정</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <input 
                        type="number" 
                        value={billingInfo?.interval} 
                        onChange={(e) => setBillingInfo(prev => prev ? {...prev, interval: parseInt(e.target.value) || 1} : prev)}
                        className="w-16 bg-surface-container border border-outline-variant rounded px-2 py-1"
                        min="1"
                      />
                      <select 
                        value={billingInfo?.period}
                        onChange={(e) => setBillingInfo(prev => prev ? {...prev, period: parseInt(e.target.value)} : prev)}
                        className="bg-surface-container border border-outline-variant rounded px-2 py-1"
                      >
                        <option value={0}>주 단위</option>
                        <option value={1}>월 단위</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Management */}
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant">
                <h3 className="font-bold text-lg mb-4 text-on-surface">구독 상품 수정</h3>
                {items.filter(i => i.quantity > 0).length === 0 ? (
                  <p className="text-on-surface-variant py-4">등록된 구독 상품이 없습니다. 저장하시면 정기구매가 중단될 수 있습니다.</p>
                ) : (
                  <ul className="space-y-4">
                    {items.filter(i => i.quantity > 0).map(item => (
                      <li key={item.item_id} className="flex justify-between items-center py-2 border-b border-outline-variant/30 last:border-0">
                        <div>
                          <p className="font-bold text-on-surface">{item.product_name}</p>
                          <p className="text-xs text-on-surface-variant">옵션: {item.option_quantity_val} / 개당 {Number(item.price).toLocaleString()}원</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center border border-outline-variant rounded bg-surface-container overflow-hidden">
                            <button onClick={() => handleQuantityChange(item.item_id, item.quantity - 1)} className="px-3 py-1 hover:bg-surface-variant transition-colors">-</button>
                            <span className="px-3 py-1 font-bold">{item.quantity}</span>
                            <button onClick={() => handleQuantityChange(item.item_id, item.quantity + 1)} className="px-3 py-1 hover:bg-surface-variant transition-colors">+</button>
                          </div>
                          <span className="font-bold text-primary w-20 text-right">
                            {(Number(item.price) * item.quantity).toLocaleString()}원
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                
                {/* Add Product */}
                {availableOptions.length > 0 && (
                  <div className="mt-4 flex items-center space-x-2 bg-surface p-3 rounded border border-outline-variant/50 overflow-hidden">
                    <select 
                      value={selectedOptionId}
                      onChange={(e) => setSelectedOptionId(e.target.value ? Number(e.target.value) : "")}
                      className="min-w-0 flex-1 bg-surface-container border border-outline-variant rounded px-2 py-2 text-sm"
                    >
                      <option value="">+ 추가할 상품(옵션) 선택</option>
                      {availableOptions.map(opt => (
                        <option key={opt.priced_id} value={opt.priced_id}>
                          {opt.product_name} - {opt.option_quantity_val}개입 ({Number(opt.price).toLocaleString()}원)
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={handleAddProduct}
                      className="shrink-0 bg-secondary text-on-secondary px-4 py-2 rounded text-sm font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      추가
                    </button>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button onClick={handleUpdate} className="bg-primary text-on-primary px-6 py-2 rounded font-bold hover:opacity-90 transition-opacity">
                    변경사항 저장
                  </button>
                </div>
              </div>

              {/* Cancel Subscription */}
              <div className="bg-error/10 rounded-xl p-6 border border-error/20 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div className="mb-4 md:mb-0 w-full">
                  <h3 className="font-bold text-error mb-1">정기구매 서비스 취소</h3>
                  <p className="text-sm text-error/80 break-keep">정기구매를 취소하면 다음 결제 예정일부터 결제 및 배송이 중단됩니다.</p>
                </div>
                <button onClick={handleCancel} className="bg-error text-white w-full md:w-auto px-6 py-2 rounded font-bold hover:opacity-90 transition-opacity whitespace-nowrap">
                  구독 취소
                </button>
              </div>

            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
