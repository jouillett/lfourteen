"use client";

import { useState, useRef, useEffect } from "react";


export default function InquiryPage() {
  const [isSecret, setIsSecret] = useState(false);
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("상품 문의");
  const [hasOrders, setHasOrders] = useState(false);
  const [hasDeliveredOrders, setHasDeliveredOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    if (!customerId) {
      window.location.href = "/login";
      return;
    }
    setIsAuthorized(true);

    const params = new URLSearchParams(window.location.search);
    const id = params.get("edit_id");
    if (id) {
      setEditId(parseInt(id, 10));
      const type = params.get("type");
      if (type === "1:1 문의" || type === "my_qna") {
        setActiveTab("1:1 문의");
      }
      const secret = params.get("secret");
      if (secret === "1") setIsSecret(true);
      const text = params.get("content");
      if (text) setContent(text);
      // Wait, there is also product_id and order_id, let's keep it simple for now or parse them if needed.
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PRODUCT_SELECTED' && event.data?.order) {
        setSelectedOrder(event.data.order);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const checkOrders = async () => {
      const customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
      if (!customerId) return;
      try {
        const res = await fetch(`/api/inquiry/check-orders?customerId=${customerId}`);
        const data = await res.json();
        if (data.success && data.orders && data.orders.length > 0) {
          setHasOrders(true);
        }

        const resDelivered = await fetch(`/api/check-order?customerId=${customerId}&status=2`);
        const dataDelivered = await resDelivered.json();
        if (dataDelivered.success && dataDelivered.hasOrder) {
          setHasDeliveredOrders(true);
        }
      } catch (error) {
        console.error("Failed to check orders", error);
      }
    };
    checkOrders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert("문의 내용을 입력해주세요.");
      contentRef.current?.focus();
      return;
    }

    const customerId = localStorage.getItem("customerId");
    if (!customerId) {
      alert("로그인이 필요합니다.");
      window.location.href = '/login';
      return;
    }

    try {
      const res = await fetch("/api/qna", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          product_id: 1,
          customer_id: customerId,
          is_secret: isSecret ? 1 : 0,
          content: content,
          inquiry_type: activeTab,
          order_id: selectedOrder ? selectedOrder.id : 0
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(editId ? "문의가 수정되었습니다." : "문의가 등록되었습니다.");
        if (window.opener) {
          window.opener.postMessage({ type: 'RELOAD_QNA' }, '*');
          window.close();
        } else {
          window.history.back();
        }
      } else {
        alert("오류가 발생했습니다: " + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  if (!isAuthorized) {
    return <div className="min-h-screen bg-surface flex justify-center items-center">로딩중...</div>;
  }

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen antialiased selection:bg-primary-container selection:text-on-primary-container">
      <header className="bg-surface sticky top-0 w-full z-50">
        <div className="flex justify-between items-center w-full px-md py-sm max-w-container-max mx-auto">
          <div className="font-headline-md text-headline-md-mobile md:text-headline-md font-bold text-primary">
            L14 Cordy
          </div>
          <div className="flex items-center gap-sm">
            <span 
              className="material-symbols-outlined text-on-surface-variant hover:opacity-80 transition-opacity cursor-pointer active:scale-95 transition-transform" 
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  window.history.back();
                }
              }}
            >
              close
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow flex flex-col items-center justify-center py-lg md:py-xl px-md w-full">
        {/* Container - mobile vs desktop styles */}
        <div className="w-full max-w-[440px] md:max-w-[800px] md:bg-surface-container-low md:rounded-lg md:p-lg transition-shadow duration-300 flex flex-col gap-lg md:gap-0">
          
          {/* Header Text (Desktop & Mobile) */}
          <div className="mb-0 md:mb-lg flex flex-col gap-sm md:text-center mt-md md:mt-0">
            <h1 className="font-headline-lg text-headline-lg text-on-surface md:mb-sm hidden md:block">
              {activeTab}하기
            </h1>
            <h2 className="font-headline-lg text-headline-lg text-on-surface block md:hidden">
              무엇을 도와드릴까요?
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant md:text-left">
              상품, 배송, 교환/반품 등 궁금하신 점을 남겨주시면 정성껏 답변해 드리겠습니다.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-outline-variant/30 w-full mb-6 md:mb-8 mt-2 md:mt-4 relative">
            <div className="flex">
              <button
                type="button"
                onClick={() => setActiveTab("상품 문의")}
                className={`px-4 md:px-8 py-3 text-center font-label-md text-label-md transition-colors ${
                  activeTab === "상품 문의"
                    ? "border-b-2 border-primary text-primary font-bold"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                상품 문의
              </button>
              {hasOrders && (
                <button
                  type="button"
                  onClick={() => setActiveTab("1:1 문의")}
                  className={`px-4 md:px-8 py-3 text-center font-label-md text-label-md transition-colors ${
                    activeTab === "1:1 문의"
                      ? "border-b-2 border-primary text-primary font-bold"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  1:1 문의
                </button>
              )}
            </div>
            
            {/* Inquiry History */}
            {activeTab === "1:1 문의" && (
              <button 
                type="button"
                className="absolute right-2 bottom-3 text-on-surface-variant hover:text-primary font-label-md text-label-md transition-colors"
                onClick={() => {
                  window.open('/inquiry/history', 'inquiryHistory', 'width=800,height=800,scrollbars=yes');
                }}
              >
                문의/답변내역
              </button>
            )}
          </div>

          <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
            {/* Product Combo Box */}
            <div className="flex flex-col gap-xs">
              <div className="flex justify-between items-end ml-1 md:ml-0">
                <label className="font-label-md text-label-md text-on-surface-variant md:text-on-surface" htmlFor="product_inquiry">
                  문의 상품
                </label>
                {hasOrders && (
                  <button 
                    type="button" 
                    className="text-on-surface-variant hover:text-primary font-label-md text-label-md transition-colors flex items-center gap-1"
                    onClick={() => {
                      window.open('/inquiry/select-product-1', 'selectProduct', 'width=600,height=800,scrollbars=yes');
                    }}
                  >
                    주문 상품 선택 <span className="material-symbols-outlined text-[16px] leading-none">chevron_right</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <select 
                  className="appearance-none w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-3 md:py-sm md:px-md font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary md:focus:ring-2 transition-colors cursor-pointer" 
                  id="product_inquiry" 
                  name="product_inquiry"
                  defaultValue="cordy_15"
                >
                  <option value="cordy_15">엘포틴 코디 15ml X 15포</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 md:px-sm text-on-surface-variant">
                  <span className="material-symbols-outlined">expand_more</span>
                </div>
              </div>
            </div>

            {/* Selected Order Display */}
            {selectedOrder && (
              <div className="flex flex-col gap-xs mt-2">
                <label className="font-label-md text-label-md text-on-surface ml-1 md:ml-0 font-bold">선택된 주문 상품</label>
                <div className="flex items-center p-4 border border-outline-variant/40 rounded-lg bg-surface-container-lowest relative">
                  <button 
                    type="button" 
                    className="absolute top-2 right-2 text-on-surface-variant hover:text-primary"
                    onClick={() => setSelectedOrder(null)}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                  <img src={selectedOrder.image || "https://via.placeholder.com/80"} alt="product" className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-md bg-surface-variant shrink-0" />
                  <div className="ml-3 flex-grow flex flex-col min-w-0">
                    <div className="font-caption text-outline text-xs md:text-sm leading-tight mb-1">
                      {new Date(selectedOrder.created_at).toLocaleDateString()} 주문번호 {selectedOrder.order_number}
                    </div>
                    <h3 className="font-label-md text-sm md:text-base font-semibold truncate pr-6">{selectedOrder.order_name}</h3>
                    <span className="font-body-md text-sm md:text-base">{Number(selectedOrder.total_price).toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            )}

            {/* Content Textarea */}
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface-variant md:text-on-surface ml-1 md:ml-0" htmlFor="inquiry_content">
                내용
              </label>
              <textarea 
                ref={contentRef}
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-3 md:py-sm md:px-md font-body-md text-body-md text-on-surface placeholder:text-outline md:placeholder-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary md:focus:ring-2 transition-colors resize-y min-h-[120px]" 
                id="inquiry_content" 
                name="inquiry_content" 
                placeholder="문의 내용을 상세히 적어주세요." 
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                lang="ko"
              ></textarea>
            </div>

            {/* Secret Mode Checkbox */}
            {activeTab !== "1:1 문의" && (
              <div className="flex items-center mt-2 md:mt-sm">
                <div className="relative flex items-start">
                  <div className="flex h-6 items-center">
                    <input 
                      className="h-5 w-5 md:h-4 md:w-4 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary md:focus:ring-offset-surface-container-low transition-colors cursor-pointer" 
                      id="secret_inquiry" 
                      name="secret_inquiry" 
                      type="checkbox"
                      checked={isSecret}
                      onChange={(e) => setIsSecret(e.target.checked)}
                    />
                  </div>
                  <div className="ml-3 md:ml-2 text-sm leading-6 flex items-center gap-1 cursor-pointer" onClick={() => setIsSecret(!isSecret)}>
                    <label className="font-label-md text-label-md text-on-surface select-none cursor-pointer">
                      비밀글로 문의하기
                    </label>
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px] hidden md:block" data-icon="lock">lock</span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="mt-xl md:mt-lg md:pt-md md:border-t md:border-outline-variant/30 flex justify-end pb-lg md:pb-0">
              <button 
                className="w-full md:w-auto bg-primary text-on-primary font-label-md text-label-md font-semibold md:font-medium py-4 md:py-sm md:px-xl rounded-full shadow-sm md:shadow-none hover:bg-on-surface md:hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary md:focus:ring-offset-2 md:focus:ring-offset-surface-container-low transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2" 
                type="submit"
              >
                {editId ? '문의 수정' : '문의 등록'}
              </button>
            </div>
          </form>
        </div>
      </main>


    </div>
  );
}
