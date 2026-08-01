"use client";

import React, { useState } from "react";

export default function PasswordGuard({ children, correctPassword }: { children: React.ReactNode, correctPassword: string }) {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (authenticated) {
    return <>{children}</>;
  }

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (password === correctPassword) {
      setAuthenticated(true);
    } else {
      alert("비밀번호가 일치하지 않습니다.");
      setPassword("");
    }
  };

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
