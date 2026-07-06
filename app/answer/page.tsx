"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

function AnswerDetails() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const type = searchParams.get('type');

  const [inquiry, setInquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [answerContent, setAnswerContent] = useState("");

  useEffect(() => {
    if (id && type) {
      fetch(`/api/answer?id=${id}&type=${type}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.inquiry) {
            setInquiry(data.inquiry);
            setAnswerContent(data.inquiry.answer_content || "");
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, type]);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/answer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, answer_content: answerContent })
      });
      const data = await res.json();
      if (data.success) {
        alert("답변이 저장되었습니다.");
        window.location.href = "/manage";
      } else {
        alert("저장에 실패했습니다: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("오류가 발생했습니다.");
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

  if (loading) {
    return <div className="text-center py-24">로딩중...</div>;
  }

  if (!inquiry) {
    return <div className="text-center py-24">문의 내용을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
      <div className="grid grid-cols-1 gap-6">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Product ID</label>
            <input type="text" readOnly value={inquiry.product_id || '-'} className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Product Name</label>
            <input type="text" readOnly value={inquiry.product_name || '-'} className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none cursor-not-allowed" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Order ID</label>
            <input type="text" readOnly value={inquiry.order_id || '-'} className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-bold text-on-surface-variant mb-1">Written At</label>
            <input type="text" readOnly value={formatDate(inquiry.written_at)} className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none cursor-not-allowed" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-1">Inquiry Content</label>
          <textarea 
            readOnly 
            value={inquiry.content || '-'} 
            rows={4}
            className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2 text-on-surface focus:outline-none cursor-not-allowed resize-none" 
          />
        </div>

        <hr className="border-outline-variant my-2" />

        <div>
          <label className="block text-sm font-bold text-on-surface mb-2 text-primary">Answer Content (답변 내용)</label>
          <textarea 
            value={answerContent} 
            onChange={(e) => setAnswerContent(e.target.value)} 
            placeholder="답변을 입력하세요"
            rows={6}
            className="w-full bg-surface-container-lowest border border-outline rounded-md px-4 py-3 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-y" 
          />
        </div>

        <div className="pt-4 flex justify-end gap-4">
          <button onClick={() => window.location.href = '/manage'} className="px-6 py-2 border border-outline text-on-surface font-bold rounded-md hover:bg-surface-container-low transition-colors">
            목록으로
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-primary text-on-primary font-bold rounded-md hover:bg-primary-fixed-dim transition-colors shadow-sm">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnswerPage() {
  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 w-full pt-12 pb-24 px-4">
        <h1 className="text-[28px] font-bold text-on-surface text-center mb-10">문의 답변 관리</h1>
        <Suspense fallback={<div className="text-center py-24">로딩중...</div>}>
          <AnswerDetails />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
