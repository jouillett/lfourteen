"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function OrderedPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/ordered/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || '업로드 성공');
        window.location.reload();
      } else {
        alert('업로드 실패: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('업로드 중 오류 발생');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    fetch('/api/ordered')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.orders) {
          setOrders(data.orders);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    // dateString is "2026-09-21 12:43:23"
    const parts = dateString.split(' ');
    const dateParts = parts[0].split('-');
    const timeParts = parts[1].split(':');
    let hour = parseInt(timeParts[0]);
    const ampm = hour >= 12 ? '오후' : '오전';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${dateParts[0]}. ${parseInt(dateParts[1])}. ${parseInt(dateParts[2])}. ${ampm} ${hour}:${timeParts[1]}:${timeParts[2]}`;
  };

  const totalPriceSum = orders.reduce((acc, cur) => acc + (Number(cur.total_price) || 0), 0);

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 w-full pt-12 pb-24 px-4 max-w-5xl mx-auto">
        <h1 className="text-[28px] font-bold text-on-surface text-center mb-10">주문 정보</h1>
        
        {loading ? (
          <div className="text-center py-24">로딩중...</div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-outline-variant text-sm text-left">
              <thead className="bg-surface-container-low text-on-surface font-bold text-center">
                <tr>
                  <th scope="col" className="px-6 py-4">제품</th>
                  <th scope="col" className="px-6 py-4">갯수</th>
                  <th scope="col" className="px-6 py-4">가격</th>
                  <th scope="col" className="px-6 py-4">주문 일시</th>
                  <th scope="col" className="px-6 py-4">송장번호</th>
                  <th scope="col" className="px-6 py-4">성명</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-center">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                      결제 완료된 주문이 없습니다.
                    </td>
                  </tr>
                ) : (
                  orders.map((order, idx) => (
                    <tr key={idx} className="hover:bg-surface-container-low transition-colors cursor-pointer" onClick={() => window.location.href = `/bycompany?id=${order.order_id}`}>
                      <td className="px-6 py-4">{order.product_name}</td>
                      <td className="px-6 py-4">{order.total_qty}</td>
                      <td className="px-6 py-4">{Number(order.total_price).toLocaleString()}원</td>
                      <td className="px-6 py-4">{formatDate(order.created_at_str)}</td>
                      <td className="px-6 py-4">{order.shipment || "-"}</td>
                      <td className="px-6 py-4">{order.customer_name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {orders.length > 0 && (
              <div className="p-6 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 text-lg font-bold text-on-surface">
                <div className="flex gap-2 order-2 sm:order-1">
                  <button onClick={() => window.open('/api/ordered/export', '_blank')} className="px-6 py-2 bg-primary text-on-primary text-base font-bold rounded-md hover:bg-primary-fixed-dim transition-colors shadow-sm">저장 (엑셀 다운로드)</button>
                  <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2 bg-[#423C32] text-white text-base font-bold rounded-md hover:bg-[#2e2a22] transition-colors shadow-sm">송장번호 업로드</button>
                  <input type="file" accept=".xlsx, .xls" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                </div>
                <span className="order-1 sm:order-2">
                총 합계금액은 {totalPriceSum.toLocaleString()}원입니다.</span>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
