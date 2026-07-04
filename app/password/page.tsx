"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function PasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8 || pwd.length > 16) return "비밀번호는 8자 이상 16자 이하이어야 합니다.";
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+={}\[\]|\\:;'"<>,.?/-]/.test(pwd);
    if (!hasLetter || !hasNumber || !hasSpecial) {
      return "영문, 숫자, 특수문자가 모두 포함되어야 합니다.";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setErrorMsg("");

    const urlParams = new URLSearchParams(window.location.search);
    const phoneVal = urlParams.get("phone") || "";
    const mode = urlParams.get("mode");

    if (!phoneVal) {
      setErrorMsg("인증된 휴대폰 번호 정보가 없습니다. 다시 인증을 진행해 주세요.");
      return;
    }

    try {
      const endpoint = mode === "reset" ? "/api/reset-password" : "/api/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: phoneVal,
          password: newPassword,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert("비밀번호가 성공적으로 설정되었습니다. 로그인 페이지로 이동합니다.");
        window.location.href = `/login?phone=${encodeURIComponent(phoneVal)}`;
      } else {
        setErrorMsg(data.message || "처리 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Register error:", error);
      setErrorMsg("서버와 통신하는 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen antialiased selection:bg-primary-container selection:text-on-primary-container">
      <Header />

      <main className="flex-grow flex items-center justify-center p-md py-xl">
        {/* Authentication Card */}
        <div className="bg-surface-container-low rounded-xl shadow-[0_10px_25px_-5px_rgba(105,93,70,0.08),0_8px_10px_-6px_rgba(105,93,70,0.04)] p-lg w-full max-w-[440px] flex flex-col gap-xl">
          
          {/* Header Section */}
          <div className="flex flex-col gap-sm text-center pt-sm">
            <h1 className="font-headline-lg text-headline-lg text-on-surface leading-tight">
              로그인에 사용할<br />새 비밀번호를 입력해 주세요
            </h1>
          </div>

          {/* Form Section */}
          <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
            {/* Input Group 1 */}
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="new-password">
                새 비밀번호
              </label>
              <div className="relative flex items-center bg-surface rounded-lg border border-outline-variant focus-within:ring-2 focus-within:ring-[#695d46]/20 focus-within:border-[#695d46] transition-all duration-200">
                <input
                  className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant py-sm pl-sm pr-12 rounded-lg"
                  id="new-password"
                  placeholder="새 비밀번호 입력"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrorMsg("");
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-sm text-outline-variant hover:text-primary transition-colors focus:outline-none flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">
                    {showNewPassword ? "visibility" : "visibility_off"}
                  </span>
                </button>
              </div>
              <p className="font-caption text-caption text-on-surface-variant mt-1">영문, 숫자, 특수문자가 모두 들어간 8-16자</p>
            </div>

            {/* Input Group 2 */}
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="confirm-password">
                새 비밀번호 확인
              </label>
              <div className="relative flex items-center bg-surface rounded-lg border border-outline-variant focus-within:ring-2 focus-within:ring-[#695d46]/20 focus-within:border-[#695d46] transition-all duration-200">
                <input
                  className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant py-sm pl-sm pr-12 rounded-lg"
                  id="confirm-password"
                  placeholder="비밀번호 한 번 더 입력"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMsg("");
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-sm text-outline-variant hover:text-primary transition-colors focus:outline-none flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">
                    {showConfirmPassword ? "visibility" : "visibility_off"}
                  </span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <p className="text-error font-caption text-caption mt-xs mb-0 text-center text-[#ba1a1a]">
                {errorMsg}
              </p>
            )}

            {/* Submit Button */}
            <button
              className="mt-sm w-full bg-primary-container text-on-primary-container font-label-md text-label-md py-sm rounded-lg hover:bg-[#e6dfcd] transition-all duration-200 active:scale-95 flex justify-center items-center shadow-sm"
              type="submit"
            >
              확인
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
