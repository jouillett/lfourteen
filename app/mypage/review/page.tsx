"use client";

import { useEffect, useState } from "react";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import Link from "next/link";

export default function ReviewPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canWriteReview, setCanWriteReview] = useState(false);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
        if (!customerId) {
          window.location.href = "/login";
          return;
        }
        
        const res = await fetch(`/api/review?customerId=${customerId}`);
        const data = await res.json();
        if (data.success) {
          setReviews(data.reviews || []);
        }

        const orderRes = await fetch(`/api/check-order?customerId=${customerId}&status=1,2,4&unreviewed=true`);
        const orderData = await orderRes.json();
        if (orderData.success) {
          setCanWriteReview(orderData.hasOrder);
          setReviewCount(orderData.count || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const handleEdit = (review: any) => {
    window.open(`/review/write?reviewId=${review.id}&rating=${review.rating}&content=${encodeURIComponent(review.content || "")}`, 'writeReviewPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
  };

  const handleDelete = (reviewId: number) => {
    if (confirm('정말로 이 리뷰를 삭제하시겠습니까?')) {
      fetch('/api/review', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: reviewId })
      }).then(res => res.json()).then(data => {
        if (data.success) {
          alert('리뷰가 삭제되었습니다.');
          window.location.reload();
        } else {
          alert('리뷰 삭제에 실패했습니다.');
        }
        }).catch(() => alert('오류가 발생했습니다.'));
    }
  };

  const filteredReviews = reviews.filter((review: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (review.content && review.content.toLowerCase().includes(q)) ||
      (review.product_name && review.product_name.toLowerCase().includes(q))
    );
  });

  const handleWriteReview = () => {
    if (!canWriteReview) {
      alert("작성 가능한 후기가 없습니다.");
      return;
    }
    window.open('/review/write', 'writeReviewPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
  };

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row pt-6 md:pt-16 px-4 md:px-16 pb-24 gap-6 md:gap-12 lg:gap-24">
        {/* Mobile Sidebar */}
        <nav aria-label="Mobile My Page Navigation" className="md:hidden w-full overflow-x-auto hide-scrollbar border-b border-outline-variant/30 pb-2 -mx-4 px-4">
          <ul className="flex space-x-6 text-[14px] text-on-surface-variant whitespace-nowrap">
            <li><Link href="/mypage/order" className="hover:text-on-surface transition-colors pb-2">주문/배송 내역</Link></li>
            <li><Link className="hover:text-on-surface transition-colors pb-2" href="/mypage/cancel">취소/교환/반품</Link></li>
            <li><Link href="/mypage/inquiry" className="hover:text-on-surface transition-colors pb-2">상품문의</Link></li>
            <li><button onClick={handleWriteReview} className="hover:text-on-surface transition-colors pb-2">구매후기 작성</button></li>
            <li><Link href="/mypage/review" className="font-bold text-primary border-b-2 border-primary pb-2">내가 쓴 구매후기</Link></li>
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
            <li><Link href="/mypage/inquiry" className="hover:text-on-surface transition-colors">상품문의</Link></li>
            <li><button onClick={handleWriteReview} className="w-full hover:text-on-surface transition-colors flex items-center justify-between text-left">구매후기 작성 <span className="text-outline text-sm">{reviewCount && reviewCount > 0 ? reviewCount : ''}</span></button></li>
            <li><Link href="/mypage/review" className="font-bold text-on-surface hover:underline underline-offset-4">내가 쓴 구매후기</Link></li>
            <li><Link href="/mypage/shipping" className="hover:text-on-surface transition-colors">배송지 관리</Link></li>
            <li><Link className="hover:text-on-surface transition-colors" href="/mypage/profile">회원정보 수정</Link></li>
          </ul>
        </nav>

        {/* Content Area */}
        <section className="flex-1 flex flex-col">
          <h2 className="text-[22px] font-bold mb-6 text-on-surface text-center md:text-left">내가 쓴 구매후기</h2>
          
          {/* Search bar */}
          <div className="flex items-center justify-end mb-4">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[18px] text-on-surface-variant pointer-events-none">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="리뷰 검색"
                className="pl-9 pr-4 py-2 rounded-full border border-outline-variant bg-surface text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors w-52"
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-t border-b-2 border-outline-variant text-[14px] min-w-[700px]">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface font-semibold h-14">
                  <th className="font-medium text-center w-28">별점</th>
                  <th className="font-medium text-center w-32">상품</th>
                  <th className="font-medium text-center">구매 후기</th>
                  <th className="font-medium text-center w-28">작성일</th>
                  <th className="font-medium text-center w-24">수정/삭제</th>
                  <th className="font-medium text-center w-48">답글</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-on-surface-variant">
                        로딩 중..
                    </td>
                  </tr>
                ) : reviews.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-on-surface-variant">
                        작성한 구매후기가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredReviews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-on-surface-variant">
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  ) : filteredReviews.map((review: any) => (
                    <tr key={review.id} className="border-b border-outline-variant hover:bg-surface-container-lowest transition-colors h-16">
                      <td className="text-center text-on-surface text-[18px]">
                        {'★'.repeat(review.rating || 5)}{'☆'.repeat(5 - (review.rating || 5))}
                      </td>
                      <td className="text-center">{review.product_name || '엘포틴 코디'}</td>
                      <td className="text-left px-4 text-on-surface-variant truncate max-w-[200px] cursor-pointer hover:underline" title={review.content} onClick={() => handleEdit(review)}>
                        {review.content}
                      </td>
                      <td className="text-center text-on-surface-variant text-[13px]">
                        {new Date(review.created_at).toISOString().split('T')[0]}
                      </td>
                      <td className="text-center">
                        <div className="flex justify-center space-x-3 text-on-surface">
                          <button className="hover:text-primary transition-colors flex items-center justify-center" title="수정" onClick={() => handleEdit(review)}>
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button className="hover:text-error transition-colors flex items-center justify-center" title="삭제" onClick={() => handleDelete(review)}>
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                      <td className="text-left px-4 text-on-surface-variant truncate max-w-[200px]" title={review.answer_content || ''}>
                        {review.answer_content || ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {!loading && reviews.length > 0 && (
            <div className="flex justify-center mt-8">
              <div className="flex items-center space-x-4 text-on-surface-variant">
                <button className="hover:text-primary"><span className="material-symbols-outlined text-[20px]">chevron_left</span></button>
                <span className="font-bold text-on-surface border-b border-on-surface px-1 text-[15px]">1</span>
                <button className="hover:text-primary"><span className="material-symbols-outlined text-[20px]">chevron_right</span></button>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-8">
            <button 
              onClick={handleWriteReview}
              disabled={!canWriteReview}
              className={`font-label-md text-[14px] px-6 py-2.5 rounded-lg transition-colors shadow-sm flex items-center gap-2 ${canWriteReview ? 'bg-primary text-on-primary hover:opacity-90' : 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-60'}`}
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              후기작성
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
