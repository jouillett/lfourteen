"use client";

import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

// Cart Item type
interface CartItem {
  cart_item_id: number;
  product_id?: number;
  price: number;
  cart_quantity: number;
  image: string;
  description: string;
  priced_quantity: string;
}

export default function CartPage() {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const toggleSummary = () => {
    setSummaryExpanded(!summaryExpanded);
  };

  const fetchCartItems = async () => {
    try {
      const userId = localStorage.getItem("customerId") || localStorage.getItem("userId");
      if (!userId || localStorage.getItem("isLoggedIn") !== "true") {
        alert("로그인이 필요합니다.");
        window.location.href = "/login?redirect=/cart";
        return;
      }
      const res = await fetch(`/api/cart/list?userId=${userId}`);
      const data = await res.json();
      if (data.success && data.items) {
        setCartItems(data.items);
        setCheckedItems(new Set(data.items.map((i: CartItem) => i.cart_item_id)));
      }
    } catch (error) {
      console.error("Failed to fetch cart items", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartItems();
  }, []);

  const handleToggleCheckAll = () => {
    if (checkedItems.size === cartItems.length) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(new Set(cartItems.map((i) => i.cart_item_id)));
    }
  };

  const handleToggleCheckItem = (id: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const updateQuantity = (id: number, delta: number) => {
    setCartItems(cartItems.map(item => {
      if (item.cart_item_id === id) {
        const newQuantity = Math.max(1, item.cart_quantity + delta);
        fetch("/api/cart/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartItemId: id, quantity: newQuantity })
        }).then(() => window.dispatchEvent(new Event("cartUpdated")));
        return { ...item, cart_quantity: newQuantity };
      }
      return item;
    }));
  };

  const setQuantity = (id: number, val: number) => {
    setCartItems(cartItems.map(item => {
      if (item.cart_item_id === id) {
        const newQuantity = Math.max(1, isNaN(val) ? 1 : val);
        fetch("/api/cart/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartItemId: id, quantity: newQuantity })
        }).then(() => window.dispatchEvent(new Event("cartUpdated")));
        return { ...item, cart_quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeItem = async (id: number) => {
    try {
      const userId = localStorage.getItem("customerId") || localStorage.getItem("userId");
      if (userId) {
        await fetch("/api/cart/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartItemId: id })
        });
        window.dispatchEvent(new Event("cartUpdated"));
      }
      setCartItems(cartItems.filter((i) => i.cart_item_id !== id));
      const newChecked = new Set(checkedItems);
      newChecked.delete(id);
      setCheckedItems(newChecked);
    } catch (error) {
      console.error("Failed to remove item", error);
    }
  };

  const removeSelectedItems = async () => {
    if (checkedItems.size === 0) return;
    if (!confirm("선택하신 상품을 삭제하시겠습니까?")) return;
    try {
      const userId = localStorage.getItem("customerId") || localStorage.getItem("userId");
      if (userId) {
        const promises = Array.from(checkedItems).map(id => 
          fetch("/api/cart/remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cartItemId: id })
          })
        );
        await Promise.all(promises);
        window.dispatchEvent(new Event("cartUpdated"));
      }
      setCartItems(cartItems.filter((i) => !checkedItems.has(i.cart_item_id)));
      setCheckedItems(new Set());
    } catch (error) {
      console.error("Failed to remove selected items", error);
    }
  };

  const emptyCart = async () => {
    if (cartItems.length === 0) return;
    if (!confirm("장바구니를 전부 비우시겠습니까?")) return;
    try {
      const userId = localStorage.getItem("customerId") || localStorage.getItem("userId");
      if (userId) {
        await fetch("/api/cart/empty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: Number(userId) })
        });
        window.dispatchEvent(new Event("cartUpdated"));
      }
      setCartItems([]);
      setCheckedItems(new Set());
      alert("장바구니를 비웠습니다.");
    } catch (error) {
      console.error("Failed to empty cart", error);
    }
  };

  const totalPrice = cartItems
    .filter(item => checkedItems.has(item.cart_item_id))
    .reduce((sum, item) => sum + item.price * item.cart_quantity, 0);

  const isAllChecked = cartItems.length > 0 && checkedItems.size === cartItems.length;

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen antialiased selection:bg-primary-container selection:text-on-primary-container">
      <Header />

      {/* Main Content Canvas */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-md lg:px-lg py-xl">
        <div className="flex flex-col lg:flex-row gap-xl w-full">
          
          {/* Left: Cart Items */}
          <div className="flex-grow lg:w-2/3 flex flex-col gap-lg">
            {/* Page Header */}
            <div className="flex items-center justify-between border-b border-outline-variant pb-md">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">장바구니</h1>
            </div>

            {/* Cart Action Bar */}
            <div className="flex items-center justify-between py-sm text-on-surface-variant">
              <label className="flex items-center gap-sm cursor-pointer hover:opacity-70 transition-opacity">
                <input 
                  checked={isAllChecked} 
                  onChange={handleToggleCheckAll}
                  className="rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface bg-surface-container w-5 h-5 cursor-pointer" 
                  type="checkbox" 
                />
                <span className="font-label-md text-label-md">전체 선택</span>
              </label>
              <div className="flex items-center gap-sm">
                <button onClick={removeSelectedItems} className="font-label-md text-label-md text-outline hover:text-error transition-colors flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  선택 삭제
                </button>
                <button onClick={emptyCart} className="font-label-md text-label-md text-outline hover:text-primary transition-colors flex items-center gap-xs ml-sm">
                  장바구니 비우기
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex flex-col gap-md">
              {loading ? (
                <div className="py-xl text-center text-on-surface-variant font-body-md">
                  장바구니를 불러오는 중입니다...
                </div>
              ) : cartItems.length === 0 ? (
                <div className="py-xl text-center text-on-surface-variant font-body-md bg-surface-container-low rounded-lg border border-outline-variant/30">
                  장바구니가 비어 있습니다.
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.cart_item_id} className="mb-md">
                    {/* --- MOBILE LAYOUT --- */}
                    <div className="md:hidden bg-surface-container-low rounded-lg p-md relative group mb-md border border-outline-variant/30 flex items-start gap-4 w-full">
                      
                      {/* X Button (Absolute Top Right of Card) */}
                      <button onClick={() => removeItem(item.cart_item_id)} className="absolute top-2 right-2 text-on-surface-variant hover:text-error transition-colors p-1 z-10">
                        <span className="material-symbols-outlined text-xl">close</span>
                      </button>

                      {/* Checkbox Column */}
                      <div className="pt-8 flex-shrink-0">
                        <input 
                          checked={checkedItems.has(item.cart_item_id)}
                          onChange={() => handleToggleCheckItem(item.cart_item_id)}
                          className="rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface bg-surface-container w-5 h-5 cursor-pointer shadow-sm" 
                          type="checkbox" 
                        />
                      </div>

                      {/* Content Wrapper */}
                      <div className="flex-grow flex flex-col min-w-0 pt-1">
                        
                        {/* Top Row: Image & Details */}
                        <div className="flex gap-4 pr-8 items-center">
                          {/* Image */}
                          <div className="w-20 h-20 flex-shrink-0 bg-surface-container rounded-lg overflow-hidden border border-outline-variant/20">
                            <img alt={item.description} className="w-full h-full object-cover mix-blend-multiply" src={item.image || "https://placehold.co/200x200/png"} />
                          </div>
                          
                          {/* Details (Vertically Centered via items-center) */}
                          <div className="flex flex-col">
                            <h3 className="font-label-md text-label-md text-on-surface font-semibold line-clamp-2 leading-tight mb-1">{item.description}</h3>
                            <p className="font-caption text-caption text-on-surface-variant">{item.priced_quantity}</p>
                          </div>
                        </div>

                        {/* Bottom Row: Quantity & Price */}
                        <div className="flex items-center mt-4 gap-4">
                          {/* Quantity */}
                          <div className="flex items-center border border-outline-variant rounded-lg bg-surface h-10 w-24 overflow-hidden flex-shrink-0">
                            <button onClick={() => updateQuantity(item.cart_item_id, -1)} className="w-8 h-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors border-r border-outline-variant">
                              <span className="material-symbols-outlined text-base">remove</span>
                            </button>
                            <input 
                              onChange={(e) => setQuantity(item.cart_item_id, parseInt(e.target.value))}
                              value={item.cart_quantity}
                              className="flex-grow w-8 h-full border-none bg-transparent text-center font-label-md text-label-md text-on-surface p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                              min="1" 
                              type="number" 
                            />
                            <button onClick={() => updateQuantity(item.cart_item_id, 1)} className="w-8 h-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors border-l border-outline-variant">
                              <span className="material-symbols-outlined text-base">add</span>
                            </button>
                          </div>
                          
                          {/* Price */}
                          <div className="flex-grow flex items-center justify-end pr-2">
                            <span className="font-label-md text-base text-on-surface font-semibold">{(item.price * item.cart_quantity).toLocaleString()}원</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* --- DESKTOP LAYOUT --- */}
                    <div className="hidden md:flex bg-surface-container-low rounded-lg p-md flex-row items-center gap-md border border-outline-variant/30 transition-all hover:bg-surface-container relative group">
                      <div className="flex h-5 items-center mr-2">
                        <input 
                          checked={checkedItems.has(item.cart_item_id)}
                          onChange={() => handleToggleCheckItem(item.cart_item_id)}
                          className="rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface bg-surface-container w-5 h-5 cursor-pointer" 
                          type="checkbox" 
                        />
                      </div>
                      {/* Image */}
                      <div className="w-20 h-20 flex-shrink-0 bg-surface-container rounded-lg overflow-hidden relative border border-outline-variant/20">
                        <img alt={item.description} className="w-full h-full object-cover mix-blend-multiply" src={item.image || "https://placehold.co/200x200/png"} />
                      </div>
                      {/* Details */}
                      <div className="flex flex-col flex-grow w-auto">
                        <h3 className="font-label-md text-label-md text-on-surface mb-xs font-semibold line-clamp-2">{item.description}</h3>
                        <p className="font-caption text-caption text-on-surface-variant">{item.priced_quantity}</p>
                      </div>
                      <div className="flex items-center justify-end w-auto gap-lg">
                        {/* Quantity */}
                        <div className="flex items-center border border-outline-variant rounded-lg bg-surface h-10 w-24">
                          <button onClick={() => updateQuantity(item.cart_item_id, -1)} className="px-2 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center h-full w-1/3 border-r border-outline-variant">
                            <span className="material-symbols-outlined text-[16px]">remove</span>
                          </button>
                          <input 
                            onChange={(e) => setQuantity(item.cart_item_id, parseInt(e.target.value))}
                            value={item.cart_quantity}
                            className="w-1/3 h-full border-none bg-transparent text-center font-label-md text-label-md text-on-surface p-0 focus:ring-0" 
                            min="1" 
                            type="number" 
                          />
                          <button onClick={() => updateQuantity(item.cart_item_id, 1)} className="px-2 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center h-full w-1/3 border-l border-outline-variant">
                            <span className="material-symbols-outlined text-[16px]">add</span>
                          </button>
                        </div>
                        {/* Price */}
                        <div className="text-right flex-shrink-0 min-w-[80px]">
                          <span className="font-label-md text-label-md text-on-surface font-semibold">{(item.price * item.cart_quantity).toLocaleString()}원</span>
                        </div>
                        {/* Actions */}
                        <button onClick={() => removeItem(item.cart_item_id)} className="text-on-surface-variant hover:text-error transition-colors p-xs rounded-full hover:bg-error-container">
                          <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mobile Sticky Footer Area Spacer */}
            <div className="h-32 lg:h-0"></div>
          </div>

          {/* Right: Desktop Order Summary */}
          <div className="hidden lg:block lg:w-1/3">
            <div className="bg-surface-container-high rounded-lg p-lg shadow-[0_8px_24px_rgba(74,69,62,0.12)] sticky top-28">
              <h2 className="text-headline-md font-headline-md text-primary mb-md border-b border-outline-variant pb-sm">주문 예상 금액</h2>
              <div className="flex flex-col gap-sm mb-lg">
                <div className="flex justify-between items-center text-body-md font-body-md text-on-surface-variant">
                  <span>총 상품금액</span>
                  <span>{totalPrice.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center text-body-md font-body-md text-on-surface-variant">
                  <span>배송비</span>
                  <span>+ 0원</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-headline-md font-headline-md font-bold text-primary border-t border-outline-variant pt-md mb-lg">
                <span>최종 결제 금액</span>
                <span>{totalPrice.toLocaleString()}원</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-sm relative z-10">
                <button onClick={() => window.location.href = '/'} className="flex-1 bg-surface border border-outline-variant text-on-surface font-label-md text-label-md py-sm px-md rounded-lg hover:bg-surface-container-high transition-colors text-center justify-center">
                  쇼핑 계속
                </button>
                <button onClick={() => window.location.href = '/order?source=cart'} className="flex-1 bg-primary text-on-primary font-label-md text-label-md py-sm px-md rounded-lg hover:bg-on-primary-fixed-variant transition-colors shadow-sm flex items-center justify-center gap-xs">
                  주문 하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Checkout Summary */}
      <div className="fixed bottom-0 left-0 w-full bg-surface-container-high border-t border-outline-variant p-md shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-40 lg:hidden transition-all duration-300">
        <div className="max-w-[440px] md:max-w-full mx-auto w-full flex flex-col gap-sm">
          
          {/* COLLAPSED STATE (Mobile only) */}
          <div className={`flex-col gap-sm md:hidden ${summaryExpanded ? 'hidden' : 'flex'}`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-xs">
                <span className="font-label-md text-label-md font-bold text-on-surface">결제예정금액</span>
                <span className="font-headline-md text-headline-md font-bold text-primary">{totalPrice.toLocaleString()}원</span>
              </div>
              <button onClick={toggleSummary} className="p-1 text-on-surface-variant hover:text-primary transition-colors bg-surface rounded-full border border-outline-variant shadow-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">keyboard_arrow_up</span>
              </button>
            </div>
            <div className="flex flex-row gap-sm">
              <button onClick={() => window.location.href = '/'} className="flex-1 bg-surface border border-outline-variant text-on-surface font-label-md text-label-md py-3 rounded-lg hover:bg-surface-container-high transition-colors flex justify-center items-center">
                쇼핑 계속
              </button>
              <button onClick={() => window.location.href = '/order?source=cart'} className="flex-1 bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md py-3 rounded-lg transition-colors flex justify-center items-center">
                주문 하기
              </button>
            </div>
          </div>

          {/* EXPANDED STATE (Mobile Expanded & Medium screen) */}
          <div className={`flex-col gap-sm ${summaryExpanded ? 'flex' : 'hidden md:flex'}`}>
            <div className="flex justify-center md:hidden mb-xs -mt-2">
              <button onClick={toggleSummary} className="p-1 text-on-surface-variant hover:text-primary transition-colors bg-surface rounded-full border border-outline-variant shadow-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
              </button>
            </div>

            <div className="flex justify-between items-center mb-xs">
              <span className="font-label-md text-label-md text-on-surface-variant">총 상품금액</span>
              <span className="font-body-md text-body-md text-on-surface">{totalPrice.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between items-center border-b border-outline-variant pb-sm mb-sm md:border-none md:pb-0 md:mb-0">
              <span className="font-label-md text-label-md text-on-surface-variant">배송비</span>
              <span className="font-body-md text-body-md text-on-surface">+ 0원</span>
            </div>
            <div className="flex justify-between items-end mb-md">
              <span className="font-headline-md text-headline-md font-bold text-on-surface">결제예정금액</span>
              <span className="font-headline-lg text-headline-lg font-bold text-primary">{totalPrice.toLocaleString()}원</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-sm">
              <button onClick={() => window.location.href = '/'} className="w-full sm:flex-1 bg-surface-container hover:bg-surface-container-low border border-outline-variant text-on-surface font-label-md text-label-md py-3 sm:py-4 rounded-lg transition-colors order-2 sm:order-1">
                쇼핑 계속
              </button>
              <button onClick={() => window.location.href = '/order?source=cart'} className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md py-4 rounded-lg transition-colors flex justify-center items-center gap-sm order-1 sm:order-2">
                주문 하기
              </button>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
