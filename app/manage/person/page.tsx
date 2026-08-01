"use client";

import React, { useEffect, useState } from "react";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import { useRouter } from "next/navigation";

export default function PersonManagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    grade: "9",
    mobile: "",
    phone: "",
    email: "",
    zip_code: "",
    address: "",
    detail_address: "",
    point: "0",
    memo: ""
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (id) {
      setCustomerId(id);
      fetchCustomer(id);
    } else {
      alert("고객 ID가 없습니다.");
      router.push("/manage");
    }
  }, [router]);

  const fetchCustomer = async (id: string) => {
    try {
      const res = await fetch(`/api/manage/customer?id=${id}`);
      const data = await res.json();
      if (data.success && data.customer) {
        setFormData({
          name: data.customer.name || "",
          grade: data.customer.grade?.toString() || "9",
          mobile: data.customer.mobile || "",
          phone: data.customer.phone || "",
          email: data.customer.email || "",
          zip_code: data.customer.zip_code || "",
          address: data.customer.address || "",
          detail_address: data.customer.detail_address || "",
          point: data.customer.point?.toString() || "0",
          memo: data.customer.memo || ""
        });
      } else {
        alert(data.message || "고객 정보를 불러오는데 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customerId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/manage/customer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customerId,
          name: formData.name,
          grade: Number(formData.grade),
          mobile: formData.mobile,
          phone: formData.phone,
          email: formData.email,
          zip_code: formData.zip_code,
          address: formData.address,
          detail_address: formData.detail_address,
          point: Number(formData.point),
          memo: formData.memo
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("성공적으로 저장되었습니다.");
      } else {
        alert(data.message || "저장에 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">고객 상세 정보</h1>
          <button 
            onClick={() => router.push('/manage')}
            className="px-4 py-2 bg-surface-container-high hover:bg-surface-variant transition-colors rounded-lg font-medium"
          >
            목록으로
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">로딩중...</div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">이름</label>
                <input 
                  type="text" name="name" value={formData.name} onChange={handleChange}
                  className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">등급</label>
                <select 
                  name="grade" value={formData.grade} onChange={handleChange}
                  className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="0">0 (관리자)</option>
                  <option value="1">1 (중간관리자)</option>
                  <option value="8">8 (스페셜)</option>
                  <option value="9">9 (일반)</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">휴대폰 번호</label>
                <input 
                  type="text" name="mobile" value={formData.mobile} onChange={handleChange}
                  className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">일반 전화</label>
                <input 
                  type="text" name="phone" value={formData.phone} onChange={handleChange}
                  className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">이메일</label>
                <input 
                  type="email" name="email" value={formData.email} onChange={handleChange}
                  className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">보유 포인트</label>
                <input 
                  type="number" name="point" value={formData.point} onChange={handleChange}
                  className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">우편번호</label>
                <input 
                  type="text" name="zip_code" value={formData.zip_code} onChange={handleChange}
                  className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-sm font-medium">주소</label>
                <input 
                  type="text" name="address" value={formData.address} onChange={handleChange}
                  className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-sm font-medium">상세 주소</label>
                <input 
                  type="text" name="detail_address" value={formData.detail_address} onChange={handleChange}
                  className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-sm font-medium">관리자 메모</label>
                <textarea 
                  name="memo" value={formData.memo} onChange={handleChange}
                  rows={4}
                  placeholder="관리자만 볼 수 있는 메모입니다."
                  className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                />
              </div>

            </div>
            
            <div className="mt-8 flex justify-center">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-12 py-3 bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 transition-colors rounded-xl font-bold text-lg shadow-sm"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
