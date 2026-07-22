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

export default function DesktopOrder() {
  const [activeTab, setActiveTab] = useState<"recent" | "manual">("recent");
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [userMaxPoint, setUserMaxPoint] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointAmount, setPointAmount] = useState<number>(0);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
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
  
  const paymentWidgetRef = useRef<any>(null);
  const widgetsRef = useRef<any>(null);
  const agreementWidgetRef = useRef<any>(null);
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

    // Store fetchAddress on window to access easily or call it here
    fetchAddress();

    // Assign fetchAddress to a ref or window if we want to call it from outside, 
    // but we can just use another effect or pass a handler that gets userId again.
    // We will just do a global function since AddressListPopup needs to trigger it.
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

  // ── Toss: initialise widget ONCE when productTotal first becomes > 0 ──
  useEffect(() => {
    if (productTotal <= 0) return;
    if (tossInitializedRef.current) return;

    const initToss = async () => {
      try {
        tossInitializedRef.current = true;
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";
        const customerKey = "customer_" + Date.now();
        const tossPayments = (window as any).TossPayments(clientKey);
        const widgets = tossPayments.widgets({ customerKey });
        widgetsRef.current = widgets;

        const total = Math.max(0, productTotal + shippingCost - (usePoints ? pointAmount : 0));
        await widgets.setAmount({ currency: "KRW", value: total });

        paymentWidgetRef.current = await widgets.renderPaymentMethods({
          selector: "#payment-method",
          variantKey: "DEFAULT",
        });

        agreementWidgetRef.current = await widgets.renderAgreement({
          selector: "#payment-agreement",
          variantKey: "DEFAULT",
        });

        paymentWidgetRef.current.on('paymentMethodSelect', (methodInfo: any) => {
          let pName = methodInfo.method || methodInfo.paymentMethodKey || methodInfo.type || methodInfo.name || methodInfo.code;
          if (methodInfo.easyPay?.provider) pName = methodInfo.easyPay.provider;
          if (methodInfo.easypay?.provider) pName = methodInfo.easypay.provider;
          if (methodInfo.transfer?.provider) pName = methodInfo.transfer.provider;
          if (pName === 'QUICK_TRANSFER') pName = '퀵계좌이체';
          if (pName === 'CUSTOM') pName = methodInfo.paymentMethodKey || '퀵계좌이체';
          sessionStorage.setItem('selectedPaymentMethod', pName);
        });
      } catch (err) {
        console.error("Toss SDK Init Error:", err);
      }
    };

    // Poll until TossPayments script is available, then init
    if ((window as any).TossPayments) {
      initToss();
    } else {
      const interval = setInterval(() => {
        if ((window as any).TossPayments) {
          clearInterval(interval);
          if (!tossInitializedRef.current) initToss();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [productTotal]);

  // ── Toss: update amount only (widget already rendered) ──
  useEffect(() => {
    if (!widgetsRef.current) return;
    const total = Math.max(0, productTotal + shippingCost - (usePoints ? pointAmount : 0));
    widgetsRef.current.setAmount({ currency: "KRW", value: total });
  }, [productTotal, shippingCost, usePoints, pointAmount]);

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
          document.getElementById('addressDetail')?.focus();
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
        document.getElementById(firstField)?.focus();
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

    let paymentMethodName = '퀵계좌이체';
    if (paymentWidgetRef.current) {
      try {
        const methodInfo = await paymentWidgetRef.current.getSelectedPaymentMethod();
        paymentMethodName = methodInfo.method || methodInfo.paymentMethodKey || methodInfo.type || '퀵계좌이체';
        if (methodInfo.easyPay?.provider) paymentMethodName = methodInfo.easyPay.provider;
        if (methodInfo.easypay?.provider) paymentMethodName = methodInfo.easypay.provider;
        if (methodInfo.transfer?.provider) paymentMethodName = methodInfo.transfer.provider;
        if (paymentMethodName === 'QUICK_TRANSFER') paymentMethodName = '퀵계좌이체';
        if (paymentMethodName === 'CUSTOM' || paymentMethodName === 'NORMAL') {
          paymentMethodName = methodInfo.paymentMethodKey || '퀵계좌이체';
        }
      } catch (e) {
        console.error(e);
      }
    }
    sessionStorage.setItem('selectedPaymentMethod', paymentMethodName);

    const deliveryMessage = memoType === '직접 입력' ? memoCustom : memoType;
    
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

    if (widgetsRef.current) {
      try {
        await widgetsRef.current.requestPayment({
          orderId: "order_" + Date.now(),
          orderName: cartItems.length > 1 ? `${cartItems[0].product_name} 외 ${cartItems.length - 1}건` : (cartItems[0]?.product_name || '상품 결제'),
          successUrl: window.location.origin + "/payment/success",
          failUrl: window.location.origin + "/payment/fail",
          customerName: firstName || recentAddress?.recipient_name || "고객"
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
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-['Inter']">

      <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" />
      
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-md py-lg w-full">
        <div className="mb-lg">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">주문/결제</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg lg:gap-xl">
          <div className="lg:col-span-8 flex flex-col gap-lg">
            
            {/* Shipping Info */}
            <section className="bg-surface-container-low rounded-lg p-md lg:p-lg border border-outline-variant/20">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-md">배송 정보</h3>
              
              <div className="flex gap-md border-b border-outline-variant/30 mb-md">
                <button 
                  onClick={() => setActiveTab("recent")}
                  className={`font-label-md text-label-md pb-xs border-b-2 transition-colors ${activeTab === "recent" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"}`}
                >
                  최근 배송지
                </button>
                <button 
                  onClick={() => setActiveTab("manual")}
                  className={`font-label-md text-label-md pb-xs border-b-2 transition-colors ${activeTab === "manual" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"}`}
                >
                  직접 입력
                </button>
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
                        <button
                          onClick={() => setShowAddressList(true)}
                          className="font-label-md text-label-md text-on-surface-variant hover:text-primary border border-outline-variant rounded px-3 py-1 transition-colors bg-surface hover:bg-surface-container"
                        >
                          배송지 목록
                        </button>
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
                      <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="firstName">이름</label>
                      <input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} className={`bg-surface-container border ${errors.firstName ? 'border-red-500' : 'border-outline-variant'} rounded-lg px-sm py-sm focus:outline-none focus:border-primary`} placeholder="홍길동" type="text" />
                      {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                    </div>
                    <div className="flex flex-col gap-xs">
                      <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="phone">연락처</label>
                      <PhoneInput id="phone" value={phone} onChange={setPhone} className={`bg-surface-container border ${errors.phone ? 'border-red-500' : 'border-outline-variant'} rounded-lg px-sm py-sm focus:outline-none focus:border-primary`} placeholder="010-0000-0000" />
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-xs mt-sm">
                    <label className="font-label-md text-label-md text-on-surface-variant">주소</label>
                    <div className="flex gap-xs mb-xs">
                      <input id="zipcode" value={zipcode} readOnly className={`flex-grow bg-surface-container border ${errors.zipcode ? 'border-red-500' : 'border-outline-variant'} rounded-lg px-sm py-sm focus:outline-none`} placeholder="우편번호" type="text" />
                      <button type="button" onClick={execDaumPostcode} className="bg-surface border border-outline-variant text-on-surface font-label-md text-label-md px-md rounded-lg hover:bg-surface-container-high transition-colors whitespace-nowrap">주소 검색</button>
                    </div>
                    {errors.zipcode && <p className="text-red-500 text-xs mt-1">{errors.zipcode}</p>}
                    <input id="address" value={address} readOnly className={`bg-surface-container border ${errors.address ? 'border-red-500' : 'border-outline-variant'} rounded-lg px-sm py-sm mb-xs focus:outline-none`} placeholder="기본 주소" type="text" />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                    <input id="addressDetail" value={addressDetail} onChange={e => setAddressDetail(e.target.value)} className={`bg-surface-container border ${errors.addressDetail ? 'border-red-500' : 'border-outline-variant'} rounded-lg px-sm py-sm focus:outline-none focus:border-primary`} placeholder="상세주소" type="text" />
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
                    <input id="saveDefault" checked={saveDefault} onChange={e => setSaveDefault(e.target.checked)} className="w-4 h-4 text-primary bg-surface-container border-outline-variant rounded cursor-pointer" type="checkbox" />
                    <label className="font-label-md text-label-md text-on-surface cursor-pointer select-none" htmlFor="saveDefault">기본 배송지로 저장</label>
                  </div>
                </div>
              )}
            </section>

            {/* Order Items */}
            <section className="bg-surface-container-low rounded-lg p-md lg:p-lg border border-outline-variant/20">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-md">주문 상품</h3>
              <div className="flex flex-col gap-md">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-md pb-md border-b border-outline-variant/30 last:border-0 last:pb-0">
                    <div className="w-24 h-24 bg-surface-container rounded-lg overflow-hidden flex-shrink-0">
                      <img alt={item.product_name} className="w-full h-full object-cover mix-blend-multiply" src={item.image || ''} />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-body-lg text-body-lg text-on-surface line-clamp-2">{item.product_name}</h4>
                      <p className="font-caption text-caption text-on-surface-variant mt-xs">옵션: {item.option_name}{Number(item.order_quantity) >= 2 ? ` x ${item.order_quantity}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-on-surface">{(item.price * item.order_quantity).toLocaleString()}원</span>
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
                  id="pointAmount"
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
                    id="usePoints" 
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
                  <label className={`font-label-md text-label-md text-on-surface cursor-pointer select-none whitespace-nowrap ${userMaxPoint === 0 ? 'opacity-50' : ''}`} htmlFor="usePoints">포인트 사용</label>
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="bg-surface-container-low rounded-lg p-md lg:p-lg border border-outline-variant/20">
              <div id="payment-method" className="w-full"></div>
              <div id="payment-agreement" className="w-full"></div>
            </section>

          </div>

          {/* Right Column: Summary */}
          <div className="lg:col-span-4 relative">
            <div className="sticky top-[100px] bg-surface-container-high rounded-xl p-md lg:p-lg border border-outline-variant/30 shadow-sm flex flex-col gap-md">
              <h3 className="font-headline-md text-headline-md text-on-surface">주문 요약</h3>
              <div className="flex flex-col gap-sm py-sm border-y border-outline-variant/20">
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface-variant">상품 금액</span>
                  <span className="font-body-md text-body-md text-on-surface">{productTotal.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface-variant">배송비</span>
                  <span className="font-body-md text-body-md text-on-surface">{shippingCost > 0 ? `+${shippingCost.toLocaleString()}원` : '무료배송'}</span>
                </div>
                {usePoints && pointAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="font-body-md text-body-md text-on-surface-variant">할인 금액</span>
                    <span className="font-body-md text-body-md text-primary">-{pointAmount.toLocaleString()}원</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-end pt-sm">
                <span className="font-label-md text-label-md text-on-surface-variant">총 결제 금액</span>
                <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{finalTotal.toLocaleString()}원</span>
              </div>
              <div className="mt-md">
                <p className="font-caption text-caption text-on-surface-variant mb-md text-center">
                  위 주문 내용을 확인하였으며, 결제에 동의합니다.
                </p>
                <button onClick={handleCheckout} className="w-full bg-primary text-on-primary font-label-md text-label-md py-md rounded-lg hover:bg-inverse-surface transition-colors shadow-sm flex items-center justify-center gap-xs">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  결제하기
                </button>
              </div>
            </div>
          </div>
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
