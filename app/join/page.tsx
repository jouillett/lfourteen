"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import PhoneInput from "@/components/PhoneInput";

export default function JoinPage() {
  const [phone, setPhone] = useState("");
  const [authSent, setAuthSent] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const isPhoneValid = phone.length === 13; // 010-XXXX-XXXX
  const isCodeValid = authCode.length === 6;

  const handleSendAuth = async () => {
    if (isPhoneValid) {
      const cleanPhone = phone.replace(/\D/g, "");

      try {
        const checkRes = await fetch("/api/check-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile: cleanPhone }),
        });
        const checkData = await checkRes.json();

        if (checkData.exists) {
          const userWantsToReset = confirm("이미 가입하신 휴대폰 번호입니다. 비밀번호를 새로 설정할까요?");
          if (userWantsToReset) {
            window.location.href = `/password_auth?phone=${cleanPhone}`;
          }
          return;
        }
      } catch (err) {
        console.error("Failed to check user:", err);
      }

      const generatedCode = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
      setExpectedCode(generatedCode);
      const message = `[기쁜 하루] 문자 인증 안내\n기쁜 하루 쇼핑몰 회원 가입을 위한 인증번호는 [${generatedCode}] 입니다.`;

      try {
        await fetch("/api/send-auth-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiver: cleanPhone,
            code: generatedCode,
            message: message,
          }),
        });
      } catch (err) {
        console.error("Failed to send SMS:", err);
      }

      setAuthSent(true);
      alert("인증번호가 전송되었습니다.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authCode !== expectedCode && authCode.length === 6) {
      setErrorMsg("잘못된 인증번호입니다.");
    } else if (authCode === expectedCode) {
      setErrorMsg("");
      const cleanPhone = phone.replace(/\D/g, "");
      window.location.href = `/password?phone=${cleanPhone}`;
    }
  };

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen antialiased selection:bg-primary-container selection:text-on-primary-container">
      <Header />

      <main className="flex-grow flex items-center justify-center px-md pb-xl pt-lg">
        <section className="w-full max-w-[440px] bg-surface-container-low rounded-xl p-lg shadow-[0_10px_40px_-10px_rgba(74,69,62,0.08)]">
          {/* Heading Section */}
          <div className="mb-xl">
            <h2 className="font-headline-md text-headline-md text-on-surface leading-tight">회원가입을 위해 휴대폰 번호 인증을 진행할게요</h2>
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
                  disabled={!isPhoneValid}
                  onClick={handleSendAuth}
                  className="whitespace-nowrap bg-secondary-container text-on-secondary-container font-label-md text-label-md px-md rounded-lg hover:bg-outline-variant transition-colors active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  인증하기
                </button>
              </div>
            </div>

            {authSent && (
              <div className="flex flex-col gap-sm mt-md">
                <label className="font-label-md text-label-md text-on-surface-variant ml-xs">인증번호</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="인증번호 6자리 입력"
                  className="w-full bg-[#FDF8F4] border-[#655D49] border rounded-lg py-md px-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary transition-all placeholder:text-outline"
                  value={authCode}
                  onChange={(e) => {
                    setAuthCode(e.target.value.replace(/[^0-9]/g, ""));
                    setErrorMsg("");
                  }}
                />
                {errorMsg && (
                  <p className="text-error font-caption text-caption mt-xs text-[#ba1a1a]">
                    {errorMsg}
                  </p>
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
