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

interface AddressListPopupProps {
  onClose: () => void;
  onSelect: (address?: Address) => void;
  onAllDeleted?: () => void;
  userId: string;
  selectedAddressId?: number;
}

export default function AddressListPopup({ onClose, onSelect, onAllDeleted, userId, selectedAddressId }: AddressListPopupProps) {
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

  const handleSelect = (addr: Address) => {
    onSelect(addr);
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
          // Reload the list, then apply post-delete logic
          setLoading(true);
          fetch(`/api/address/list?customer_id=${userId}`)
            .then((res) => res.json())
            .then((freshData) => {
              const remaining: Address[] = (freshData.success && freshData.addresses) ? freshData.addresses : [];
              setAddresses(remaining);

              if (remaining.length === 0) {
                // All addresses deleted → close popup and switch to 직접 입력
                onAllDeleted?.();
                onClose();
              } else if (id === selectedAddressId) {
                // Currently selected address was deleted → pick the first remaining
                onSelect(remaining[0]);
              }
            })
            .catch((err) => console.error("Error fetching addresses:", err))
            .finally(() => setLoading(false));
        } else {
          alert("삭제에 실패했습니다.");
        }
      } catch (err) {
        console.error("Error deleting address:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-surface text-on-surface rounded-xl shadow-xl flex flex-col"
        style={{ width: '480px', maxWidth: 'calc(100vw - 32px)', height: '80vh', maxHeight: '80vh', overflow: 'hidden' }}
      >
        {view === 'add' || view === 'edit' ? (
          <AddressForm
            userId={userId}
            initialData={view === 'edit' ? editAddress : undefined}
            onComplete={() => { setView('list'); setEditAddress(null); loadAddresses(); }}
            onCancel={() => { setView('list'); setEditAddress(null); }}
          />
        ) : (
          <>
            {/* Header — fixed, does not scroll */}
            <div className="flex-shrink-0 flex justify-between items-center p-md border-b border-outline-variant/30">
              <h2 className="font-headline-md text-headline-md font-bold text-on-surface">배송지 목록</h2>
              <button
                onClick={onClose}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: '1 1 0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {addresses.map((addr) => {
                    const isDefault =
                      addr.is_default === 1 ||
                      addr.is_default === (true as any);
                    
                    const isSelected = addr.id === selectedAddressId;

                    return (
                      <div
                        key={addr.id}
                        onClick={() => handleSelect(addr)}
                        className={`bg-surface border ${
                          isSelected
                            ? "border-2 border-primary"
                            : "border-outline-variant hover:border-primary hover:shadow-md transition-all"
                        } rounded-lg p-md flex flex-col gap-sm relative shadow-sm cursor-pointer`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-xs">
                            <span className="font-label-md text-label-md font-bold text-on-surface">
                              {addr.recipient_name}
                            </span>
                            {isDefault && (
                              <span className="bg-surface-container-highest text-on-surface-variant text-[11px] px-2 py-0.5 rounded-sm">
                                기본배송지
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {isSelected ? (
                              <span className="font-label-md text-label-md text-primary font-bold select-none">
                                ✔ 현재 선택
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="bg-surface-container border border-outline-variant text-on-surface font-label-md text-label-md px-3 py-1 rounded hover:bg-surface-container-high transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelect(addr);
                                }}
                              >
                                선택
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="font-body-md text-body-md text-on-surface-variant">
                          {[addr.recipient_mobile, addr.recipient_phone].filter(Boolean).join(" / ")}
                        </div>
                        <div className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                          [{addr.zip_code}] {addr.address}
                          <br />
                          {addr.detail_address || ""}
                        </div>
                        <div className="flex justify-end gap-xs mt-xs border-t border-outline-variant/30" style={{ paddingTop: '10px' }}>
                          <button
                            type="button"
                            className="text-on-surface-variant hover:text-primary font-label-md text-label-md border border-outline-variant rounded px-3 py-1 hover:bg-surface-container transition-colors"
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
                            className="text-on-surface-variant hover:text-error font-label-md text-label-md border border-outline-variant rounded px-3 py-1 hover:bg-surface-container transition-colors"
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
          </>
        )}
      </div>
    </div>
  );
}
