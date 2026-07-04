"use client";

import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import PhoneInput from "@/components/PhoneInput";

export default function PasswordAuthPage() {
  const [phone, setPhone] = useState("");
  const [authSent, setAuthSent] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('phone');
    if (p) {
      setPhone(p);
    }
  }, []);

  const isPhoneValid = phone.length === 13; // 010-XXXX-XXXX
  const isCodeValid = authCode.length === 6;

  const handleSendAuth = async () => {
    if (phone.trim().length > 0) {
      const generatedCode = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
      setExpectedCode(generatedCode);
      const message = `[기쁜 하루] 문자 인증 안내\n기쁜 하루 쇼핑몰 인증번호는 [${generatedCode}] 예요.`;

      try {
        const response = await fetch("/api/send-auth-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiver: phone.replace(/\D/g, ""),
            code: generatedCode,
            message: message,
          }),
        });
        const data = await response.json();
        if (data.success) {
          alert("인증번호가 전송되었습니다.");
        } else {
          alert("인증번호 발송 실패: " + data.message);
        }
      } catch (err) {
        console.error("Failed to send SMS:", err);
        alert("인증번호 전송 중 오류가 발생했습니다.");
      }

      setAuthSent(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authCode !== expectedCode && authCode.length === 6) {
      setErrorMsg("잘못된 인증번호입니다.");
    } else if (authCode === expectedCode) {
      setErrorMsg("");
      const cleanPhone = phone.replace(/\D/g, "");
      window.location.href = `/password?phone=${cleanPhone}&mode=reset`;
    }
  };

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen antialiased selection:bg-primary-container selection:text-on-primary-container">
      <Header />

      <main className="flex-grow flex items-start md:items-center justify-center px-md pb-xl pt-xl md:pt-lg">
        <section className="w-full max-w-[440px] bg-transparent md:bg-surface-container-low md:rounded-xl p-0 md:p-lg shadow-none md:shadow-[0_10px_40px_-10px_rgba(74,69,62,0.08)]">
          {/* Heading Section */}
          <div className="mb-xl">
            <h2 className="font-headline-md text-headline-md text-on-surface leading-tight">본인 확인을 위해 휴대폰 번호 인증을 진행할게요</h2>
          </div>

          {/* Form Section */}
          <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-sm">
              <label className="font-label-md text-label-md text-on-surface-variant ml-xs">휴대폰 번호</label>
              <div className="flex gap-base">
                <div className="relative flex-grow">
                  <PhoneInput
                    className="w-full bg-[#FDF8F4] border-[#655D49] border rounded-lg py-md px-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary transition-all placeholder:text-outline"
                    placeholder="010-1234-5678"
                    value={phone}
                    onChange={(val) => { setPhone(val); setAuthSent(false); }}
                  />
                </div>
                <button
                  type="button"
                  disabled={phone.trim().length === 0}
                  onClick={handleSendAuth}
                  className="whitespace-nowrap bg-secondary-container text-on-secondary-container font-label-md text-label-md px-md rounded-lg hover:bg-outline-variant transition-colors active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  인증하기
                </button>
              </div>
            </div>

            {/* Hidden Auth Code Input */}
            {authSent && (
              <div className="flex flex-col gap-sm mt-md" id="auth-code-wrapper">
                <label className="font-label-md text-label-md text-on-surface-variant ml-xs">인증번호</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="인증번호 6자리 입력"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={authCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setAuthCode(val);
                    setErrorMsg("");
                  }}
                  className="w-full bg-[#FDF8F4] border-[#655D49] border rounded-lg py-md px-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary transition-all placeholder:text-outline"
                />
                {errorMsg && (
                  <p className="text-[#ba1a1a] font-caption text-caption mt-xs">{errorMsg}</p>
                )}
              </div>
            )}

            {/* Spacer */}
            <div className="h-sm"></div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={!authSent || !isCodeValid}
              className="w-full bg-primary-container text-on-primary-container font-headline-md text-[18px] font-bold py-md rounded-lg shadow-sm hover:opacity-90 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </form>

          {/* Decorative Visual (Contextual) */}
          <div className="mt-xl pt-lg border-t border-outline-variant/30 flex justify-center">
            <div className="flex flex-col items-center gap-base">
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">sms</span>
              </div>
              <p className="font-caption text-caption text-on-surface-variant text-center px-xl">
                보안을 위해 인증 코드를 입력해야 합니다. 인증 문자는 최대 3분 이내에 발송됩니다.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
