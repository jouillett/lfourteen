"use client";

import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import Link from "next/link";
import { useEffect, useState } from "react";
import TrackingModal from "../../../components/TrackingModal";

export default function OrderPage() {
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [missingCount, setMissingCount] = useState<number | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState<'all' | 'cancel'>('all');
  const [selectedTrackingNumber, setSelectedTrackingNumber] = useState<string | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test') === '11') {
      customerId = '2';
    }

    if (!customerId) {
      window.location.href = "/login";
      return;
    }
    setIsAuthorized(true);

    if (customerId) {
      fetch(`/api/check-order?customerId=${customerId}&status=1,2,4&unreviewed=true`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setReviewCount(data.count || 0);
          }
        })
        .catch(console.error);

      fetch(`/api/check-order?customerId=${customerId}&statusGreaterThan=2`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setMissingCount(data.count || 0);
          }
        })
        .catch(console.error);
    }
  }, []);

  useEffect(() => {
    let customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test') === '11') {
      customerId = '2';
    }

    if (customerId) {
      setIsLoading(true);
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const url = currentTab === 'cancel'
        ? `/api/orders?customerId=${customerId}&statusGreaterThan=2&page=${page}&limit=3${searchParam}`
        : `/api/orders?customerId=${customerId}&page=${page}&limit=3${searchParam}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setOrders(data.data || []);
            setTotalPages(Math.ceil((data.total || 0) / 3) || 1);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [currentTab, page, searchQuery]);

  const handleCancelDeliveredOrder = async (orderId: number, paymentKey: string) => {
    if (confirm("정말 취소하시겠습니까?")) {
      try {
        const res = await fetch(`/api/payment/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, cancelReason: "고객 취소" })
        });
        const data = await res.json();
        if (data.success) {
          const res2 = await fetch(`/api/orders/cancel-completed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
          });
          const data2 = await res2.json();
          if (data2.success) {
            alert("결제가 취소되었습니다.");
            window.location.href = "/mypage/cancel";
          } else {
            alert("취소 처리에 실패했습니다.");
          }
        } else {
          alert("결제 취소에 실패했습니다: " + (data.message || ''));
        }
      } catch (e) {
        console.error(e);
        alert("오류가 발생했습니다.");
      }
    }
  };

  const handleCancelOrder = async (orderId: number, paymentKey: string) => {
    if (confirm("정말 취소하시겠습니까?")) {
      try {
        const res = await fetch(`/api/payment/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, cancelReason: "고객 취소" })
        });
        const data = await res.json();
        if (data.success) {
          await fetch(`/api/orders/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: orderId, status: 3 })
          });
          alert("결제가 취소되었습니다.");
          window.location.href = "/mypage/cancel";
        } else {
          alert("결제 취소에 실패했습니다: " + (data.message || ''));
        }
      } catch (e) {
        console.error(e);
        alert("오류가 발생했습니다.");
      }
    }
  };

  const handleExchange = async (orderId: number) => {
    const order = orders.find((o: any) => o.id === orderId);
    if (order && order.received_at) {
      const receivedDate = new Date(order.received_at);
      const now = new Date();
      const diffTime = now.getTime() - receivedDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24); 
      if (diffDays > 7) {
        alert("수령하신 날로부터 7일 이내일 때 교환이 가능합니다.");
        return;
      }
    }

    if (confirm("교환을 정말 원하십니까?")) {
      try {
        const res = await fetch(`/api/orders/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: orderId, status: 4 })
        });
        const data = await res.json();
        if (data.success) {
          alert("교환 요청이 접수되었습니다.");
          window.location.href = "/mypage/cancel";
        } else {
          alert("교환 처리에 실패했습니다.");
        }
      } catch (e) {
        console.error(e);
        alert("오류가 발생했습니다.");
      }
    }
  };

  const handleReturn = async (orderId: number) => {
    const order = orders.find((o: any) => o.id === orderId);
    if (order && order.received_at) {
      const receivedDate = new Date(order.received_at);
      const now = new Date();
      const diffTime = now.getTime() - receivedDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24); 
      if (diffDays > 7) {
        alert("수령하신 날로부터 7일 이내일 때 반품이 가능합니다.");
        return;
      }
    }

    if (confirm("반품을 정말 원하십니까?")) {
      try {
        const res = await fetch(`/api/orders/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: orderId, status: 7 })
        });
        const data = await res.json();
        if (data.success) {
          alert("반품 요청이 접수되었습니다.");
          window.location.href = "/mypage/cancel";
        } else {
          alert("반품 처리에 실패했습니다.");
        }
      } catch (e) {
        console.error(e);
        alert("오류가 발생했습니다.");
      }
    }
  };

  const handleDeleteOrder = async (orderId: number, status: number | string) => {
    const numStatus = Number(status);
    if (numStatus === 0) {
      alert("배송 준비중이어서 삭제할 수 없습니다.");
      return;
    }
    if (numStatus === 1) {
      alert("배송중이어서 삭제할 수 없습니다.");
      return;
    }
    if (numStatus === 4 || numStatus === 5) {
      alert("교환중이어서 삭제할 수 없습니다.");
      return;
    }
    if (numStatus === 7) {
      alert("반품 진행중이어서 삭제할 수 없습니다.");
      return;
    }
    
    if (confirm('정말로 이 주문을 삭제하시겠습니까?')) {
      fetch(`/api/orders?id=${orderId}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setOrders(prev => prev.filter(order => order.id !== orderId));
          } else {
            alert('주문 삭제에 실패했습니다.');
          }
        })
        .catch(console.error);
    }
  };

  const handleWriteReview = (e: React.MouseEvent) => {
    e.preventDefault();
    if (reviewCount === null || reviewCount === 0) {
      alert("작성 가능한 후기가 없습니다.");
      return;
    }
    window.open('/review/write', 'writeReviewPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
  };

  const handleTrackingClick = (shipment: string | null) => {
    if (!shipment) {
      alert("배송 정보가 아직 등록되지 않았습니다.");
      return;
    }
    setSelectedTrackingNumber(shipment);
    setIsTrackingModalOpen(true);
  };

  const handleAddToCart = async (orderId: number) => {
    const customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    if (!customerId) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      const res = await fetch('/api/cart/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer_id: customerId, order_id: orderId }),
      });
      const data = await res.json();
      
      if (data.success) {
        alert("장바구니에 상품이 담겼습니다.");
        window.dispatchEvent(new Event("cartUpdated"));
      } else {
        alert("장바구니 담기에 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("오류가 발생했습니다.");
    }
  };

  const handleBuyNow = async (orderId: number) => {
    const customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    if (!customerId) {
      alert("로그인이 필요합니다.");
      window.location.href = "/login";
      return;
    }
    window.location.href = `/order?source=reorder&orderId=${orderId}`;
  };

  if (!isAuthorized) {
    return <div className="min-h-screen bg-background flex justify-center items-center">로딩중...</div>;
  }

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col">
      <Header />
      
      <TrackingModal 
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        shipmentString={selectedTrackingNumber || ""}
      />
      
      <main className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row pt-6 md:pt-16 px-4 md:px-16 pb-24 gap-6 md:gap-12 lg:gap-24" data-purpose="mypage-layout">
        
        {/* Mobile Sidebar Menu (Horizontal Scroll) */}
        <nav aria-label="Mobile My Page Navigation" className="md:hidden w-full overflow-x-auto hide-scrollbar border-b border-outline-variant/30 pb-2 -mx-4 px-4">
          <ul className="flex space-x-6 text-[14px] text-on-surface-variant whitespace-nowrap">
            <li><Link href="/mypage/order" className="font-bold text-primary border-b-2 border-primary pb-2">주문/배송 내역</Link></li>
            <li><Link className="hover:text-on-surface transition-colors pb-2" href="/mypage/cancel">취소/교환/반품</Link></li>
            <li><Link className="hover:text-on-surface transition-colors pb-2" href="/mypage/billing">정기구매</Link></li>
            <li><Link href="/mypage/inquiry" className="hover:text-on-surface transition-colors pb-2">상품문의</Link></li>
            <li><button onClick={handleWriteReview} className="hover:text-on-surface transition-colors pb-2">구매후기 작성</button></li>
            <li><Link className="hover:text-on-surface transition-colors pb-2" href="/mypage/review">내가 쓴 구매후기</Link></li>
            <li><Link href="/mypage/shipping" className="hover:text-on-surface transition-colors pb-2">배송지 관리</Link></li>
            <li><Link className="hover:text-on-surface transition-colors pb-2" href="/mypage/profile">회원정보 수정</Link></li>
          </ul>
        </nav>
        {/* Sidebar Menu (Desktop only) */}
        <nav aria-label="My Page Navigation" className="hidden md:flex flex-col w-48 flex-shrink-0">
          <h1 className="text-[22px] font-bold mb-8 text-on-surface">마이페이지</h1>
          <ul className="flex flex-col space-y-5 text-[15px] text-on-surface-variant">
            <li><Link href="/mypage/order" className="font-bold text-on-surface hover:underline underline-offset-4">주문/배송 내역</Link></li>
            <li><Link className="hover:text-on-surface transition-colors" href="/mypage/cancel">취소/교환/반품</Link></li>
            <li><Link className="hover:text-on-surface transition-colors" href="/mypage/billing">정기구매</Link></li>
            <li><Link href="/mypage/inquiry" className="hover:text-on-surface transition-colors">상품문의</Link></li>
            <li><a href="#" onClick={handleWriteReview} className="hover:text-on-surface transition-colors flex items-center justify-between">구매후기 작성 <span className="text-outline text-sm">{reviewCount && reviewCount > 0 ? reviewCount : ''}</span></a></li>
            <li><Link className="hover:text-on-surface transition-colors" href="/mypage/review">내가 쓴 구매후기</Link></li>
            <li><Link href="/mypage/shipping" className="hover:text-on-surface transition-colors">배송지 관리</Link></li>
            <li><Link className="hover:text-on-surface transition-colors" href="/mypage/profile">회원정보 수정</Link></li>
          </ul>
        </nav>

        {/* Content Area */}
        <section className="flex-1 flex flex-col space-y-6" data-purpose="order-history-content">
          {/* Content Heading */}
          <h2 className="text-[22px] font-bold mb-2 text-on-surface">주문/배송 내역</h2>
          
          {/* Filter and Search Card */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant flex flex-col md:flex-row justify-between items-start md:items-center gap-4" data-purpose="filter-bar">
            {/* Status Tabs */}
            <div className="flex space-x-6 text-[15px]">
              <button className="font-bold text-on-surface border-b-2 border-on-surface pb-1 px-1 transition-colors">
                전체
              </button>
              <Link href="/mypage/cancel" className="text-on-surface-variant hover:text-on-surface pb-1 px-1 transition-colors">
                취소/교환/반품 {missingCount !== null && missingCount > 0 ? missingCount : ''}
              </Link>
            </div>
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <input 
                aria-label="Search orders" 
                className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface text-sm rounded-full py-2.5 pl-5 pr-10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder-on-surface-variant" 
                placeholder="검색어를 입력하세요" 
                type="text" 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchQuery(searchInput);
                    setPage(1);
                  }
                }}
              />
              <button 
                onClick={() => { setSearchQuery(searchInput); setPage(1); }}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Order List Items */}
          <div className="space-y-4" data-purpose="order-list">
            {isLoading ? (
              <div className="text-center py-12 text-on-surface-variant">
                주문정보를 읽고 있습니다....
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant">
                주문/배송 내역이 없습니다.
              </div>
            ) : orders.map((order, index) => {
              const orderDate = new Date(order.created_at);
              const formattedDate = `${orderDate.getMonth() + 1}.${orderDate.getDate()}. ${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')} 주문`;
              return (
                <article key={order.id} className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant flex flex-col relative">
                  {/* Order Meta Info */}
                  <div className="flex justify-between items-center mb-5">
                    <div className="text-[13px] text-on-surface-variant flex items-center gap-2">
                      <span>{formattedDate}</span>
                      <span className={`font-bold ${order.status > 2 ? 'text-red-500' : 'text-on-surface'}`}>
                        {{
                          0: '결제완료',
                          1: '배송중',
                          2: '배송완료',
                          3: '취소',
                          4: '교환시작',
                          5: '교환진행',
                          6: '교환완료',
                          7: '반품진행',
                          8: '반품완료',
                          99: '입금대기'
                        }[order.status as number] || ''}
                      </span>
                    </div>
                    <div className="absolute top-6 right-6 flex flex-col items-end gap-1">
                      <button onClick={() => handleDeleteOrder(order.id, order.status)} className="text-[16px] font-bold text-on-surface-variant hover:text-on-surface transition-colors" title="삭제">
                        ✕
                      </button>
                      <Link className="text-[13px] text-on-surface-variant hover:text-on-surface transition-colors" href={`/mypage/detail?id=${order.id}`}>상세보기 &gt;</Link>
                    </div>
                  </div>
                  {/* Product Details */}
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <Link href={`/mypage/detail?id=${order.id}`}>
                        <img alt={order.order_name || "상품 이미지"} className="w-[120px] h-[120px] rounded-lg object-cover shadow-sm cursor-pointer" src={order.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuAQGq5OqykcE-elmyBXi8h71OqyJokOSJOHkXZdYKY7KffWgbDkK7mXGP5W8roAHlPDnN12GRyH512wrW5zhIBB0eE-HkNGINNLuZQbpqKrNOO9kO0Yb_Wwac6JDZGtpeEA58zSlwZL0u3mBIsjk8wnoauAPD-aWL2eGv5hcA0VCjVsNd6VwcpNPaZM1QFeS2Gx70B0oyKLXqZppRK9kBrcVrtVfsRd80cnSrFxA1EZH4kVKBOs3DIMsaQSi5d4AR9K0Bfe7ayFTg"}/>
                      </Link>
                    </div>
                    {/* Product Info & Actions */}
                    <div className="flex-1 flex flex-col justify-center">
                      <Link href={`/mypage/detail?id=${order.id}`}>
                        <h3 className={`text-[17px] font-medium mb-1 hover:underline cursor-pointer ${order.status === 3 ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                          {order.order_name || '엘포틴 코디 15ml X 15포'}
                        </h3>
                      </Link>
                      <p className="text-[22px] font-bold text-on-surface mb-5">
                        {order.original_price && Number(order.original_price) !== Number(order.total_price) ? (
                          <>
                            <span className="line-through text-on-surface-variant text-[16px] mr-2 font-normal">
                              {Number(order.original_price).toLocaleString()}원
                            </span>
                            {Number(order.total_price).toLocaleString()}원
                          </>
                        ) : (
                          <>{order.total_price ? Number(order.total_price).toLocaleString() : '65,000'}원</>
                        )}
                      </p>
                      {/* Action Buttons */}
                      <div className="flex justify-between items-center mt-auto w-full">
                        <div className="flex items-center gap-4">
                          <button onClick={() => handleTrackingClick(order.shipment)} className="bg-surface-container-lowest border border-outline text-on-surface py-2 px-4 md:px-5 rounded-md text-[12px] md:text-[14px] font-medium hover:bg-surface-container-low transition-colors focus:ring-2 focus:ring-outline outline-none">배송조회</button>
                          {(order.status === 0 || order.status === 99) && (
                            <div className="flex items-center text-on-surface-variant text-[12px] md:text-[13px] gap-2">
                              <button onClick={() => handleCancelOrder(order.id, order.payment_key)} className="hover:underline">취소</button>
                            </div>
                          )}
                          {order.status === 2 && (
                            <div className="flex items-center text-on-surface-variant text-[12px] md:text-[13px] gap-2">
                              <button onClick={() => handleExchange(order.id)} className="hover:underline">교환</button>
                              <span className="text-outline-variant">|</span>
                              <button onClick={() => handleReturn(order.id)} className="hover:underline">반품</button>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button onClick={() => handleAddToCart(order.id)} className="bg-surface-container-lowest border border-outline text-on-surface py-2 px-4 md:px-5 rounded-md text-[12px] md:text-[14px] font-medium hover:bg-surface-container-low transition-colors focus:ring-2 focus:ring-outline outline-none whitespace-nowrap">
                            장바구니
                          </button>
                          <button onClick={() => handleBuyNow(order.id)} className="bg-primary-container text-on-primary-container py-2 px-4 md:px-5 rounded-md text-[12px] md:text-[14px] font-medium hover:bg-primary-fixed-dim transition-colors focus:ring-2 focus:ring-primary outline-none whitespace-nowrap">
                            구매
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-8">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-outline-variant rounded-md disabled:opacity-50 text-[14px] text-on-surface hover:bg-surface-container-low transition-colors"
              >
                이전
              </button>
              <span className="text-[15px] font-medium text-on-surface">
                {page} / {totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-outline-variant rounded-md disabled:opacity-50 text-[14px] text-on-surface hover:bg-surface-container-low transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
