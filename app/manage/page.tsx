"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Link from "next/link";

export default function ManagePage() {
  const [accuses, setAccuses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [qnas, setQnas] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const userId = localStorage.getItem("customerId") || localStorage.getItem("userId");
      if (!userId || localStorage.getItem("isLoggedIn") !== "true") {
        alert("로그인이 필요합니다.");
        window.location.href = "/login?redirect=/manage";
        return;
      }

      try {
        const gradeRes = await fetch(`/api/customer-name?customerId=${userId}`);
        const gradeData = await gradeRes.json();
        
        if (!gradeData.success || typeof gradeData.grade === 'undefined' || gradeData.grade >= 3) {
          alert("접근 권한이 없습니다.");
          window.location.href = "/";
          return;
        }

        const dataRes = await fetch('/api/manage');
        const data = await dataRes.json();
        
        if (data.success) {
          setAccuses(data.accuses || []);
          setOrders(data.orders || []);
          setQnas(data.qnas || []);
          setCustomers(data.customers || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetch();
  }, []);

  const getStatusText = (status: any) => {
    switch(Number(status)) {
      case 0: return "결제완료";
      case 1: return "배송중";
      case 2: return "배송완료";
      case 3: return "취소";
      case 4: return "교환시작";
      case 5: return "교환진행";
      case 6: return "교환완료";
      case 7: return "반품진행";
      case 8: return "반품완료";
      default: return "";
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full pt-6 md:pt-16 px-4 md:px-16 pb-24 space-y-12">
        <h1 className="text-[28px] font-bold text-on-surface">관리자 페이지</h1>
        
        {loading ? (
          <p>로딩중...</p>
        ) : (
          <>
            <section>
              <h2 className="text-[22px] font-bold text-on-surface mb-6">신고 내역 (Accuse Table)</h2>
              {accuses.length === 0 ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant">
                  신고 내역이 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto border border-outline-variant rounded-xl">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface">
                      <tr>
                        <th className="px-6 py-4 font-bold">ID</th>
                        <th className="px-6 py-4 font-bold">Review ID</th>
                        <th className="px-6 py-4 font-bold">Content</th>
                        <th className="px-6 py-4 font-bold">written_at</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                      {accuses.map(accuse => (
                        <tr 
                          key={accuse.id} 
                          className="hover:bg-surface-container-low transition-colors cursor-pointer"
                          onClick={() => window.location.href = `/review?id=${accuse.review_id}`}
                        >
                          <td className="px-6 py-4">{accuse.id}</td>
                          <td className="px-6 py-4 text-primary hover:underline">{accuse.review_id}</td>
                          <td className="px-6 py-4 whitespace-normal min-w-[300px]">{accuse.content}</td>
                          <td className="px-6 py-4">{formatDate(accuse.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-[22px] font-bold text-on-surface mb-6">결제완료, 교환/반품 진행중 (Orders: Status 0, 4, 5, 7)</h2>
              {orders.length === 0 ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant">
                  진행중인 교환/반품 건이 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto border border-outline-variant rounded-xl">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface">
                      <tr>
                        <th className="px-6 py-4 font-bold">Order ID</th>
                        <th className="px-6 py-4 font-bold">Customer ID</th>
                        <th className="px-6 py-4 font-bold">Order Name</th>
                        <th className="px-6 py-4 font-bold">Status</th>
                        <th className="px-6 py-4 font-bold">Total Price</th>
                        <th className="px-6 py-4 font-bold">written_at</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                      {orders.map(order => (
                        <tr 
                          key={order.id} 
                          className="hover:bg-surface-container-low transition-colors cursor-pointer"
                          onClick={() => window.location.href = `/anorder?id=${order.id}`}
                        >
                          <td className="px-6 py-4 text-primary hover:underline">
                            {order.order_number || order.id}
                          </td>
                          <td className="px-6 py-4">{order.customer_id}</td>
                          <td className="px-6 py-4">{order.order_name || '-'}</td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-red-500">{getStatusText(order.status)}</span>
                          </td>
                          <td className="px-6 py-4">{order.total_price ? order.total_price.toLocaleString() : '0'}원</td>
                          <td className="px-6 py-4">{formatDate(order.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-[22px] font-bold text-on-surface mb-6">답변 대기중인 문의 (QnA: is_answer=0)</h2>
              {qnas.length === 0 ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant">
                  답변 대기중인 문의가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto border border-outline-variant rounded-xl">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface">
                      <tr>
                        <th className="px-6 py-4 font-bold">Source</th>
                        <th className="px-6 py-4 font-bold">ID</th>
                        <th className="px-6 py-4 font-bold">Customer ID</th>
                        <th className="px-6 py-4 font-bold">Content</th>
                        <th className="px-6 py-4 font-bold">written_at</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                      {qnas.map(qna => (
                        <tr 
                          key={`${qna.source_table}-${qna.id}`} 
                          className="hover:bg-surface-container-low transition-colors cursor-pointer"
                          onClick={() => window.location.href = `/answer?id=${qna.id}&type=${qna.source_table}`}
                        >
                          <td className="px-6 py-4">{qna.source_table}</td>
                          <td className="px-6 py-4 text-primary hover:underline">{qna.id}</td>
                          <td className="px-6 py-4">{qna.customer_id}</td>
                          <td className="px-6 py-4 whitespace-normal min-w-[300px]">{qna.content}</td>
                          <td className="px-6 py-4">{formatDate(qna.written_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-[22px] font-bold text-on-surface mb-6">고객 정보 (Customers Table)</h2>
              {customers.length === 0 ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant">
                  고객 정보가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto border border-outline-variant rounded-xl">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface">
                      <tr>
                        <th className="px-6 py-4 font-bold">Name</th>
                        <th className="px-6 py-4 font-bold">Grade</th>
                        <th className="px-6 py-4 font-bold">Mobile</th>
                        <th className="px-6 py-4 font-bold">Created At</th>
                        <th className="px-6 py-4 font-bold">Total Spent</th>
                        <th className="px-6 py-4 font-bold">Order Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                      {customers.map(customer => (
                        <tr 
                          key={customer.id} 
                          className="hover:bg-surface-container-low transition-colors"
                        >
                          <td className="px-6 py-4">{customer.name}</td>
                          <td className="px-6 py-4">{customer.grade}</td>
                          <td className="px-6 py-4">{customer.mobile}</td>
                          <td className="px-6 py-4">{formatDate(customer.created_at)}</td>
                          <td className="px-6 py-4">{customer.total_spent ? Number(customer.total_spent).toLocaleString() : '0'}원</td>
                          <td className="px-6 py-4">{customer.order_count || '0'}건</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
