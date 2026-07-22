"use client";

import React, { useState, useEffect, useRef } from "react";
import Script from "next/script";
import Header from "./Header";
import Footer from "./Footer";
import AddressListPopup from "./AddressListPopup";
import PhoneInput from "@/components/PhoneInput";
import { z } from "zod";

interface OrderItem {
  product_name: string;
  option_name: string;
  order_quantity: number;
  price: number;
  image: string;
}

export default function MobileOrder() {
  const [activeTab, setActiveTab] = useState<"recent" | "manual">("recent");
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [userMaxPoint, setUserMaxPoint] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointAmount, setPointAmount] = useState<number>(0);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [showAddressList, setShowAddressList] = useState(false);

  // Address State
  const [recentAddress, setRecentAddress] = useState<any>(null);
  
  // Manual Form State
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [saveDefault, setSaveDefault] = useState(false);
  
  const [memoType, setMemoType] = useState("배송 전에 미리 연락바랍니다.");
  const [memoCustom, setMemoCustom] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [isPointFocused, setIsPointFocused] = useState(false);
  const pointInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("카드");
  
  const tossPaymentsRef = useRef<any>(null);
  const tossInitializedRef = useRef(false);

  useEffect(() => {
    const userId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    if (!userId || localStorage.getItem("isLoggedIn") !== "true") {
      alert("로그인이 필요합니다.");
      window.location.href = "/login?redirect=/order";
      return;
    }

    const fetchAddress = () => {
      fetch(`/api/address?customer_id=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.address) {
            setRecentAddress(data.address);
            if (data.deliveryMessage) {
              const options = [
                "배송 전에 미리 연락바랍니다.",
                "부재 시 경비실에 맡겨주세요.",
                "택배함에 보관해 주세요.",
                "부재 시 문앞에 놓아주세요.",
                "빠른 배송 부탁드립니다."
              ];
              if (options.includes(data.deliveryMessage)) {
                setMemoType(data.deliveryMessage);
              } else {
                setMemoType("직접 입력");
                setMemoCustom(data.deliveryMessage);
              }
            }
          } else {
            setActiveTab("manual");
            setSaveDefault(true);
          }
        })
        .catch(() => {
          setActiveTab("manual");
          setSaveDefault(true);
        });
    };

    fetchAddress();
    (window as any).refreshAddress = fetchAddress;

    // Fetch User Points
    fetch(`/api/customers/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    }).then(r => r.json()).then(d => {
      if (d.success) {
        setUserMaxPoint(Number(d.point) || 0);
        if (!usePoints) {
          setPointAmount(Number(d.point) || 0);
        }
        setFirstName(prev => prev || d.name || "");
        setPhone(prev => prev || d.mobile || "");
        setZipcode(prev => prev || d.zip_code || "");
        setAddress(prev => prev || d.address || "");
        setAddressDetail(prev => prev || d.detail_address || "");
      }
    });

    // Fetch Cart/Order Items
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get("source");
    const priceId = urlParams.get("priceId");

    if (source && userId) {
      let apiUrl = `/api/order/items?source=${source}&userId=${userId}`;
      if (source === "buy" && priceId) {
        apiUrl += `&priceId=${priceId}`;
      }
      const orderId = urlParams.get("orderId");
      if (source === "reorder" && orderId) {
        apiUrl += `&orderId=${orderId}`;
      }
      
      fetch(apiUrl)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.items) {
            setCartItems(data.items);
            let total = 0;
            data.items.forEach((item: any) => {
              const qty = Number(item.order_quantity) || 1;
              const price = Number(item.price) || 0;
              total += qty * price;
            });
            setProductTotal(total);
          }
        });
    }
  }, []);

  // ── Toss: initialise Core SDK ──
  useEffect(() => {
    if (tossInitializedRef.current) return;

    const initToss = async () => {
      try {
        tossInitializedRef.current = true;
        // API 개별 연동 키 (Core SDK용)는 반드시 'test_ck_' 또는 'live_ck_' 로 시작해야 합니다. 'test_gck_'는 위젯 전용입니다.
        const clientKey = process.env.NEXT_PUBLIC_TOSS_API_CLIENT_KEY || "test_ck_DnyRpQWGrNLgQyvOYvbe3Kwv1M9E";
        const toss = (window as any).TossPayments(clientKey);
        tossPaymentsRef.current = toss.payment({ customerKey: "customer_" + Date.now() });
      } catch (err) {
        console.error("Toss SDK Init Error (Mobile):", err);
      }
    };

    if ((window as any).TossPayments) {
      initToss();
    } else {
      if (!document.querySelector('script[src*="v2/standard"]')) {
        const script = document.createElement('script');
        script.src = 'https://js.tosspayments.com/v2/standard';
        document.head.appendChild(script);
      }
      const interval = setInterval(() => {
        if ((window as any).TossPayments) {
          clearInterval(interval);
          if (!tossInitializedRef.current) initToss();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);


  const handlePointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
    if (val > userMaxPoint) val = userMaxPoint;
    const maxUsable = productTotal + shippingCost;
    if (val > maxUsable) val = maxUsable;
    setPointAmount(val);
  };

  const execDaumPostcode = () => {
    const openPostcode = () => {
      new (window as any).daum.Postcode({
        oncomplete: function(data: any) {
          let addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
          let extraAddr = '';

          if (data.userSelectedType === 'R') {
            if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) extraAddr += data.bname;
            if (data.buildingName !== '' && data.apartment === 'Y') {
              extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
            }
            if (extraAddr !== '') addr += ` (${extraAddr})`;
          }

          setZipcode(data.zonecode);
          setAddress(addr);
          document.getElementById('m-addressDetail')?.focus();
        }
      }).open();
    };

    if ((window as any).daum?.Postcode) {
      openPostcode();
    } else {
      if (!document.querySelector('script[src*="postcode.v2.js"]')) {
        const script = document.createElement('script');
        script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
        document.head.appendChild(script);
      }
      const interval = setInterval(() => {
        if ((window as any).daum?.Postcode) {
          clearInterval(interval);
          openPostcode();
        }
      }, 50);
    }
  };

  const handleCheckout = async () => {
    const isManual = activeTab === "manual";
    setErrors({});

    if (isManual) {
      const orderSchema = z.object({
        firstName: z.string().min(1, '이름을 입력해주세요.'),
        phone: z.string().regex(/^01[016789]-?\d{3,4}-?\d{4}$/, '올바른 연락처 형식으로 입력해주세요.'),
        zipcode: z.string().min(1, '우편번호를 검색해주세요.'),
        address: z.string().min(1, '주소를 입력해주세요.'),
        addressDetail: z.string().min(1, '상세주소를 입력해주세요.')
      });

      const result = orderSchema.safeParse({ firstName, phone, zipcode, address, addressDetail });
      if (!result.success) {
        const newErrs: any = {};
        result.error.issues.forEach(issue => {
          newErrs[issue.path[0]] = issue.message;
        });
        setErrors(newErrs);
        const firstField = result.error.issues[0].path[0] as string;
        document.getElementById(`m-${firstField}`)?.focus();
        return;
      }
    }


    const userId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    
    if (isManual) {
      sessionStorage.setItem('pendingAddress', JSON.stringify({
        userId,
        recipientName: firstName,
        recipientPhone: phone,
        zipCode: zipcode,
        address,
        detailAddress: addressDetail,
        isDefault: saveDefault ? 1 : 0
      }));
    } else {
      sessionStorage.removeItem('pendingAddress');
    }

    let paymentMethodName = selectedPaymentMethod;
    sessionStorage.setItem('selectedPaymentMethod', paymentMethodName);

    const deliveryMessage = memoType === '직접 입력' || memoType === 'direct' ? memoCustom : memoType;

    // Build receiver info from whichever tab is active
    let receiverName = '';
    let receiverMobile = '';
    let receiverPhone = '';
    let receiverAddress = '';
    let isDefault = 0;
    if (activeTab === 'manual') {
      receiverName = firstName;
      receiverMobile = phone;
      receiverPhone = '';
      receiverAddress = `[${zipcode}] ${address} ${addressDetail}`.trim();
      isDefault = saveDefault ? 1 : 0;
    } else if (recentAddress) {
      receiverName = recentAddress.recipient_name || '';
      receiverMobile = recentAddress.recipient_mobile || '';
      receiverPhone = recentAddress.recipient_phone || '';
      receiverAddress = `[${recentAddress.zip_code}] ${recentAddress.address} ${recentAddress.detail_address || ''}`.trim();
      isDefault = recentAddress.is_default || 0;
    }

    sessionStorage.setItem('pendingOrderInfo', JSON.stringify({
      pointUsed: usePoints ? pointAmount : 0,
      deliveryMessage,
      source: new URLSearchParams(window.location.search).get('source'),
      priceId: new URLSearchParams(window.location.search).get('priceId'),
      reorderId: new URLSearchParams(window.location.search).get('orderId'),
      userId,
      receiverName,
      receiverMobile,
      receiverPhone,
      receiverAddress,
      isDefault
    }));

    if (tossPaymentsRef.current) {
      try {
        const total = Math.max(0, productTotal + shippingCost - (usePoints ? pointAmount : 0));
        
        let methodType = "CARD";
        if (selectedPaymentMethod === "가상계좌") methodType = "VIRTUAL_ACCOUNT";
        else if (selectedPaymentMethod === "계좌이체") methodType = "TRANSFER";
        else if (selectedPaymentMethod === "휴대폰") methodType = "MOBILE_PHONE";

        await tossPaymentsRef.current.requestPayment({
          method: methodType,
          amount: {
            currency: "KRW",
            value: total
          },
          orderId: "order_" + Date.now(),
          orderName: cartItems.length > 1 ? `${cartItems[0].product_name} 외 ${cartItems.length - 1}건` : (cartItems[0]?.product_name || '상품 결제'),
          successUrl: window.location.origin + "/payment/success",
          failUrl: window.location.origin + "/payment/fail",
          customerName: receiverName || "고객",
          customerEmail: phone ? phone.replace(/-/g, '') + "@temp.com" : undefined // V2 requires email to be valid format if provided
        });
      } catch (err: any) {
        if (err.message) {
          alert(err.message);
        } else {
          alert("결제 진행 중 오류가 발생했습니다.");
        }
      }
    }
  };

  const finalTotal = Math.max(0, productTotal + shippingCost - (usePoints ? pointAmount : 0));

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-['Inter'] pb-32">

      <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" />
      
      <Header />

      <main className="flex-grow flex flex-col items-center w-full px-md md:px-lg py-xl max-w-7xl mx-auto">
        <div className="w-full max-w-[440px] md:max-w-2xl lg:max-w-4xl flex flex-col gap-lg pb-32">
          
          <div className="mb-sm">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">주문/결제</h2>
          </div>

          {/* Shipping Info */}
          <section className="bg-surface-container-low rounded-lg p-md lg:p-lg border border-outline-variant/20">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-md">배송 정보</h3>
            
            <div className="flex flex-nowrap items-center justify-between border-b border-outline-variant/30 mb-md">
              <div className="flex gap-3 shrink-0">
                <button 
                  onClick={() => setActiveTab("recent")}
                  className={`font-label-md text-label-md pb-xs border-b-2 transition-colors shrink-0 ${activeTab === "recent" ? "border-slate-900 text-on-surface font-semibold" : "border-transparent text-on-surface-variant hover:text-primary"}`}
                >
                  최근배송지
                </button>
                <button 
                  onClick={() => setActiveTab("manual")}
                  className={`font-label-md text-label-md pb-xs border-b-2 transition-colors shrink-0 ${activeTab === "manual" ? "border-slate-900 text-on-surface font-semibold" : "border-transparent text-on-surface-variant hover:text-primary"}`}
                >
                  직접입력
                </button>
              </div>
              {activeTab === "recent" && (
                <button
                  onClick={() => setShowAddressList(true)}
                  className="font-label-md text-label-md text-on-surface-variant hover:text-primary border border-outline-variant rounded px-2 py-1 mb-1 transition-colors bg-surface-container shrink-0"
                >
                  배송지목록
                </button>
              )}
            </div>

            {activeTab === "recent" ? (
              <div className="flex flex-col gap-sm">
                {recentAddress ? (
                  <div className="bg-surface border border-outline-variant rounded-lg p-md relative">
                    <div className="flex justify-between items-start mb-sm">
                      <div className="flex items-center gap-xs">
                        <span className="font-label-md text-label-md font-bold text-on-surface">{recentAddress.recipient_name}</span>
                        {recentAddress.is_default === 1 && <span className="bg-surface-container-highest text-on-surface-variant text-[11px] px-2 py-0.5 rounded-sm">기본 배송지</span>}
                      </div>
                    </div>
                    <div className="font-body-md text-body-md text-on-surface-variant mb-xs">
                      {recentAddress.recipient_mobile || recentAddress.recipient_phone}
                    </div>
                    <div className="font-body-md text-body-md text-on-surface-variant">
                      [{recentAddress.zip_code}] {recentAddress.address}<br />
                      {recentAddress.detail_address}
                    </div>
                  </div>
                ) : (
                  <div className="text-on-surface-variant text-sm py-4">저장된 배송지가 없습니다.</div>
                )}
                
                <div className="flex flex-col gap-xs mt-sm">
                  <label className="font-label-md text-label-md text-on-surface-variant">배송 메모 (선택)</label>
                  <select 
                    value={memoType}
                    onChange={(e) => setMemoType(e.target.value)}
                    className="bg-surface-container border border-outline-variant rounded-lg px-sm py-sm focus:outline-none focus:border-primary text-body-md"
                  >
                    <option>배송 전에 미리 연락바랍니다.</option>
                    <option>부재 시 경비실에 맡겨주세요.</option>
                    <option>택배함에 보관해 주세요.</option>
                    <option>부재 시 문앞에 놓아주세요.</option>
                    <option>빠른 배송 부탁드립니다.</option>
                    <option>직접 입력</option>
                  </select>
                  {memoType === "직접 입력" && (
                    <input 
                      type="text" 
                      value={memoCustom}
                      onChange={(e) => setMemoCustom(e.target.value)}
                      className="mt-2 bg-surface-container border border-outline-variant rounded-lg px-sm py-sm focus:outline-none focus:border-primary text-body-md w-full" 
                      placeholder="배송 메모를 입력해주세요."
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  <div className="flex flex-col gap-xs">
                    <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="m-firstName">이름</label>
                    <input id="m-firstName" value={firstName} onChange={e => setFirstName(e.target.value)} className={`bg-surface-container border ${errors.firstName ? 'border-red-500' : 'border-outline-variant'} rounded-lg px-sm py-sm focus:outline-none focus:border-primary`} placeholder="홍길동" type="text" />
                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div className="flex flex-col gap-xs">
                    <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="m-phone">연락처</label>
                    <PhoneInput id="m-phone" value={phone} onChange={setPhone} className={`bg-surface-container border ${errors.phone ? 'border-red-500' : 'border-outline-variant'} rounded-lg px-sm py-sm focus:outline-none focus:border-primary`} placeholder="010-0000-0000" />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-xs mt-sm">
                  <label className="font-label-md text-label-md text-on-surface-variant">주소</label>
                  <div className="flex gap-xs mb-xs w-full">
                    <input id="m-zipcode" value={zipcode} readOnly className={`flex-grow min-w-0 bg-surface-container border ${errors.zipcode ? 'border-red-500' : 'border-outline-variant'} rounded-lg px-sm py-sm focus:outline-none`} placeholder="우편번호" type="text" />
                    <button type="button" onClick={execDaumPostcode} className="flex-shrink-0 bg-white border border-gray-200 text-slate-700 font-medium text-[14px] px-5 rounded-xl hover:bg-gray-50 transition-all shadow-sm whitespace-nowrap min-w-fit">주소 검색</button>
                  </div>
                  {errors.zipcode && <p className="text-red-500 text-xs mt-1">{errors.zipcode}</p>}
                  <input id="m-address" value={address} readOnly className={`bg-surface-container border ${errors.address ? 'border-red-500' : 'border-outline-variant'} rounded-lg px-sm py-sm mb-xs focus:outline-none`} placeholder="기본 주소" type="text" />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                  <input id="m-addressDetail" value={addressDetail} onChange={e => setAddressDetail(e.target.value)} className={`bg-surface-container border ${errors.addressDetail ? 'border-red-500' : 'border-outline-variant'} rounded-lg px-sm py-sm focus:outline-none focus:border-primary`} placeholder="상세주소" type="text" />
                  {errors.addressDetail && <p className="text-red-500 text-xs mt-1">{errors.addressDetail}</p>}
                </div>
                <div className="flex flex-col gap-xs mt-sm">
                  <label className="font-label-md text-label-md text-on-surface-variant">배송 메모 (선택)</label>
                  <select value={memoType} onChange={(e) => setMemoType(e.target.value)} className="bg-surface-container border border-outline-variant rounded-lg px-sm py-sm focus:outline-none focus:border-primary text-body-md">
                    <option>배송 전에 미리 연락바랍니다.</option>
                    <option>부재 시 경비실에 맡겨주세요.</option>
                    <option>택배함에 보관해 주세요.</option>
                    <option>부재 시 문앞에 놓아주세요.</option>
                    <option>빠른 배송 부탁드립니다.</option>
                    <option>직접 입력</option>
                  </select>
                  {memoType === "직접 입력" && (
                    <input type="text" value={memoCustom} onChange={(e) => setMemoCustom(e.target.value)} className="mt-2 bg-surface-container border border-outline-variant rounded-lg px-sm py-sm focus:outline-none focus:border-primary text-body-md w-full" placeholder="배송 메모를 입력해주세요." />
                  )}
                </div>
                <div className="flex items-center gap-xs mt-sm">
                  <input id="m-saveDefault" checked={saveDefault} onChange={e => setSaveDefault(e.target.checked)} className="w-4 h-4 text-primary bg-surface-container border-outline-variant rounded cursor-pointer" type="checkbox" />
                  <label className="font-label-md text-label-md text-on-surface cursor-pointer select-none" htmlFor="m-saveDefault">기본 배송지로 저장</label>
                </div>
              </div>
            )}
          </section>

          {/* Order Items */}
          <section className="bg-surface-container-low rounded-lg p-md lg:p-lg border border-outline-variant/20">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-md">주문 상품</h3>
            <div className="flex flex-col gap-md">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-sm pb-md border-b border-outline-variant/30 last:border-0 last:pb-0">
                  <div className="w-16 h-16 bg-surface-container rounded-lg overflow-hidden flex-shrink-0">
                    <img alt={item.product_name} className="w-full h-full object-cover mix-blend-multiply" src={item.image || ''} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-body-md text-body-md text-on-surface line-clamp-2">{item.product_name}</h4>
                    <p className="font-caption text-caption text-on-surface-variant mt-xs">옵션: {item.option_name}{Number(item.order_quantity) >= 2 ? ` x ${item.order_quantity}` : ""}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-semibold text-on-surface">{(item.price * item.order_quantity).toLocaleString()}원</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Points */}
          <section className="bg-surface-container-low rounded-lg p-md lg:p-lg border border-outline-variant/20">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-sm">포인트</h3>
            <div className="flex items-center gap-2 w-full">
                <input 
                  ref={pointInputRef}
                  type="text" 
                  value={isPointFocused ? (pointAmount === 0 ? '' : pointAmount) : (pointAmount === 0 ? '' : pointAmount.toLocaleString() + '원')}
                  onChange={handlePointChange}
                  disabled={!usePoints}
                  placeholder={usePoints ? "0" : userMaxPoint.toLocaleString() + "원"}
                  onFocus={() => setIsPointFocused(true)}
                onBlur={() => setIsPointFocused(false)}
                className="flex-grow min-w-0 w-full bg-surface-container border border-outline-variant rounded-lg px-sm py-sm text-body-md text-on-surface-variant text-right focus:outline-none" 
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <input 
                  checked={usePoints} 
                  disabled={userMaxPoint === 0}
                  onChange={e => {
                    setUsePoints(e.target.checked);
                    if (e.target.checked) {
                      let val = Math.min(userMaxPoint, productTotal + shippingCost);
                      setPointAmount(val);
                      setTimeout(() => pointInputRef.current?.focus(), 0);
                    } else {
                      setPointAmount(0);
                    }
                  }}
                  className="w-4 h-4 text-primary bg-surface-container border-outline-variant rounded cursor-pointer disabled:opacity-50" 
                  type="checkbox" 
                />
                <label className={`font-label-md text-label-md text-on-surface cursor-pointer select-none whitespace-nowrap ${userMaxPoint === 0 ? 'opacity-50' : ''}`} onClick={() => {
                  if (userMaxPoint === 0) return;
                  setUsePoints(!usePoints);
                  if (!usePoints) {
                    let val = Math.min(userMaxPoint, productTotal + shippingCost);
                    setPointAmount(val);
                    setTimeout(() => pointInputRef.current?.focus(), 0);
                  } else {
                    setPointAmount(0);
                  }
                }}>포인트 사용</label>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-high border border-outline-variant/20 mb-6 p-4 md:p-6" style={{ transform: 'translateZ(0)' }}>
            <h2 className="font-title-lg text-title-lg text-on-surface mb-4">결제 수단</h2>
            <div className="grid grid-cols-2 gap-2">
              {['카드', '가상계좌', '계좌이체', '휴대폰'].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(method)}
                  className={`px-4 py-2 border rounded-full text-sm font-medium transition-colors ${
                    selectedPaymentMethod === method 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-surface border-outline-variant text-on-surface'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            
            {selectedPaymentMethod === '카드' && (
              <p className="text-sm text-outline mt-4">
                결제하기 버튼을 누르시면 카드사 및 할부 개월 수를 선택하는 창이 나타납니다.
              </p>
            )}
          </section>

          {/* Checkout Summary + Button (inline, not fixed) */}
          <section className="bg-surface-container-high border border-outline-variant/20 rounded-lg p-md flex flex-col gap-sm">
            <div className="flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface-variant">상품 금액</span>
              <span className="font-body-md text-body-md text-on-surface">{productTotal.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface-variant">배송비</span>
              <span className="font-body-md text-body-md text-on-surface">{shippingCost > 0 ? `+ ${shippingCost.toLocaleString()}원` : '무료배송'}</span>
            </div>
            {usePoints && pointAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-label-md text-label-md text-on-surface-variant">포인트 할인</span>
                <span className="font-body-md text-body-md text-primary">- {pointAmount.toLocaleString()}원</span>
              </div>
            )}
            <div className="flex justify-between items-end border-t border-outline-variant/30 pt-sm mt-xs">
              <span className="font-headline-md text-headline-md font-bold text-on-surface">총 결제 금액</span>
              <span className="font-headline-md text-headline-md font-bold text-primary">{finalTotal.toLocaleString()}원</span>
            </div>
            <p className="font-caption text-caption text-on-surface-variant text-center">위 주문 내용을 확인하였으며, 결제에 동의합니다.</p>
            <button onClick={handleCheckout} className="w-full bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md py-4 rounded-lg transition-colors flex justify-center items-center gap-sm shadow-sm active:scale-95">
              <span className="material-symbols-outlined text-[18px]">lock</span>
              결제하기
            </button>
          </section>

        </div>
      </main>

      <Footer />

      {/* Terms Popup */}
      {showTermsPopup && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-md" onClick={() => setShowTermsPopup(false)}>
          <div className="bg-surface rounded-xl w-full max-w-[400px] flex flex-col shadow-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-md border-b border-outline-variant/30">
              <h3 className="font-headline-md text-headline-md text-on-surface font-bold">전자금융거래 이용약관</h3>
              <button type="button" onClick={() => setShowTermsPopup(false)} className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            <div className="p-md">
              <div className="bg-white border border-outline-variant/30 rounded-xl p-md shadow-sm">
                <iframe src="https://m-img.cafe24.com/images/terms/ec/optional/pg_dacom_financial.html" frameBorder="0" style={{ width: '100%', height: '50vh', display: 'block', backgroundColor: 'white' }}></iframe>
              </div>
            </div>
            <div className="p-md pb-lg flex justify-center">
              <button type="button" onClick={() => setShowTermsPopup(false)} className="bg-[#5a4d41] text-white font-label-md text-label-md px-[60px] py-3 rounded-lg hover:bg-[#4a3f35] transition-colors shadow-sm active:scale-95">
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address List Popup */}
      {showAddressList && (
        <AddressListPopup 
          userId={localStorage.getItem("customerId") || localStorage.getItem("userId") || ""}
          onClose={() => setShowAddressList(false)}
          onSelect={(addr) => {
            setShowAddressList(false);
            if (addr) {
              setRecentAddress(addr);
              setActiveTab("recent");
            } else if ((window as any).refreshAddress) {
              (window as any).refreshAddress();
            }
          }}
          onAllDeleted={() => {
            setRecentAddress(null);
            setActiveTab("manual");
            setSaveDefault(true);
          }}
          selectedAddressId={recentAddress?.id}
        />
      )}
    </div>
  );
}
