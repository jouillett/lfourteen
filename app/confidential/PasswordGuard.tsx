"use client";

import React, { useState, useEffect } from "react";

export default function PasswordGuard({ children, correctPassword }: { children: React.ReactNode, correctPassword: string }) {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [deniedMessage, setDeniedMessage] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      const customerId = localStorage.getItem("customerId");
      
      if (!loggedIn || !customerId) {
        window.location.href = "/login?redirect=/confidential";
        return;
      }
      
      if (sessionStorage.getItem("confidentialAuth") === "true") {
        setAuthenticated(true);
      }
      
      try {
        const res = await fetch(`/api/profile?customerId=${customerId}`);
        const data = await res.json();
        if (data.success) {
          const user = data.data;
          if (String(user.grade) !== "8") {
            setDeniedMessage(`${user.name || "고객"}님 죄송합니다.\n입장하실 수 없습니다.`);
          }
        } else {
           window.location.href = "/login?redirect=/confidential";
           return;
        }
      } catch (e) {
        console.error(e);
        // Fallback to error message
        setDeniedMessage("사용자 정보를 불러올 수 없습니다.");
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  if (authenticated) {
    return <>{children}</>;
  }

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (password === correctPassword) {
      sessionStorage.setItem("confidentialAuth", "true");
      setAuthenticated(true);
    } else {
      alert("비밀번호가 일치하지 않습니다.");
      setPassword("");
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface w-full">
        <div className="text-on-surface-variant animate-pulse">로딩 중...</div>
      </div>
    );
  }

  if (deniedMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface w-full">
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant w-[90%] max-w-[400px] text-center">
          <span className="material-symbols-outlined text-[48px] text-error mb-4 block">lock</span>
          <h2 className="text-xl font-bold mb-4 text-on-surface whitespace-pre-wrap break-keep">{deniedMessage}</h2>
          <button 
            onClick={() => window.location.href = "/"}
            className="mt-4 px-6 py-2 bg-surface-container-high hover:bg-surface-container-highest rounded-lg transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface w-full">
      <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant w-[90%] max-w-[400px]">
        <h2 className="text-2xl font-bold mb-6 text-on-surface text-center whitespace-nowrap">보안 페이지</h2>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="relative flex items-center">
            <input 
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 pr-12 border border-outline-variant rounded-xl bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-outline-variant hover:text-primary transition-colors focus:outline-none flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility" : "visibility_off"}
              </span>
            </button>
          </div>
          <button 
            type="submit"
            className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
          >
            입장하기
          </button>
        </form>
      </div>
    </div>
  );
}
