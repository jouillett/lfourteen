"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

function OrderDetails() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [shipment, setShipment] = useState("");
  const [returnTracking, setReturnTracking] = useState("");
  const [reshipment, setReshipment] = useState("");

  useEffect(() => {
    if (id) {
      fetch(`/api/anorder?id=${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.order) {
            setOrder(data.order);
            setShipment(data.order.shipment || "");
            setReturnTracking(data.order.return || "");
            setReshipment(data.order.reshipment || "");
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id]);

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
      default: return "";
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/anorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, shipment, return: returnTracking, reshipment })
      });
      const data = await res.json();
      if (data.success) {
        alert("저장되었습니다.");
      } else {
        alert("저장에 실패했습니다: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("오류가 발생했습니다.");
    }
  };

  if (loading) {
    return <div className="text-center py-24">로딩중...</div>;
  }

  if (!order) {
    return <div className="text-center py-24">주문을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-1">Order Number</label>
          <input type="text" readOnly value={order.order_number || order.id} className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none cursor-not-allowed" />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-1">Order Name</label>
          <input type="text" readOnly value={order.order_name || '-'} className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none cursor-not-allowed" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Customer ID</label>
            <input type="text" readOnly value={order.customer_id || '-'} className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Customer Name</label>
            <input type="text" readOnly value={order.customer_name || '-'} className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none cursor-not-allowed" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Total Price</label>
            <input type="text" readOnly value={`${order.total_price ? order.total_price.toLocaleString() : '0'}원`} className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Status</label>
            <input type="text" readOnly value={getStatusText(order.status)} className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none cursor-not-allowed font-bold text-primary" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-1">Created At</label>
          <input type="text" readOnly value={new Date(order.created_at).toLocaleString()} className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none cursor-not-allowed" />
        </div>

        <hr className="border-outline-variant my-4" />

        <div>
          <label className="block text-sm font-bold text-on-surface mb-1">Shipment (업체배송)</label>
          <input 
            type="text" 
            value={shipment} 
            onChange={(e) => setShipment(e.target.value)} 
            placeholder="배송 송장번호 입력"
            className="w-full bg-surface-container-lowest border border-outline rounded-md px-4 py-2 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all" 
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-on-surface mb-1">Return (고객배송)</label>
          <input 
            type="text" 
            value={returnTracking} 
            onChange={(e) => setReturnTracking(e.target.value)} 
            placeholder="반품/교환 수거 송장번호 입력"
            className="w-full bg-surface-container-lowest border border-outline rounded-md px-4 py-2 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all" 
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-on-surface mb-1">Reshipment (업체재배송)</label>
          <input 
            type="text" 
            value={reshipment} 
            onChange={(e) => setReshipment(e.target.value)} 
            placeholder="교환 재배송 송장번호 입력"
            className="w-full bg-surface-container-lowest border border-outline rounded-md px-4 py-2 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all" 
          />
        </div>

        <div className="pt-4 flex justify-end gap-4">
          <button onClick={() => window.history.back()} className="px-6 py-2 border border-outline text-on-surface font-bold rounded-md hover:bg-surface-container-low transition-colors">
            뒤로가기
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-primary text-on-primary font-bold rounded-md hover:bg-primary-fixed-dim transition-colors shadow-sm">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnorderPage() {
  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 w-full pt-12 pb-24 px-4">
        <h1 className="text-[28px] font-bold text-on-surface text-center mb-10">주문 상세 관리</h1>
        <Suspense fallback={<div className="text-center py-24">로딩중...</div>}>
          <OrderDetails />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
