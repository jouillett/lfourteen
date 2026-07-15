"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setMounted(true);

    const checkLoginStatus = () => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      setIsLoggedIn(loggedIn);
      return loggedIn;
    };

    const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour

    const resetTimer = () => {
      if (localStorage.getItem("isLoggedIn") === "true") {
        localStorage.setItem("lastActivity", Date.now().toString());
      }
    };

    const handleLogoutTimeout = () => {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("customerId");
      localStorage.removeItem("userId");
      localStorage.removeItem("lastActivity");
      localStorage.removeItem("authPhone");
      window.location.href = "/";
    };

    const checkInactivity = () => {
      if (localStorage.getItem("isLoggedIn") === "true") {
        const last = localStorage.getItem("lastActivity");
        if (last && Date.now() - parseInt(last) > INACTIVITY_LIMIT) {
          handleLogoutTimeout();
        }
      }
    };

    // Initialize state
    checkLoginStatus();

    // Attach event listeners for activity
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("scroll", resetTimer);

    // Check inactivity periodically
    const interval = setInterval(checkInactivity, 60000); // Check every 1 minute

    const fetchCartCount = async () => {
      if (localStorage.getItem("isLoggedIn") === "true") {
        const userId = localStorage.getItem("customerId") || localStorage.getItem("userId");
        if (userId) {
          try {
            const res = await fetch(`/api/cart/count?userId=${userId}`);
            const data = await res.json();
            if (data.success) {
              setCartCount(data.count);
            }
          } catch (e) {
            console.error("Failed to fetch cart count", e);
          }
        }
      }
    };

    fetchCartCount();

    window.addEventListener("cartUpdated", fetchCartCount);

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("scroll", resetTimer);
      window.removeEventListener("cartUpdated", fetchCartCount);
      clearInterval(interval);
    };
  }, []);

  const handleLogoutClick = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("customerId");
    localStorage.removeItem("userId");
    localStorage.removeItem("lastActivity");
    localStorage.removeItem("authPhone");
    window.location.href = "/";
  };

  return (
    <header className="bg-surface shadow-sm sticky top-0 z-50">
      <div className="flex justify-between items-center w-[90%] mx-auto py-md h-20">
        <Link href="/" className="flex items-center gap-md hover:opacity-90 transition-opacity">
          <img
            src="/images/logo-w.png"
            className="h-8 w-auto"
            alt="L14 Cordy Logo"
          />
          <span className="text-headline-md font-headline-md font-bold text-primary">
            L14 Cordy
          </span>
        </Link>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => {
              if (mounted && !isLoggedIn) {
                alert("로그인이 필요합니다.");
                window.location.href = "/login?redirect=/cart";
              } else {
                window.location.href = "/cart";
              }
            }}
            className="relative text-on-surface-variant hover:text-primary transition-all duration-200 p-1.5 rounded-full hover:bg-surface-container inline-flex"
            id="header-cart-btn"
          >
            <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
            <span
              className="absolute top-0 right-0 bg-error text-on-error text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full"
              id="cart"
              style={{ display: mounted && isLoggedIn && cartCount > 0 ? "flex" : "none" }}
            >
              {cartCount}
            </span>
          </button>
          <button
            onClick={() => {
              if (mounted && !isLoggedIn) {
                alert("로그인이 필요합니다.");
                window.location.href = "/login?redirect=/mypage";
              } else {
                window.location.href = "/mypage";
              }
            }}
            className="text-on-surface-variant hover:text-primary transition-all duration-200 p-1.5 rounded-full hover:bg-surface-container inline-flex"
            id="header-order-btn"
          >
            <span className="material-symbols-outlined text-[22px]">local_shipping</span>
          </button>
          
          {/* Prevent hydration mismatch by rendering nothing until mounted */}
          {mounted && (
            <>
              {!isLoggedIn ? (
                <Link
                  href="/login"
                  className="text-on-surface-variant hover:text-primary transition-all duration-200 p-1.5 rounded-full hover:bg-surface-container inline-flex"
                  id="header-profile-btn"
                  title="로그인"
                >
                  <span className="material-symbols-outlined text-[22px]">person</span>
                </Link>
              ) : (
                <button
                  onClick={handleLogoutClick}
                  className="text-on-surface-variant hover:text-primary transition-all duration-200 p-1.5 rounded-full hover:bg-surface-container inline-flex"
                  id="header-logout-btn"
                  title="로그아웃"
                >
                  <span className="material-symbols-outlined text-[22px]">logout</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
