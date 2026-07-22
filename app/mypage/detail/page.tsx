"use client";

import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TrackingModal from "../../../components/TrackingModal";

function OrderDetailContent() {
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [missingCount, setMissingCount] = useState<number | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('id');
  const [selectedTrackingNumber, setSelectedTrackingNumber] = useState<string | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [selectedShipmentType, setSelectedShipmentType] = useState<string>('shipment');

  useEffect(() => {
    const customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
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

      if (orderId) {
        fetch(`/api/order-detail?id=${orderId}&customerId=${customerId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setOrder(data.order);
              setItems(data.items || []);
            } else {
              alert("주문 정보를 불러오지 못했습니다.");
            }
          })
          .catch(console.error);
      }
    } else {
      window.location.href = "/login";
    }
  }, [orderId]);

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

  const getStatusText = (status: number) => {
    switch(status) {
      case 0: return "결제완료";
      case 1: return "배송중";
      case 2: return "배송완료";
      case 3: return "취소";
      case 4: return "교환시작";
      case 5: return "교환진행";
      case 6: return "교환완료";
      case 7: return "반품진행";
      case 8: return "반품";
      case 99: return "입금대기";
      default: return "";
    }
  };

  const getStatusDescription = (status: number) => {
    switch(status) {
      case 0: return "고객님의 주문이 정상적으로 완료되었습니다.";
      case 1: return "상품이 고객님을 향해 출발했습니다.";
      case 2: return "상품이 고객님께 도착했습니다.";
      case 3: return "주문이 정상적으로 취소되었습니다.";
      case 4: return "교환 요청이 정상적으로 접수되었습니다.";
      case 5: return "교환 상품을 준비 및 배송 중입니다.";
      case 6: return "교환 처리가 완료되었습니다.";
      case 7: return "반품 요청이 접수되어 처리 중입니다.";
      case 8: return "반품 처리가 완료되었습니다.";
      case 99: return "고객님의 입금을 기다리고 있습니다.";
      default: return "";
    }
  };

  if (!order) {
    return (
      <div className="bg-background text-on-background antialiased min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto w-full flex items-center justify-center">
          <p>로딩중...</p>
        </main>
        <Footer />
      </div>
    );
  }

  const orderDate = new Date(order.created_at);
  const formattedDate = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')} ${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`;

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
        <section className="flex-1 flex flex-col space-y-6" data-purpose="order-detail-content">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[22px] font-bold text-on-surface">주문 상세내역</h2>
            <Link href="/mypage/order" className="text-sm text-on-surface-variant hover:text-on-surface border border-outline-variant rounded px-3 py-1.5 transition-colors">목록보기</Link>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant flex flex-col gap-6">
            
            <div className="border-b border-outline-variant/50 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div>
                <span className="text-on-surface-variant text-sm mr-4">주문일자: {formattedDate}</span>
                <span className="text-on-surface-variant text-sm">주문번호: {order.order_number}</span>
              </div>
            </div>

            <div className="bg-[#FAFAFA] rounded-xl p-8 flex flex-col items-center justify-center border border-outline-variant/30 text-center">
              <h3 className="text-[24px] font-bold text-on-surface mb-2">{getStatusText(order.status)}</h3>
              <p className="text-on-surface-variant text-[15px]">{getStatusDescription(order.status)}</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-[18px] font-bold text-on-surface">주문 상품</h3>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-center bg-[#F9F9F9] p-4 rounded-lg border border-outline-variant/30">
                  <div className="w-20 h-20 bg-surface-container rounded-md overflow-hidden flex-shrink-0">
                    <img src={item.product_image || ''} alt={item.product_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[15px] text-on-surface">{item.product_name}</p>
                    <p className="text-sm text-on-surface-variant mt-1">옵션: {item.option_quantity_val}개입 | 수량: {item.order_quantity}개</p>
                  </div>
                  <div className="font-bold text-lg text-on-surface flex-shrink-0">
                    {(item.unit_price * item.order_quantity).toLocaleString()}원
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between items-center mt-4 w-full border border-outline-variant/30 p-4 rounded-lg bg-surface-container-lowest">
                {(() => {
                  const hasReshipment = !!order.reshipment;
                  const hasReturn = !!order.return;
                  const hasShipment = !!order.shipment;

                  const extraButtons = (
                    <>
                      {Number(order.status) === 0 && (
                        <button onClick={() => handleCancelOrder(order.id, order.payment_key)} className="bg-surface-container-lowest border border-outline text-on-surface py-2 px-4 md:px-5 rounded-md text-[12px] md:text-[14px] font-medium hover:bg-surface-container-low transition-colors focus:ring-2 focus:ring-outline outline-none">결제취소</button>
                      )}
                      {Number(order.status) === 2 && (
                        <>
                          <button onClick={() => handleReturn(order.id)} className="bg-surface-container-lowest border border-outline text-on-surface py-2 px-4 md:px-5 rounded-md text-[12px] md:text-[14px] font-medium hover:bg-surface-container-low transition-colors focus:ring-2 focus:ring-outline outline-none">반품신청</button>
                          <button onClick={() => handleExchange(order.id)} className="bg-surface-container-lowest border border-outline text-on-surface py-2 px-4 md:px-5 rounded-md text-[12px] md:text-[14px] font-medium hover:bg-surface-container-low transition-colors focus:ring-2 focus:ring-outline outline-none">교환신청</button>
                        </>
                      )}
                    </>
                  );

                  if (hasShipment && hasReturn && hasReshipment) {
                    return (
                      <div className="flex items-center gap-2 flex-wrap">
                        <select 
                          className="border border-outline text-on-surface py-2 px-3 rounded-md text-[12px] md:text-[14px] bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                          value={selectedShipmentType}
                          onChange={(e) => setSelectedShipmentType(e.target.value)}
                        >
                          <option value="shipment">업체배송</option>
                          <option value="return">고객배송</option>
                          <option value="reshipment">업체재배송</option>
                        </select>
                        <button onClick={() => handleTrackingClick(order[selectedShipmentType])} className="bg-surface-container-lowest border border-outline text-on-surface py-2 px-4 md:px-5 rounded-md text-[12px] md:text-[14px] font-medium hover:bg-surface-container-low transition-colors focus:ring-2 focus:ring-outline outline-none">배송조회</button>
                        {extraButtons}
                      </div>
                    );
                  } else if (hasShipment && hasReturn) {
                    return (
                      <div className="flex items-center gap-2 flex-wrap">
                        <select 
                          className="border border-outline text-on-surface py-2 px-3 rounded-md text-[12px] md:text-[14px] bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                          value={selectedShipmentType}
                          onChange={(e) => setSelectedShipmentType(e.target.value)}
                        >
                          <option value="shipment">업체배송</option>
                          <option value="return">고객배송</option>
                        </select>
                        <button onClick={() => handleTrackingClick(order[selectedShipmentType])} className="bg-surface-container-lowest border border-outline text-on-surface py-2 px-4 md:px-5 rounded-md text-[12px] md:text-[14px] font-medium hover:bg-surface-container-low transition-colors focus:ring-2 focus:ring-outline outline-none">배송조회</button>
                        {extraButtons}
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => handleTrackingClick(order.shipment)} className="bg-surface-container-lowest border border-outline text-on-surface py-2 px-4 md:px-5 rounded-md text-[12px] md:text-[14px] font-medium hover:bg-surface-container-low transition-colors focus:ring-2 focus:ring-outline outline-none">배송조회</button>
                        {extraButtons}
                      </div>
                    );
                  }
                })()}
                <div className="flex space-x-2">
                  <button onClick={() => handleAddToCart(order.id)} className="bg-surface-container-lowest border border-outline text-on-surface py-2 px-4 md:px-5 rounded-md text-[12px] md:text-[14px] font-medium hover:bg-surface-container-low transition-colors focus:ring-2 focus:ring-outline outline-none">
                    장바구니
                  </button>
                  <button onClick={() => handleBuyNow(order.id)} className="bg-primary-container text-on-primary-container py-2 px-4 md:px-5 rounded-md text-[12px] md:text-[14px] font-medium hover:bg-primary-fixed-dim transition-colors focus:ring-2 focus:ring-primary outline-none">
                    구매하기
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="border border-outline-variant/50 rounded-lg p-5">
                <h3 className="font-bold text-[16px] text-on-surface mb-4">결제 정보</h3>
                <div className="space-y-3 text-[14px]">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">결제수단</span>
                    <span className="text-on-surface font-medium">{order.payment_method || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">총 상품금액</span>
                    <span className="text-on-surface font-medium">{order.original_price ? order.original_price.toLocaleString() : (order.total_price ? order.total_price.toLocaleString() : '0')}원</span>
                  </div>
                  {order.original_price && order.original_price !== order.total_price && (
                    <div className="flex justify-between">
                      <span className="text-primary/80">포인트 삭감</span>
                      <span className="text-primary font-medium">-{ (order.original_price - order.total_price).toLocaleString() }원</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-outline-variant/30 pt-3">
                    <span className="font-bold text-on-surface">총 결제금액</span>
                    <span className="font-bold text-primary text-[16px]">{order.total_price ? order.total_price.toLocaleString() : '0'}원</span>
                  </div>
                </div>
              </div>

              <div className="border border-outline-variant/50 rounded-lg p-5">
                <h3 className="font-bold text-[16px] text-on-surface mb-4">배송 정보</h3>
                <div className="space-y-3 text-[14px]">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant w-24 flex-shrink-0">받는사람</span>
                    <span className="text-on-surface font-medium text-right">{order.receiver_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant w-24 flex-shrink-0">연락처</span>
                    <span className="text-on-surface font-medium text-right">{order.receiver_mobile || order.receiver_phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant w-24 flex-shrink-0">주소</span>
                    <span className="text-on-surface font-medium text-right">{order.receiver_address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant w-24 flex-shrink-0">배송메모</span>
                    <span className="text-on-surface font-medium text-right">{order.delivery_message || '없음'}</span>
                  </div>
                  <div className="flex justify-between border-t border-outline-variant/30 pt-3">
                    <span className="font-bold text-on-surface w-24 flex-shrink-0">진행상태</span>
                    <span className="font-bold text-primary text-[16px] text-right">{getStatusText(order.status)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩중...</div>}>
      <OrderDetailContent />
    </Suspense>
  );
}
