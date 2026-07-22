"use client";

import React, { useState } from "react";
import PhoneInput from "@/components/PhoneInput";

interface AddressFormProps {
  userId: string;
  onComplete: () => void;
  onCancel: () => void;
  initialData?: any;
}
import { openDaumPostcode } from "@/lib/daumPostcode";


export default function AddressForm({ userId, onComplete, onCancel, initialData }: AddressFormProps) {
  const [step, setStep] = useState(initialData ? 3 : 1);
  const [zipcode, setZipcode] = useState(initialData?.zip_code || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [detailAddress, setDetailAddress] = useState(initialData?.detail_address || "");
  const [name, setName] = useState(initialData?.recipient_name || "");
  const [mobile, setMobile] = useState(initialData?.recipient_mobile || "");
  const [phone, setPhone] = useState(initialData?.recipient_phone || "");
  const [isDefault, setIsDefault] = useState(initialData ? (initialData.is_default === 1 || initialData.is_default === true) : false);

  const handleAddressSearch = () => {
    openDaumPostcode((z, a) => {
      setZipcode(z);
      setAddress(a);
      setStep(2);
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }
    if (!mobile.trim()) {
      alert("휴대전화를 입력해주세요.");
      return;
    }
    try {
      const isEdit = !!initialData;
      const url = isEdit ? `/api/address/${initialData.id}` : "/api/address";
      const method = isEdit ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: userId,
          recipient_name: name,
          recipient_mobile: mobile,
          recipient_phone: phone,
          zip_code: zipcode,
          address: address,
          detail_address: detailAddress,
          is_default: isDefault ? 1 : 0
        })
      });
      const data = await res.json();
      if (data.success) {
        onComplete();
      } else {
        alert("배송지 저장에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("배송지 저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex flex-col bg-surface h-full" style={{ minHeight: '420px', maxHeight: '100%' }}>
      {/* Header */}
      <div className="flex justify-between items-center p-md border-b border-outline-variant/30">
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
          {initialData ? "배송지 정보 수정" : (
            step === 1 ? "주소를 검색해주세요" :
            step === 2 ? "상세주소를 알려주세요" :
            "배송지 상세 정보를 입력해주세요"
          )}
        </h2>
        <button onClick={onCancel} className="text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
      </div>

      <div className="flex-1 p-md flex flex-col gap-md overflow-y-auto">

        {/* ── STEP 1: Search prompt ── */}
        {step === 1 && (
          <div className="flex flex-col gap-lg flex-1">
            <button
              onClick={handleAddressSearch}
              className="w-full flex items-center gap-sm bg-surface-container border border-outline-variant rounded-lg px-md py-sm hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
              <span className="text-on-surface-variant font-body-md">도로명, 지번, 건물명 검색</span>
              <span className="ml-auto text-white text-label-md font-bold px-md py-xs rounded-lg whitespace-nowrap flex-shrink-0" style={{ backgroundColor: '#62D069' }}>검색</span>
            </button>

            <div className="text-on-surface-variant text-sm flex flex-col gap-sm">
              <p className="font-semibold" style={{ color: '#62D069' }}>이렇게 검색해보세요!</p>
              <div>
                <p>• 도로명 + 건물번호</p>
                <p className="text-xs opacity-70">예) 정자일로 95, 불정로 6</p>
              </div>
              <div>
                <p>• 동/읍/면/리 + 번지</p>
                <p className="text-xs opacity-70">예) 정자동 178-4, 동면 만천리 1000</p>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Detail address ── */}
        {step === 2 && (
          <div className="flex flex-col gap-md flex-1">
            <div className="flex flex-col gap-xs">
              <div className="flex justify-between items-center">
                <label className="text-sm text-on-surface-variant">주소</label>
                <button
                  onClick={handleAddressSearch}
                  className="text-xs bg-surface-container px-2 py-1 rounded text-on-surface-variant flex items-center gap-1 border border-outline-variant/30 hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">search</span> 주소검색
                </button>
              </div>
              <div className="py-sm border-b-2 border-on-surface">
                <p className="font-body-lg text-body-lg text-on-surface">{address}</p>
                <p className="font-caption text-caption text-on-surface-variant mt-1">({zipcode})</p>
              </div>
            </div>

            <input
              type="text"
              value={detailAddress}
              onChange={(e) => setDetailAddress(e.target.value)}
              className="w-full bg-transparent border-b-2 border-on-surface px-2 py-sm focus:outline-none focus:border-primary text-body-lg transition-colors"
              placeholder="상세주소는 도로명 주소에 맞게 입력해주세요"
              autoFocus
            />

            <div className="mt-auto">
              <button
                onClick={() => setStep(3)}
                className="w-full text-white font-bold text-label-lg py-4 rounded-lg transition-colors"
                style={{ backgroundColor: '#62D069' }}
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Name + Phone + save ── */}
        {step === 3 && (
          <div className="flex flex-col gap-md flex-1">
            <div className="flex flex-col gap-xs">
              <label className="text-sm text-on-surface-variant">받는 이</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b-2 border-on-surface px-2 py-sm focus:outline-none focus:border-primary text-body-lg transition-colors"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-md">
              <div className="flex flex-col gap-xs flex-1">
                <label className="text-sm text-on-surface-variant">휴대전화</label>
                <PhoneInput
                  value={mobile}
                  onChange={setMobile}
                  placeholder="010-0000-0000"
                  className="w-full bg-transparent border-b-2 border-on-surface px-2 py-sm focus:outline-none focus:border-primary text-body-lg transition-colors"
                />
              </div>

              <div className="flex flex-col gap-xs flex-1">
                <label className="text-sm text-on-surface-variant">전화번호 (선택)</label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  placeholder="전화번호"
                  className="w-full bg-transparent border-b-2 border-on-surface px-2 py-sm focus:outline-none focus:border-primary text-body-lg transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-xs">
              <div className="flex justify-between items-center">
                <label className="text-sm text-on-surface-variant">주소</label>
                <button
                  onClick={handleAddressSearch}
                  className="text-xs bg-surface-container px-2 py-1 rounded text-on-surface-variant flex items-center gap-1 border border-outline-variant/30 hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">search</span> 주소검색
                </button>
              </div>
              <div className="py-sm border-b-2 border-on-surface">
                <p className="font-body-lg text-body-lg text-on-surface">{address}</p>
                <p className="font-caption text-caption text-on-surface-variant mt-1">({zipcode})</p>
              </div>
            </div>

            <input
              type="text"
              value={detailAddress}
              onChange={(e) => setDetailAddress(e.target.value)}
              className="w-full bg-transparent border-b-2 border-on-surface px-2 py-sm focus:outline-none focus:border-primary text-body-lg transition-colors"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-5 h-5 cursor-pointer"
                style={{ accentColor: '#62D069' }}
              />
              <label htmlFor="isDefault" className="text-on-surface text-body-md select-none cursor-pointer">
                기본 배송지로 설정
              </label>
            </div>

            <div className="mt-auto">
              <button
                onClick={handleSave}
                disabled={!name.trim() || !mobile.trim()}
                className={`w-full font-bold text-label-lg py-4 rounded-lg transition-colors ${
                  name.trim() && mobile.trim()
                    ? 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                저장하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
