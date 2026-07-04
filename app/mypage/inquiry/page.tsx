"use client";

import { useEffect, useState } from "react";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import Link from "next/link";
import InquiryPopup from "../../../components/InquiryPopup";

export default function InquiryPage() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewCount, setReviewCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        const customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
        if (!customerId) {
          window.location.href = "/login";
          return;
        }
        
        const res = await fetch(`/api/my-inquiries?customerId=${customerId}`);
        const data = await res.json();
        if (data.success) {
          setInquiries(data.data || []);
        }

        const orderRes = await fetch(`/api/check-order?customerId=${customerId}&status=1,2,4&unreviewed=true`);
        const orderData = await orderRes.json();
        if (orderData.success) {
          setReviewCount(orderData.count || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInquiries();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'RELOAD_QNA') {
        fetchInquiries();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleEdit = (e: React.MouseEvent, inquiry: any) => {
    e.stopPropagation();
    const type = inquiry.inquiry_type || '상품 문의';
    const url = `/inquiry?edit_id=${inquiry.id}&type=${encodeURIComponent(type)}&secret=${inquiry.is_secret}&content=${encodeURIComponent(inquiry.content)}`;
    window.open(url, 'inquiryPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
  };

  const handleDelete = (e: React.MouseEvent, inquiry: any) => {
    e.stopPropagation();
    if (confirm('정말로 이 문의를 삭제하시겠습니까?')) {
      const type = inquiry.inquiry_type === "1:1 문의" ? "my_qna" : "qna";
      const customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
      fetch(`/api/${type}?id=${inquiry.id}&customerId=${customerId}`, {
        method: 'DELETE',
      }).then(res => res.json()).then(data => {
        if (data.success) {
          alert('문의가 삭제되었습니다.');
          window.location.reload();
        } else {
          alert('삭제에 실패했습니다.');
        }
        }).catch(() => alert('오류가 발생했습니다.'));
    }
  };

  const handleWriteReview = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (reviewCount === null || reviewCount === 0) {
      alert("작성 가능한 후기가 없습니다.");
      return;
    }
    window.open('/review/write', 'writeReviewPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
  };

  const handleRowClick = (inquiry: any) => {
    setSelectedInquiry(inquiry);
  };

  const filteredInquiries = inquiries.filter((inquiry: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (inquiry.content && inquiry.content.toLowerCase().includes(q)) ||
      (inquiry.product_name && inquiry.product_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row pt-6 md:pt-16 px-4 md:px-16 pb-24 gap-6 md:gap-12 lg:gap-24">
        {/* Mobile Sidebar */}
        <nav aria-label="Mobile My Page Navigation" className="md:hidden w-full overflow-x-auto hide-scrollbar border-b border-outline-variant/30 pb-2 -mx-4 px-4">
          <ul className="flex space-x-6 text-[14px] text-on-surface-variant whitespace-nowrap">
            <li><Link href="/mypage/order" className="hover:text-on-surface transition-colors pb-2">주문/배송 내역</Link></li>
            <li><Link className="hover:text-on-surface transition-colors pb-2" href="/mypage/cancel">취소/교환/반품</Link></li>
            <li><Link href="/mypage/inquiry" className="font-bold text-primary border-b-2 border-primary pb-2">상품문의</Link></li>
            <li><button onClick={handleWriteReview} className="hover:text-on-surface transition-colors pb-2">구매후기 작성</button></li>
            <li><Link href="/mypage/review" className="hover:text-on-surface transition-colors pb-2">내가 쓴 구매후기</Link></li>
            <li><Link href="/mypage/shipping" className="hover:text-on-surface transition-colors pb-2">배송지 관리</Link></li>
            <li><Link className="hover:text-on-surface transition-colors pb-2" href="/mypage/profile">회원정보 수정</Link></li>
          </ul>
        </nav>

        {/* Desktop Sidebar */}
        <nav aria-label="My Page Navigation" className="hidden md:flex flex-col w-48 flex-shrink-0">
          <h1 className="text-[22px] font-bold mb-8 text-on-surface">마이페이지</h1>
          <ul className="flex flex-col space-y-5 text-[15px] text-on-surface-variant">
            <li><Link href="/mypage/order" className="hover:text-on-surface transition-colors">주문/배송 내역</Link></li>
            <li><Link className="hover:text-on-surface transition-colors" href="/mypage/cancel">취소/교환/반품</Link></li>
            <li><Link href="/mypage/inquiry" className="font-bold text-on-surface hover:underline underline-offset-4">상품문의</Link></li>
            <li><button onClick={handleWriteReview} className="w-full hover:text-on-surface transition-colors flex items-center justify-between text-left">구매후기 작성 <span className="text-outline text-sm">{reviewCount && reviewCount > 0 ? reviewCount : ''}</span></button></li>
            <li><Link href="/mypage/review" className="hover:text-on-surface transition-colors">내가 쓴 구매후기</Link></li>
            <li><Link href="/mypage/shipping" className="hover:text-on-surface transition-colors">배송지 관리</Link></li>
            <li><Link className="hover:text-on-surface transition-colors" href="/mypage/profile">회원정보 수정</Link></li>
          </ul>
        </nav>

        {/* Content Area */}
        <section className="flex-1 flex flex-col">
          <h2 className="text-[22px] font-bold mb-6 text-on-surface text-center md:text-left">상품문의 / 1:1 문의</h2>
          
          {/* Search bar */}
          <div className="flex items-center justify-end mb-4">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[18px] text-on-surface-variant pointer-events-none">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="문의 검색"
                className="pl-9 pr-4 py-2 rounded-full border border-outline-variant bg-surface text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors w-52"
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-t border-b-2 border-outline-variant text-[13px] min-w-[1000px]">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface font-semibold h-14">
                  <th className="font-medium text-center px-2 whitespace-nowrap">분류</th>
                  <th className="font-medium text-center px-2 whitespace-nowrap">상품명</th>
                  <th className="font-medium text-center px-2 whitespace-nowrap">주문일시</th>
                  <th className="font-medium text-center px-2 whitespace-nowrap">비밀글</th>
                  <th className="font-medium text-center px-4 w-48">문의내용</th>
                  <th className="font-medium text-center px-2 whitespace-nowrap">작성일</th>
                  <th className="font-medium text-center px-2 whitespace-nowrap">수정/삭제</th>
                  <th className="font-medium text-center px-2 whitespace-nowrap">답변여부</th>
                  <th className="font-medium text-center px-4 w-48">답변내용</th>
                  <th className="font-medium text-center px-2 whitespace-nowrap">답변여부</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-on-surface-variant">
                        로딩 중..
                    </td>
                  </tr>
                ) : inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-on-surface-variant">
                        문의 내역이 없습니다.
                    </td>
                  </tr>
                ) : filteredInquiries.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-on-surface-variant">
                        검색 결결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredInquiries.map((inquiry: any, i: number) => (
                    <tr key={i} onClick={() => handleRowClick(inquiry)} className="border-b border-outline-variant hover:bg-surface-container-lowest transition-colors h-14 cursor-pointer">
                      <td className="text-center px-2">{inquiry.inquiry_type}</td>
                      <td className="text-center px-2">{inquiry.product_name || '-'}</td>
                      <td className="text-center px-2">
                        {inquiry.order_id && inquiry.order_id !== 0 && inquiry.order_date 
                          ? new Date(inquiry.order_date).toISOString().split('T')[0] 
                          : ''}
                      </td>
                      <td className="text-center px-2 text-on-surface-variant">
                        {inquiry.inquiry_type === "1:1 문의" ? '' : inquiry.is_secret ? <span className="material-symbols-outlined text-[16px]">lock</span> : ''}
                      </td>
                      <td className="text-left px-4 text-on-surface-variant truncate max-w-[200px]" title={inquiry.content}>
                        {inquiry.content}
                      </td>
                      <td className="text-center text-on-surface-variant px-2 whitespace-nowrap">
                        {inquiry.written_at ? new Date(inquiry.written_at).toISOString().split('T')[0] : ''}
                      </td>
                      <td className="text-center px-2">
                        <div className="flex justify-center space-x-3 text-on-surface">
                          <button className="hover:text-primary transition-colors flex items-center justify-center" title="수정" onClick={(e) => handleEdit(e, inquiry)}>
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button className="hover:text-error transition-colors flex items-center justify-center" title="삭제" onClick={(e) => handleDelete(e, inquiry)}>
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                      <td className="text-center px-2 text-primary font-bold">
                        {inquiry.is_answer ? <span className="material-symbols-outlined text-[18px]">check</span> : ''}
                      </td>
                      <td className="text-left px-4 text-on-surface-variant truncate max-w-[200px]" title={inquiry.answer_content}>
                        {inquiry.answer_content || ''}
                      </td>
                      <td className="text-center px-2 text-on-surface-variant whitespace-nowrap">
                        {inquiry.answer_date ? new Date(inquiry.answer_date).toISOString().split('T')[0] : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-center md:justify-start md:pl-[320px] lg:pl-[380px] mt-8">
            <button 
              onClick={() => {
                window.open('/inquiry', 'inquiryPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
              }}
              className="font-label-md text-[14px] px-6 py-2.5 rounded-lg transition-colors shadow-sm flex items-center gap-2 bg-primary text-on-primary hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              문의하기
            </button>
          </div>
        </section>
      </main>

      <Footer />

      {selectedInquiry && (
        <InquiryPopup inquiry={selectedInquiry} onClose={() => setSelectedInquiry(null)} />
      )}
    </div>
  );
}
