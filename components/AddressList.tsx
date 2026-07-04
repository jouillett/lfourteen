"use client";

import React, { useState, useEffect } from "react";
import AddressForm from "./AddressForm";

interface Address {
  id: number;
  recipient_name: string;
  recipient_mobile: string;
  recipient_phone: string;
  zip_code: string;
  address: string;
  detail_address: string;
  is_default: number;
}

interface AddressListProps {
  userId: string;
}

export default function AddressList({ userId }: AddressListProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [editAddress, setEditAddress] = useState<Address | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = () => {
    setLoading(true);
    fetch(`/api/address/list?customer_id=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.addresses) {
          setAddresses(data.addresses);
        }
      })
      .catch((err) => console.error("Error fetching addresses:", err))
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id: number) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      try {
        const res = await fetch(`/api/address/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_id: userId }),
        });
        const data = await res.json();
        if (data.success) {
          loadAddresses();
        } else {
          alert("삭제에 실패했습니다.");
        }
      } catch (err) {
        console.error("Error deleting address:", err);
      }
    }
  };

  return (
    <div className="w-full bg-surface text-on-surface flex flex-col border-t-2 border-black">
      {view === 'add' || view === 'edit' ? (
        <AddressForm
          userId={userId}
          initialData={view === 'edit' ? editAddress : undefined}
          onComplete={() => { setView('list'); setEditAddress(null); loadAddresses(); }}
          onCancel={() => { setView('list'); setEditAddress(null); }}
        />
      ) : (
        <div className="flex flex-col gap-6 pt-4">
          {/* Add New Address Button */}
          <button
            type="button"
            className="w-full bg-surface border border-outline-variant text-on-surface font-label-md text-label-md py-sm rounded-lg hover:bg-surface-container transition-colors flex items-center justify-center gap-xs flex-shrink-0"
            onClick={() => setView('add')}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            배송지 신규 입력
          </button>

          {/* Address List */}
          {loading ? (
            <div className="text-center py-4 text-on-surface-variant">불러오는 중...</div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-4 text-on-surface-variant">저장된 배송지가 없습니다.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {addresses.map((addr) => {
                const isDefault =
                  addr.is_default === 1 ||
                  addr.is_default === (true as any);

                return (
                  <div
                    key={addr.id}
                    className="bg-white border border-[#EAEAEA] rounded-lg p-5 flex flex-col gap-3 relative"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[15px] text-[#333]">
                          {addr.recipient_name}
                        </span>
                        {isDefault && (
                          <span className="bg-[#FAFAFA] border border-[#CCCCCC] text-[#666666] text-[11px] px-2 py-0.5 rounded-sm">
                            기본배송지
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[14px] text-[#666]">
                      {[addr.recipient_mobile, addr.recipient_phone].filter(Boolean).join(" / ")}
                    </div>
                    <div className="text-[14px] text-[#666] leading-relaxed">
                      [{addr.zip_code}] {addr.address}
                      <br />
                      {addr.detail_address || ""}
                    </div>
                    <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-[#F5F5F5]">
                      <button
                        type="button"
                        className="text-[#666] border border-[#CCCCCC] text-[12px] px-4 py-1.5 hover:bg-[#FAFAFA] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditAddress(addr);
                          setView('edit');
                        }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="text-[#666] border border-[#CCCCCC] text-[12px] px-4 py-1.5 hover:bg-[#FAFAFA] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(addr.id);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
