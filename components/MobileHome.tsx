"use client";

import React, { useEffect, useRef, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function MobileHome({ initialReviewCount = 0, initialQnaCount = 0, topReviews = [] }: { initialReviewCount?: number, initialQnaCount?: number, topReviews?: any[] }) {
  const [reviewCount, setReviewCount] = useState<number>(initialReviewCount);
  const [qnaCount, setQnaCount] = useState<number>(initialQnaCount);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasOrder, setHasOrder] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const nameResolverRef = React.useRef<((name: string | null) => void) | null>(null);

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
    const selectEl = document.getElementById("m-pricing-options") as HTMLSelectElement;
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
        window.location.href = '/inquiry';
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
    const selectEl = document.getElementById("m-pricing-options") as HTMLSelectElement;
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
    const selectEl = document.getElementById("m-pricing-options") as HTMLSelectElement;
    const opt = selectEl ? selectEl.value : "1";
    window.location.href = `/billing?option=${opt}`;
  };

  useEffect(() => {
    // Tab scrollspy
    const tabLinks = document.querySelectorAll(".m-tab-link");
    const sections = document.querySelectorAll("section[id^='m-']");

    const handleScroll = () => {
      let current = "";
      sections.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop;
        if (window.scrollY >= sectionTop - 150) {
          current = section.getAttribute("id") || "";
        }
      });
      tabLinks.forEach((link) => {
        link.classList.remove("text-primary", "border-primary", "border-b-2", "active", "-mb-[1px]");
        link.classList.add("text-on-surface-variant");
        if (link.getAttribute("href")?.substring(1) === current) {
          link.classList.add("text-primary", "border-primary", "border-b-2", "active", "-mb-[1px]");
          link.classList.remove("text-on-surface-variant");
        }
      });
      setShowBackToTop(window.scrollY > 300);
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
            const res = await fetch(`/api/check-order?customerId=${customerId}&status=2,4&unreviewed=true`);
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
        if (pendingAction === "inquiry" && window.innerWidth < 1024) {
          sessionStorage.removeItem("pendingAction");
          handleInquiryClick();
        } else if (pendingAction === "cart") {
          sessionStorage.removeItem("pendingAction");
          const savedPricedId = sessionStorage.getItem("pendingCartPricedId");
          sessionStorage.removeItem("pendingCartPricedId");
          if (savedPricedId) {
            const selectEl = document.getElementById("m-pricing-options") as HTMLSelectElement;
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
          document.querySelector(targetId)?.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

    // ── Purchase Drawer ──
    // Use inline styles for show/hide so Tailwind build-time purging
    // cannot strip the "active" state classes (opacity-100, translate-y-0, etc.)
    const purchaseOverlay = document.getElementById("m-purchase-overlay") as HTMLElement | null;
    const purchaseDrawer  = document.getElementById("m-purchase-drawer")  as HTMLElement | null;
    const openBtn         = document.getElementById("m-open-purchase");
    const closeBtn        = document.getElementById("m-close-purchase");
    const backdrop        = document.getElementById("m-backdrop-close");

    function openDrawer() {
      if (!purchaseOverlay || !purchaseDrawer) return;
      purchaseOverlay.style.opacity = "1";
      purchaseOverlay.style.pointerEvents = "auto";
      purchaseDrawer.style.transform = "translateY(0)";
    }

    function closeDrawer() {
      if (!purchaseOverlay || !purchaseDrawer) return;
      purchaseOverlay.style.opacity = "0";
      purchaseOverlay.style.pointerEvents = "none";
      purchaseDrawer.style.transform = "translateY(100%)";
    }

    if (openBtn)   openBtn.addEventListener("click",    openDrawer);
    if (closeBtn)  closeBtn.addEventListener("click",   closeDrawer);
    if (backdrop)  backdrop.addEventListener("click",   closeDrawer);

    // Pricing select
    const pricingSelect   = document.getElementById("m-pricing-options") as HTMLSelectElement | null;
    const totalAmountEl   = document.getElementById("m-total-amount");
    const prices: Record<string, string> = {
      "1": "65,000원",
      "2": "110,000원",
      "3": "270,000원",
      "4": "480,000원",
    };
    if (pricingSelect && totalAmountEl) {
      pricingSelect.addEventListener("change", (e) => {
        const val = (e.target as HTMLSelectElement).value;
        if (prices[val]) totalAmountEl.textContent = prices[val];
      });
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="pb-28">
      <Header />

      <main className="flex-grow w-[90%] mx-auto py-xl flex flex-col gap-lg items-start">
        <div className="w-full flex flex-col gap-xl">
          <div className="rounded-xl overflow-hidden bg-surface-container-low flex justify-center items-center">
            <img alt="L14 Cordy Product Image" className="max-w-full h-auto object-cover object-center rounded-xl shadow-sm border border-surface-variant" style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/5383834b5b3bfe2017b727548b002180.jpg"/>
          </div>

          <div className="flex flex-col gap-xl">
            <div className="border-b border-outline-variant sticky top-[80px] bg-surface pt-md z-40 -mx-xs px-xs">
              <nav className="flex gap-lg overflow-x-auto whitespace-nowrap hide-scrollbar" id="product-tabs">
                <a className="text-primary border-b-2 border-primary pb-sm font-label-md text-label-md px-xs -mb-[1px] m-tab-link active" href="#m-description">상세정보</a>
                <a className="text-on-surface-variant hover:text-primary transition-colors pb-sm font-label-md text-label-md px-xs m-tab-link" href="#m-reviews">리뷰 ({reviewCount})</a>
                <a className="text-on-surface-variant hover:text-primary transition-colors pb-sm font-label-md text-label-md px-xs m-tab-link" href="#m-qa">Q&amp;A ({qnaCount})</a>
              </nav>
            </div>

            <section className="bg-[#FDF8F4] rounded-xl shadow-sm border border-surface-variant overflow-hidden" id="m-description">
              <div className="prose prose-on-surface max-w-none font-body-md text-body-md text-on-surface-variant space-y-sm">
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/5383834b5b3bfe2017b727548b002180.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/0bbd8661cf5e44d2940ad140fdd2aaa4.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/f465b3ff7828529a60443f3e9dde2565.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/057f4f7458e823c395ad01e745e258f6.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/534ce2f89d0f15a61fa916e58b868362.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/2a42c0079b8437f54c6881098b815e21.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/c69d906afdab44b0606e3311e2f2ab97.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/e5a5b736d98007bde792d0e89da50247.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/bef810e0d70e04ffe7d78e6b89293313.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/bef810e0d70e04ffe7d78e6b89293313.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/f201d814f5f8236ac9e54f39a0a9058b.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/0dd6e8af15cd81998a9ba535ad73699f.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/a834b74d9ce275f6d9140cdc80b1e164.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/a95d8e2883844d422f564a8d70d7452d.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/19cd00cbc42a4ea9ff5011e5cc83b525.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/038cf370f04ea7be08e40cb8e4a15c4d.jpg" alt=""/>
                <img style={{display:"block", width:"100%", maxWidth:"initial"}} src="https://capofcom.cafe24.com/l14_coordy/product/a230566da601d62335dc84022e021fcb.gif" alt=""/>
                <img style={{display:"block", width:"100%", maxWidth:"initial"}} src="https://capofcom.cafe24.com/l14_coordy/product/a230566da601d62335dc84022e021fcb.gif" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/4ec7115da2adf4f2188ce57f9648465e.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/4ec7115da2adf4f2188ce57f9648465e.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/397b439efd4639d40d0d3a05d8ec0a79.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/14d6610c3161b57ebb902ad3914d172f.jpg" alt=""/>
                <img style={{margin:"0 auto", display: "block", maxWidth:"100%"}} src="https://capofcom.cafe24.com/l14_coordy/product/efa6b1b0ca55e6eb4e20794c95c8b0f5.jpg" alt=""/>
              </div>
            </section>

            <section className="bg-surface-container-lowest rounded-xl p-lg shadow-sm border border-surface-variant flex flex-col gap-md" id="m-reviews">
              <div className="flex justify-between items-center">
                <h2 className="font-headline-md text-headline-md text-on-surface">고객 리뷰 ({reviewCount})</h2>
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                  <span className="font-label-md text-label-md font-bold text-on-surface">4.9</span>
                  <span className="font-caption text-caption text-on-surface-variant">({reviewCount}개)</span>
                </div>
              </div>
              <div className="flex flex-col gap-md divide-y divide-surface-variant">
                {topReviews.map((review, i) => (
                  <div key={i} className={i === 0 ? "pt-md pb-xs" : "pt-md pb-xs"}>
                    <div className="flex flex-col gap-xs mb-base">
                      <div className="flex justify-end text-primary">
                        {[...Array(5)].map((_, starIndex) => (
                          <span key={starIndex} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: starIndex < review.rating ? "'FILL' 1" : "'FILL' 0" }}>
                            star
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-start">
                        <span className="font-label-md text-label-md font-semibold text-on-surface">{review.customer_name}</span>
                        <span className="font-label-md text-label-md font-normal text-on-surface-variant ml-xs">{review.created_at}</span>
                      </div>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">{review.content}</p>
                  </div>
                ))}
              </div>
              <div className="mt-sm self-start flex items-center gap-sm">
                <button onClick={() => window.location.href = '/review'} className="text-primary font-label-md text-label-md hover:underline transition-all">
                    리뷰 전체보기
                </button>
                {isLoggedIn && hasOrder && (
                  <>
                    <span className="text-outline-variant font-label-md text-label-md">|</span>
                    <button 
                      className="font-label-md text-label-md transition-all text-primary hover:underline"
                      onClick={() => window.location.href = '/review/write'}
                    >
                        후기쓰기
                    </button>
                  </>
                )}
              </div>
            </section>

            <section className="bg-surface-container-lowest rounded-xl p-lg shadow-sm border border-surface-variant" id="m-qa">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Q&amp;A ({qnaCount})</h2>
              <div className="space-y-md">
                <div className="bg-surface-container-low rounded-lg p-md">
                  <p className="font-label-md text-label-md font-semibold text-on-surface mb-xs">Q: 권장 섭취량과 섭취방법을 알려주세요.</p>
                  <p className="font-body-md text-body-md text-on-surface-variant">A: 성인 1일 1~2회, 1회 1포씩 섭취하십시오. 잠들기 전 섭취하면 숙면에 더욱 도움이 됩니다. 15세 이하는 성인 섭취량의 절반 정도를 섭취하십시오.</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-md">
                  <p className="font-label-md text-label-md font-semibold text-on-surface mb-xs">Q: 보관 방법은 어떻게 되나요?</p>
                  <p className="font-body-md text-body-md text-on-surface-variant">A: 직사광선을 피해 습기가 적은 서늘한 곳에 보관하여 주시기 바랍니다. 개봉 후 변질될 수 있으므로 즉시 섭취하시기 바랍니다.</p>
                </div>
              </div>
              <div className="mt-sm self-start flex items-center gap-sm">
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
            </section>
          </div>
        </div>
      </main>

      <Footer />

      {/* Back to Top Button */}
      <button
        className={`fixed bottom-24 right-8 z-50 bg-primary text-on-primary w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 focus:outline-none hover:opacity-90 hover:scale-110 active:scale-95 ${showBackToTop ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-4'}`}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <span className="material-symbols-outlined">arrow_upward</span>
      </button>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-outline-variant p-md flex justify-center items-center">
        <button
          id="m-open-purchase"
          className="w-full max-w-[400px] bg-primary text-on-primary font-label-md text-label-md py-sm rounded-lg hover:opacity-90 active:scale-98 transition-all duration-200 shadow-sm flex items-center justify-center gap-xs"
        >
          구매하기
        </button>
      </div>

      {/* Purchase Drawer Overlay — always in DOM, shown/hidden via inline styles */}
      <div
        id="m-purchase-overlay"
        className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-end justify-center"
        style={{ opacity: 0, pointerEvents: "none", transition: "opacity 0.3s" }}
      >
        {/* Clickable backdrop to close */}
        <div className="absolute inset-0" id="m-backdrop-close"></div>

        {/* Drawer */}
        <div
          id="m-purchase-drawer"
          className="relative w-full max-w-[400px] bg-white rounded-t-2xl p-lg shadow-2xl border-t border-gray-200 flex flex-col gap-md z-10"
          style={{ transform: "translateY(100%)", transition: "transform 0.3s ease-out" }}
        >
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <span></span>
            <button id="m-close-purchase" className="text-gray-500 hover:text-black p-1">
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>

          <h2 className="font-bold text-lg text-black leading-tight mt-2">
            엘포틴 코디 15ml X 15포<br/>
            <span className="font-normal text-sm text-gray-500 block mt-1">[발효동충하초추출물, 엘포틴유산균]</span>
          </h2>

          <div className="h-px bg-gray-200 w-full my-2"></div>

          <div className="flex flex-col gap-2">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="m-pricing-options">옵션</label>
            <select
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm text-on-surface font-body-md text-body-md focus:border-primary focus:ring-2 focus:ring-primary-container transition-all cursor-pointer"
              id="m-pricing-options"
              defaultValue="1"
            >
              <option value="1">1개: 65,000원</option>
              <option value="2">2개: 110,000원</option>
              <option value="3">6개: 270,000원</option>
              <option value="4">12개: 480,000원</option>
            </select>
          </div>

          <div className="flex justify-between items-center py-2">
            <span></span>
            <span className="font-label-md text-label-md font-bold text-primary">무료배송</span>
          </div>

          <div className="h-px bg-gray-200 w-full my-2"></div>

          <div className="flex justify-between items-end mb-4">
            <span className="text-sm text-gray-600">총 금액</span>
            <span className="text-xl font-bold text-black" id="m-total-amount">65,000원</span>
          </div>

          <div className="flex flex-col gap-3">
            <button
              className="w-full bg-[#7E715C] text-white font-bold py-3 rounded-lg flex items-center justify-center"
              onClick={handleBuyClick}
            >
              구매하기
            </button>
            <button className="w-full bg-surface-container text-primary font-bold py-3 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-all duration-200" onClick={handleSubscribeClick}>
              정기구매
            </button>
            <button className="w-full bg-white border border-[#7E715C] text-[#7E715C] font-bold py-3 rounded-lg flex items-center justify-center" onClick={handleAddToCart}>
              장바구니
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );
}
