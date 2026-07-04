"use client";

import { useState, useEffect } from "react";

const STATUS_MAP: Record<number, string> = {
  0: "결제완료",
  1: "배송중",
  2: "배송완료",
  3: "취소",
  4: "교환",
  5: "반품",
};

export default function SelectProductPage1() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const customerId = localStorage.getItem("customerId") || "3";
      try {
        const res = await fetch(`/api/inquiry/check-orders?customerId=${customerId}`);
        const data = await res.json();
        if (data.success && data.orders) {
          setOrders(data.orders);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="bg-surface min-h-screen text-on-surface antialiased flex flex-col">
      <header className="bg-surface sticky top-0 w-full z-50 border-b border-outline-variant/30">
        <div className="flex justify-between items-center w-full px-md py-sm max-w-container-max mx-auto">
          <div className="font-headline-md text-headline-md-mobile md:text-headline-md font-bold text-primary">
            주문 상품 선택
          </div>
          <button 
            className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors"
            onClick={() => {
              if (window.opener) {
                window.close();
              } else {
                window.history.back();
              }
            }}
          >
            close
          </button>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[800px] mx-auto p-md md:p-xl">
        <div className="bg-surface-container-low rounded-xl p-md md:p-lg shadow-sm border border-outline-variant/20">
          <h1 className="font-headline-lg text-headline-lg mb-2">어떤 상품에 대한 문의인가요?</h1>
          <p className="font-body-md text-on-surface-variant mb-6">최근 주문하신 상품 내역입니다. 문의하실 상품을 선택해주세요.</p>
          
          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="text-center py-8 text-on-surface-variant">불러오는 중...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant">주문 내역이 없습니다.</div>
            ) : (
              orders.map((order) => (
                <label 
                  key={order.id} 
                  className="flex items-center p-4 border border-outline-variant/40 rounded-lg hover:border-primary cursor-pointer transition-colors bg-surface-container-lowest"
                  onClick={(e) => {
                    e.preventDefault(); // prevent double firing from label+checkbox
                    alert('상품이 선택되었습니다.');
                    if (window.opener) {
                      window.opener.postMessage({ type: 'PRODUCT_SELECTED', order }, '*');
                      window.close();
                    }
                  }}
                >
                  {/* Checkbox */}
                  <input type="checkbox" className="mr-2 w-5 h-5 accent-primary cursor-pointer shrink-0" readOnly />

                  {/* Image */}
                  <img src={order.image || "https://via.placeholder.com/80"} alt="product" className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-md bg-surface-variant shrink-0" />
                  
                  {/* Info */}
                  <div className="ml-2 md:ml-3 flex-grow flex flex-col min-w-0">

                    {/* Desktop: Date + Order Number on same line, badge top-right */}
                    {/* Mobile: Date only (no order number) */}
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-caption text-outline text-xs md:text-sm leading-tight">
                        {/* Desktop: date | order_number */}
                        <span className="hidden md:inline">{new Date(order.created_at).toLocaleDateString()} | {order.order_number}</span>
                        {/* Mobile: date only */}
                        <span className="inline md:hidden">{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                      {/* Badge — top-right on desktop, next to name on mobile (rendered below) */}
                      <span className="hidden md:inline-flex font-label-md text-on-surface-variant bg-surface-variant/50 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap shrink-0">
                        {STATUS_MAP[order.status] || "알 수 없음"}
                      </span>
                    </div>

                    {/* Product Name row (+ mobile badge inline) */}
                    <div className="flex justify-between items-center mb-0.5">
                      <h3 className="font-label-md text-sm md:text-base font-semibold truncate pr-2">{order.order_name}</h3>
                      {/* Mobile Badge — next to product name */}
                      <span className="inline-flex md:hidden font-label-md text-on-surface-variant bg-surface-variant/50 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0">
                        {STATUS_MAP[order.status] || "알 수 없음"}
                      </span>
                    </div>

                    {/* Price */}
                    <span className="font-body-md text-sm md:text-base">{Number(order.total_price).toLocaleString()}원</span>
                  </div>
                </label>
              ))
            )}
          </div>

          {/* Pagination button - hidden since we load all current orders, or only show if we had pagination */}
          {orders.length > 10 && (
            <div className="mt-8 pt-6 border-t border-outline-variant/30 flex justify-center">
              <button className="text-primary font-label-md hover:underline flex items-center gap-1">
                더 이전 주문내역 보기 <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
