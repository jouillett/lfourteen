"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isSessionExpired, clearUserSession, recordSessionActivity } from "../lib/session";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [logoHref, setLogoHref] = useState("/");
  const [loginHref, setLoginHref] = useState("/login");

  useEffect(() => {
    setMounted(true);

    if (
      typeof window !== "undefined" &&
      (window.location.pathname.includes("bandwalk") ||
        window.location.pathname.includes("올바른걷기") ||
        (typeof document !== "undefined" && document.cookie.includes("bandwalk_entry=1")))
    ) {
      setLoginHref(`/login?redirect=${encodeURIComponent("/올바른걷기")}`);
    } else {
      setLoginHref("/login");
    }

    const checkLoginStatus = () => {
      // First check if inactivity limit has passed
      if (isSessionExpired()) {
        clearUserSession();
      }

      const hasSessionCookie = document.cookie.includes("session_active=1");
      let loggedInFlag = localStorage.getItem("isLoggedIn") === "true";
      
      // If localStorage says we're logged in, but the session cookie is gone (browser was restarted)
      if (loggedInFlag && !hasSessionCookie) {
        clearUserSession();
        loggedInFlag = false;
      }
      
      // Keep session cookie alive if somehow logged in
      if (loggedInFlag && !hasSessionCookie) {
         document.cookie = "session_active=1; path=/";
      }

      const hasId = !!(localStorage.getItem("customerId") || localStorage.getItem("userId"));
      const trulyLoggedIn = loggedInFlag && hasId;
      
      if (loggedInFlag && !hasId) {
        clearUserSession();
      }
      
      setIsLoggedIn(trulyLoggedIn);
      
      const grade = localStorage.getItem("customerGrade");
      if (trulyLoggedIn && grade === "8") {
        setLogoHref("/confidential");
      } else if (trulyLoggedIn && grade === "7") {
        setLogoHref("/올바른걷기");
      } else {
        setLogoHref("/");
      }
      
      return trulyLoggedIn;
    };

    let isLoggingOut = false;

    const handleLogoutTimeout = () => {
      if (isLoggingOut) return;
      isLoggingOut = true;

      clearUserSession();
      setIsLoggedIn(false);

      alert("1시간 동안 활동이 없어 안전을 위해 자동 로그아웃되었습니다.");

      const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
      if (
        currentPath.includes("manage") ||
        currentPath.includes("confidential") ||
        currentPath.includes("mypage") ||
        currentPath.includes("cart") ||
        currentPath.includes("billing")
      ) {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      } else {
        window.location.href = "/";
      }
    };

    let lastThrottleTime = 0;
    const handleUserActivity = () => {
      if (localStorage.getItem("isLoggedIn") === "true") {
        if (isSessionExpired()) {
          handleLogoutTimeout();
          return;
        }
        const now = Date.now();
        if (now - lastThrottleTime > 5000) {
          lastThrottleTime = now;
          recordSessionActivity();
        }
      }
    };

    const checkInactivity = () => {
      if (localStorage.getItem("isLoggedIn") === "true") {
        if (isSessionExpired()) {
          handleLogoutTimeout();
        }
      }
    };

    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        checkInactivity();
      }
    };

    // Initialize state
    checkLoginStatus();

    // Attach event listeners for activity
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("click", handleUserActivity);
    window.addEventListener("scroll", handleUserActivity);
    window.addEventListener("touchstart", handleUserActivity);
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    // Check inactivity periodically every 30 seconds
    const interval = setInterval(checkInactivity, 30000);

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
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);
      window.removeEventListener("touchstart", handleUserActivity);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("cartUpdated", fetchCartCount);
      clearInterval(interval);
    };
  }, []);

  const handleLogoutClick = () => {
    clearUserSession();
    window.location.href = "/";
  };

  return (
    <header className="bg-surface shadow-sm sticky top-0 z-50">
      <div className="flex justify-between items-center w-[90%] mx-auto py-md h-20">
        <Link href={logoHref} className="flex items-center gap-md hover:opacity-90 transition-opacity">
          <img
            src="/images/logo.png"
            className="h-6 w-auto"
            alt="L14 Cordy Logo"
          />

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
                  href={loginHref}
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
