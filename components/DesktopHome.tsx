"use client";

import React, { useEffect, useRef, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function DesktopHome({ initialReviewCount = 0, initialQnaCount = 0, topReviews = [] }: { initialReviewCount?: number, initialQnaCount?: number, topReviews?: any[] }) {
  const [totalAmount, setTotalAmount] = useState("65,000원");
  const [reviewCount, setReviewCount] = useState<number>(initialReviewCount);
  const [qnaCount, setQnaCount] = useState<number>(initialQnaCount);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasOrder, setHasOrder] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const nameResolverRef = React.useRef<((name: string | null) => void) | null>(null);

  const prices: Record<string, string> = {
    "1": "65,000원",
    "2": "110,000원",
    "3": "270,000원",
    "4": "480,000원",
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (prices[val]) setTotalAmount(prices[val]);
  };

  const executeAddToCart = async (pricedId: number, force = false) => {
    const customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          product_id: 1,
          priced_id: pricedId,
          quantity: 1,
          force
        })
      });

      const data = await res.json();
      if (data.exists && !force) {
        if (window.confirm("이미 선택한 옵션입니다. 그래도 추가하시겠습니까?")) {
          executeAddToCart(pricedId, true);
        }
      } else if (data.success) {
        window.location.href = "/cart";
      } else {
        alert("장바구니 담기에 실패했습니다.");
      }
    } catch (err) {
      console.error("Add to cart error:", err);
      alert("오류가 발생했습니다.");
    }
  };

  const handleAddToCart = () => {
    const selectEl = document.getElementById("pricing-options") as HTMLSelectElement;
    const pricedId = selectEl ? parseInt(selectEl.value) : 1;

    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!loggedIn) {
      sessionStorage.setItem("pendingAction", "cart");
      sessionStorage.setItem("pendingCartPricedId", pricedId.toString());
      alert("로그인이 필요합니다.");
      window.location.href = "/login";
      return;
    }

    executeAddToCart(pricedId);
  };

  const promptName = (): Promise<string | null> => {
    return new Promise((resolve) => {
      nameResolverRef.current = resolve;
      setNameInput("");
      setShowNameModal(true);
    });
  };

  const handleNameModalSubmit = async () => {
    if (!nameInput.trim()) return;
    setNameSubmitting(true);
    const resolver = nameResolverRef.current;
    nameResolverRef.current = null;
    setShowNameModal(false);
    setNameSubmitting(false);
    resolver?.(nameInput.trim());
  };

  const handleNameModalCancel = () => {
    const resolver = nameResolverRef.current;
    nameResolverRef.current = null;
    setShowNameModal(false);
    resolver?.(null);
  };

  const handleInquiryClick = async () => {
    // Re-read from localStorage directly to avoid stale state
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!loggedIn) {
      sessionStorage.setItem("pendingAction", "inquiry");
      alert("로그인이 필요합니다.");
      window.location.href = '/login';
      return;
    }
    const customerId = localStorage.getItem("customerId");
    if (!customerId) {
      sessionStorage.setItem("pendingAction", "inquiry");
      alert("로그인이 필요합니다.");
      window.location.href = '/login';
      return;
    }

    try {
      const res = await fetch(`/api/customer-name?customerId=${customerId}`);
      const data = await res.json();

      if (data.success) {
        const hasName = data.name && data.name.trim() !== '';
        if (!hasName) {
          const inputName = await promptName();
          if (inputName) {
            const updateRes = await fetch("/api/customer-name", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ customerId, name: inputName })
            });
            const updateData = await updateRes.json();
            if (!updateData.success) {
              alert("이름 저장에 실패했습니다.");
            }
          }
        }
        // Name exists or was just saved — proceed with inquiry
        window.open('/inquiry', 'inquiryPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
      } else {
        alert("사용자 정보를 가져오지 못했습니다: " + data.message);
      }
    } catch (e) {
      console.error("Error in handleInquiryClick:", e);
      alert("오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const handleBuyClick = () => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const selectEl = document.getElementById("pricing-options") as HTMLSelectElement;
    const pricedId = selectEl ? parseInt(selectEl.value) : 1;

    if (!loggedIn) {
      sessionStorage.setItem("pendingAction", "buy");
      sessionStorage.setItem("pendingBuyPricedId", pricedId.toString());
      alert("로그인이 필요합니다.");
      window.location.href = "/login";
      return;
    }

    window.location.href = `/order?source=buy&priceId=${pricedId}`;
  };

  const handleSubscribeClick = async () => {
    const customerId = localStorage.getItem("customerId") || localStorage.getItem("userId");
    if (customerId) {
      try {
        const res = await fetch(`/api/mypage/billing?userId=${customerId}`);
        const data = await res.json();
        if (data.success && data.subscribed) {
          if (confirm("이미 '정기구매'를 신청하셨습니다.\n등록된 정기구매 정보를 확인하시겠습니까?")) {
            window.location.href = "/mypage/billing";
          }
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    const selectEl = document.getElementById("pricing-options") as HTMLSelectElement;
    const opt = selectEl ? selectEl.value : "1";
    window.location.href = `/billing?option=${opt}`;
  };

  useEffect(() => {
    const tabLinks = document.querySelectorAll(".tab-link");
    const sections = document.querySelectorAll("section[id]");

    const handleScroll = () => {
      let current = "";
      sections.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop;
        if (window.scrollY >= sectionTop - 150) {
          current = section.getAttribute("id") || "";
        }
      });

      tabLinks.forEach((link) => {
        link.classList.remove("text-primary", "border-primary", "border-b-2", "active");
        link.classList.add("text-on-surface-variant");
        if (link.getAttribute("href")?.substring(1) === current) {
          link.classList.add("text-primary", "border-primary", "border-b-2", "active");
          link.classList.remove("text-on-surface-variant");
        }
      });

      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    // Check login and order status
    const checkUserStatus = async () => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      setIsLoggedIn(loggedIn);
      
      if (loggedIn) {
        const customerId = localStorage.getItem("customerId");
        if (customerId) {
          try {
            const res = await fetch(`/api/check-order?customerId=${customerId}`);
            const data = await res.json();
            if (data.success) {
              setHasOrder(data.hasOrder);
            }
          } catch (err) {
            console.error("Error checking order status:", err);
          }
        }
      }
    };
    checkUserStatus().then(() => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      if (loggedIn) {
        const pendingAction = sessionStorage.getItem("pendingAction");
        if (pendingAction === "inquiry" && window.innerWidth >= 1024) {
          sessionStorage.removeItem("pendingAction");
          handleInquiryClick();
        } else if (pendingAction === "cart") {
          sessionStorage.removeItem("pendingAction");
          const savedPricedId = sessionStorage.getItem("pendingCartPricedId");
          sessionStorage.removeItem("pendingCartPricedId");
          if (savedPricedId) {
            const selectEl = document.getElementById("pricing-options") as HTMLSelectElement;
            if (selectEl) selectEl.value = savedPricedId;
            executeAddToCart(parseInt(savedPricedId));
          }
        } else if (pendingAction === "buy") {
          sessionStorage.removeItem("pendingAction");
          const savedPricedId = sessionStorage.getItem("pendingBuyPricedId");
          sessionStorage.removeItem("pendingBuyPricedId");
          const pricedId = savedPricedId ? parseInt(savedPricedId) : 1;
          window.location.href = `/order?source=buy&priceId=${pricedId}`;
        }
      }
    });

    tabLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = link.getAttribute("href");
        if (targetId) {
          document.querySelector(targetId)?.scrollIntoView({
            behavior: "smooth",
          });
        }
      });
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Header />
      
      <main className="max-w-7xl mx-auto px-md md:px-lg pb-xl mt-md">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <div className="lg:col-span-8 flex flex-col gap-xl">
            <div className="tabs-sticky bg-surface/95 backdrop-blur-sm border-b border-outline-variant/30">
              <nav className="flex gap-lg justify-start py-md overflow-x-auto whitespace-nowrap hide-scrollbar">
                <a className="text-primary border-b-2 border-primary font-label-md text-label-md tab-link active px-xs pb-1" href="#description">상세정보</a>
                <a className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md tab-link px-xs pb-1" href="#reviews">리뷰 ({reviewCount})</a>
                <a className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md tab-link px-xs pb-1" href="#qa">Q&amp;A ({qnaCount})</a>
              </nav>
            </div>
            
            <section className="scroll-mt-32" id="description">
              <div className="flex flex-col items-center">
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "716px"}} src="https://capofcom.cafe24.com/l14_coordy/product/5383834b5b3bfe2017b727548b002180.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "626px"}} src="https://capofcom.cafe24.com/l14_coordy/product/0bbd8661cf5e44d2940ad140fdd2aaa4.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "986px"}} src="https://capofcom.cafe24.com/l14_coordy/product/f465b3ff7828529a60443f3e9dde2565.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "856px"}} src="https://capofcom.cafe24.com/l14_coordy/product/057f4f7458e823c395ad01e745e258f6.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "816px"}} src="https://capofcom.cafe24.com/l14_coordy/product/534ce2f89d0f15a61fa916e58b868362.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "869px"}} src="https://capofcom.cafe24.com/l14_coordy/product/2a42c0079b8437f54c6881098b815e21.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "595px"}} src="https://capofcom.cafe24.com/l14_coordy/product/c69d906afdab44b0606e3311e2f2ab97.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "671px"}} src="https://capofcom.cafe24.com/l14_coordy/product/e5a5b736d98007bde792d0e89da50247.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "59px"}} src="https://capofcom.cafe24.com/l14_coordy/product/bef810e0d70e04ffe7d78e6b89293313.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "59px"}} src="https://capofcom.cafe24.com/l14_coordy/product/bef810e0d70e04ffe7d78e6b89293313.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "1077px"}} src="https://capofcom.cafe24.com/l14_coordy/product/f201d814f5f8236ac9e54f39a0a9058b.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "852px"}} src="https://capofcom.cafe24.com/l14_coordy/product/0dd6e8af15cd81998a9ba535ad73699f.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "655px"}} src="https://capofcom.cafe24.com/l14_coordy/product/a834b74d9ce275f6d9140cdc80b1e164.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "549px"}} src="https://capofcom.cafe24.com/l14_coordy/product/a95d8e2883844d422f564a8d70d7452d.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "233px"}} src="https://capofcom.cafe24.com/l14_coordy/product/19cd00cbc42a4ea9ff5011e5cc83b525.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "278px"}} src="https://capofcom.cafe24.com/l14_coordy/product/038cf370f04ea7be08e40cb8e4a15c4d.jpg" alt=""/>
                <img style={{display:"block", width:"100%", maxWidth:"initial"}} src="https://capofcom.cafe24.com/l14_coordy/product/a230566da601d62335dc84022e021fcb.gif" alt=""/>
                <img style={{display:"block", width:"100%", maxWidth:"initial"}} src="https://capofcom.cafe24.com/l14_coordy/product/a230566da601d62335dc84022e021fcb.gif" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "288px"}} src="https://capofcom.cafe24.com/l14_coordy/product/4ec7115da2adf4f2188ce57f9648465e.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "288px"}} src="https://capofcom.cafe24.com/l14_coordy/product/4ec7115da2adf4f2188ce57f9648465e.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "263px"}} src="https://capofcom.cafe24.com/l14_coordy/product/397b439efd4639d40d0d3a05d8ec0a79.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "855px"}} src="https://capofcom.cafe24.com/l14_coordy/product/14d6610c3161b57ebb902ad3914d172f.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%", minHeight: "602px"}} src="https://capofcom.cafe24.com/l14_coordy/product/efa6b1b0ca55e6eb4e20794c95c8b0f5.jpg" alt=""/>
              </div>
            </section>
            
            <section className="pt-xl scroll-mt-32" id="reviews">
              <div className="flex flex-col md:flex-row justify-between items-end gap-md mb-lg">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-primary">리뷰 ({reviewCount})</h2>
                  <div className="flex items-center gap-xs mt-xs">
                    <div className="flex text-primary">
                      <span className="material-symbols-outlined text-lg filled">star</span>
                      <span className="material-symbols-outlined text-lg filled">star</span>
                      <span className="material-symbols-outlined text-lg filled">star</span>
                      <span className="material-symbols-outlined text-lg filled">star</span>
                      <span className="material-symbols-outlined text-lg filled">star_half</span>
                    </div>
                    <span className="font-headline-md text-headline-md font-bold ml-xs">4.9</span>
                    <span className="font-body-md text-on-surface-variant">/ 5.0</span>
                  </div>
                </div>
                <div className="flex items-center gap-sm">
                  <button onClick={() => window.location.href = '/review'} className="text-primary font-label-md text-label-md hover:underline transition-all">
                      리뷰 전체보기
                  </button>
                  <span className="text-outline-variant font-label-md text-label-md">|</span>
                  <button 
                    className={`font-label-md text-label-md transition-all ${isLoggedIn && hasOrder ? 'text-primary hover:underline' : 'text-on-surface-variant/50 cursor-not-allowed'}`}
                    disabled={!isLoggedIn || !hasOrder}
                    onClick={() => window.open('/review/write', 'writeReviewPopup', 'width=500,height=700,scrollbars=yes,resizable=yes')}
                  >
                      후기쓰기
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {topReviews.map((review, i) => {
                  const initial = review.customer_name ? review.customer_name.charAt(0).toUpperCase() : 'U';
                  const bgClass = i === 0 ? "bg-secondary-fixed" : "bg-primary-fixed";
                  return (
                    <div key={i} className="bg-surface-container-low p-lg rounded-xl border border-outline-variant/20">
                      <div className="flex justify-between items-start mb-md">
                        <div className="flex items-center gap-sm">
                          <div className={`w-10 h-10 rounded-full ${bgClass} flex items-center justify-center text-primary font-bold`}>{initial}</div>
                          <div>
                            <p className="font-label-md text-label-md text-on-surface">{review.customer_name}</p>
                            <p className="font-caption text-caption text-on-surface-variant">{review.created_at}</p>
                          </div>
                        </div>
                        <div className="flex text-primary">
                          {[...Array(5)].map((_, starIndex) => (
                            <span key={starIndex} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: starIndex < review.rating ? "'FILL' 1" : "'FILL' 0" }}>
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant">{review.content}</p>
                    </div>
                  );
                })}
              </div>
            </section>
            
            <section className="pt-xl pb-xl scroll-mt-32" id="qa">
              <div className="flex justify-between items-center mb-lg">
                <h2 className="font-headline-lg text-headline-lg text-primary">Q&amp;A ({qnaCount})</h2>
                <div className="flex items-center gap-sm">
                  <button onClick={() => window.location.href = '/qna'} className="text-primary font-label-md text-label-md hover:underline transition-all">
                      Q&amp;A 전체보기
                  </button>
                  <span className="text-outline-variant font-label-md text-label-md">|</span>
                  <button 
                    className="font-label-md text-label-md transition-all text-primary hover:underline"
                    onClick={handleInquiryClick}
                  >
                      문의하기
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-sm">
                <details className="group bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-hidden" open>
                  <summary className="flex justify-between items-center p-md cursor-pointer list-none hover:bg-surface-container transition-colors">
                    <div className="flex items-center gap-md">
                      <span className="bg-primary-container text-on-primary-container w-8 h-8 rounded-full flex items-center justify-center font-bold">Q</span>
                      <span className="font-body-md font-medium text-on-surface">권장 섭취량과 섭취방법을 알려주세요.</span>
                    </div>
                    <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                  </summary>
                  <div className="p-md pt-0 pl-[72px]">
                    <p className="font-body-md text-on-surface-variant">A: 성인 1일 1~2회, 1회 1포씩 섭취하십시오. 잠들기 전 섭취하면 숙면에 더욱 도움이 됩니다. 15세 이하는 성인 섭취량의 절반 정도를 섭취하십시오.</p>
                  </div>
                </details>
                <details className="group bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-hidden" open>
                  <summary className="flex justify-between items-center p-md cursor-pointer list-none hover:bg-surface-container transition-colors">
                    <div className="flex items-center gap-md">
                      <span className="bg-primary-container text-on-primary-container w-8 h-8 rounded-full flex items-center justify-center font-bold">Q</span>
                      <span className="font-body-md font-medium text-on-surface">보관 방법은 어떻게 되나요?</span>
                    </div>
                    <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                  </summary>
                  <div className="p-md pt-0 pl-[72px]">
                    <p className="font-body-md text-on-surface-variant">A: 직사광선을 피해 습기가 적은 서늘한 곳에 보관하여 주시기 바랍니다. 개봉 후 변질될 수 있으므로 즉시 섭취하시기 바랍니다.</p>
                  </div>
                </details>
              </div>
            </section>
          </div>
          
          <div className="lg:col-span-4 relative">
            <div className="sticky-panel flex flex-col gap-md">
              <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant flex flex-col gap-md shadow-sm">
                <h1 className="font-headline-md text-headline-md text-on-surface leading-tight mt-xs">
                  엘포틴 코디 15ml X 15포<br/>
                  <span className="font-body-md text-body-md text-on-surface-variant block mt-xs">[발효동충하초추출물, 엘포틴유산균]</span>
                </h1>
                <div className="h-px bg-outline-variant w-full my-xs"></div>
                <div className="flex flex-col gap-base">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="pricing-options">옵션</label>
                  <select 
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm text-on-surface font-body-md text-body-md focus:border-primary focus:ring-2 focus:ring-primary-container transition-all cursor-pointer appearance-none" 
                    id="pricing-options"
                    onChange={handlePriceChange}
                    defaultValue="1"
                  >
                    <option value="1">1개: 65,000원</option>
                    <option value="2">2개: 110,000원</option>
                    <option value="3">6개: 270,000원</option>
                    <option value="4">12개: 480,000원</option>
                  </select>
                </div>
                <div className="flex justify-between items-center py-xs">
                  <span className="font-label-md text-label-md text-on-surface-variant"></span>
                  <span className="font-label-md text-label-md font-bold text-primary">무료배송</span>
                </div>
                <div className="h-px bg-outline-variant w-full my-xs"></div>
                <div className="flex justify-between items-end mb-sm">
                  <span className="font-body-md text-body-md text-on-surface-variant">총 금액</span>
                  <span className="font-headline-md text-headline-md font-bold text-on-surface" id="total-amount">{totalAmount}</span>
                </div>
                <div className="flex flex-col gap-sm">
                  <button className="w-full bg-primary text-on-primary font-label-md text-label-md py-sm rounded-lg hover:opacity-90 active:scale-98 transition-all duration-200 shadow-sm flex items-center justify-center gap-xs" id="drawer-buy-btn" onClick={handleBuyClick}>
                    구매하기
                  </button>
                  <button className="w-full bg-surface-container text-primary font-label-md text-label-md py-sm rounded-lg hover:bg-surface-container-high active:scale-98 transition-all duration-200 flex items-center justify-center gap-xs" id="drawer-subscribe-btn" onClick={handleSubscribeClick}>
                    정기구매
                  </button>
                  <button className="w-full bg-transparent border border-primary text-primary font-label-md text-label-md py-sm rounded-lg hover:bg-surface-container-low active:scale-98 transition-all duration-200 flex items-center justify-center gap-xs" id="drawer-cart-btn" onClick={handleAddToCart}>
                    장바구니
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />

      {/* Back to Top Button */}
      <button 
        className={`fixed bottom-8 right-8 z-50 bg-[#5C5544] text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 focus:outline-none hover:opacity-90 hover:scale-110 active:scale-95 ${showBackToTop ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-4'}`}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <span className="material-symbols-outlined">arrow_upward</span>
      </button>

      {/* Name Input Modal */}
      {showNameModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
          padding: '16px',
          writingMode: 'horizontal-tb',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            padding: '28px',
            width: '100%',
            maxWidth: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            writingMode: 'horizontal-tb',
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1d1b18', lineHeight: 1.4 }}>이름을 입력해주세요</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#4b463d', lineHeight: 1.6 }}>문의하기에 사용할 이름을 입력해 주세요.</p>
            <input
              type="text"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid #cec5b9',
                fontSize: '16px',
                color: '#1d1b18',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
                writingMode: 'horizontal-tb',
              }}
              placeholder="이름"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNameModalSubmit(); }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                style={{
                  padding: '10px 20px', borderRadius: '8px',
                  border: '1.5px solid #cec5b9',
                  background: 'transparent', color: '#4b463d',
                  fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                }}
                onClick={handleNameModalCancel}
              >
                취소
              </button>
              <button
                style={{
                  padding: '10px 20px', borderRadius: '8px',
                  border: 'none',
                  background: nameInput.trim() && !nameSubmitting ? '#504530' : '#ccc',
                  color: '#fff',
                  fontSize: '14px', fontWeight: 500,
                  cursor: nameInput.trim() && !nameSubmitting ? 'pointer' : 'not-allowed',
                }}
                onClick={handleNameModalSubmit}
                disabled={!nameInput.trim() || nameSubmitting}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
