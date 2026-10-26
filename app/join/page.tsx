"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import PhoneInput from "@/components/PhoneInput";
import SocialLoginButtons from "@/components/SocialLoginButtons";

export default function JoinPage() {
  const [phone, setPhone] = useState("");
  const [authSent, setAuthSent] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPhoneJoin, setShowPhoneJoin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const phoneParam = params.get("phone");
      if (phoneParam) {
        // Simple formatter for 01012345678 -> 010-1234-5678
        let formatted = phoneParam.replace(/\D/g, "");
        if (formatted.length === 11) {
          formatted = `${formatted.slice(0, 3)}-${formatted.slice(3, 7)}-${formatted.slice(7)}`;
        } else if (formatted.length === 10) {
          formatted = `${formatted.slice(0, 3)}-${formatted.slice(3, 6)}-${formatted.slice(6)}`;
        }
        setPhone(formatted);
        setShowPhoneJoin(true);
      }
      if (params.get("notice") === "need_phone") {
        setShowPhoneJoin(true);
        alert("원활한 주문 및 배송을 위해 휴대폰 번호 인증을 완료해주세요.");
      }
    }
  }, []);

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
      const message = `[기쁜 하루] 인증번호: [${generatedCode}]\n기쁜 하루 쇼핑몰 회원 가입을 위한 문자 인증 안내입니다.`;

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
        <section className="w-full max-w-[440px] bg-surface-container-lowest rounded-xl p-md sm:p-lg shadow-sm border border-surface-variant flex flex-col gap-5">
          {/* Social 1-Second Login/Join */}
          <SocialLoginButtons
            title="회원가입 / 로그인"
            subtitle={"아이디와 비밀번호 입력하기 귀찮으시죠?\n1초 회원가입으로 입력없이 간편하게 로그인 하세요."}
            showBanner={true}
          />

          {/* Divider to Phone Signup */}
          <div className="relative flex items-center justify-center pt-2">
            <div className="flex-grow border-t border-outline-variant/30"></div>
            <button
              type="button"
              onClick={() => setShowPhoneJoin(!showPhoneJoin)}
              className="mx-3 text-[13px] text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>일반 휴대폰 번호로 가입</span>
              <span className="material-symbols-outlined text-[16px]">
                {showPhoneJoin ? "expand_less" : "expand_more"}
              </span>
            </button>
            <div className="flex-grow border-t border-outline-variant/30"></div>
          </div>

          {/* Collapsible Phone Signup Section */}
          {showPhoneJoin && (
            <div className="flex flex-col gap-4 pt-1">
              <div>
                <h3 className="font-bold text-[15px] text-on-surface leading-tight">휴대폰 번호 인증 가입</h3>
                <p className="text-xs text-on-surface-variant mt-1">인증번호를 받아 회원가입을 완료합니다.</p>
              </div>

              {/* Form Section */}
              <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant">휴대폰 번호</label>
                  <div className="flex flex-col sm:flex-row gap-base">
                    <div className="relative flex-grow">
                      <PhoneInput
                        className="w-full px-sm py-sm rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-body-md text-body-md focus:border-primary focus:ring-2 focus:ring-primary-container focus:outline-none transition-all placeholder:text-on-surface-variant/50"
                        placeholder="010-1234-5678"
                        value={phone}
                        onChange={(val) => { setPhone(val); setAuthSent(false); }}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!isPhoneValid}
                      onClick={handleSendAuth}
                      className="whitespace-nowrap w-full sm:w-auto bg-secondary-container text-on-secondary-container font-label-md text-label-md py-sm px-md rounded-lg hover:bg-outline-variant transition-colors active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      인증하기
                    </button>
                  </div>
                </div>

                {authSent && (
                  <div className="flex flex-col gap-xs mt-xs">
                    <label className="font-label-md text-label-md text-on-surface-variant">인증번호</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="인증번호 6자리 입력"
                      className="w-full px-sm py-sm rounded-lg border border-outline-variant bg-surface-container-low text-on-surface font-body-md text-body-md focus:border-primary focus:ring-2 focus:ring-primary-container focus:outline-none transition-all placeholder:text-on-surface-variant/50"
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

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={!authSent || !isCodeValid}
                  className="w-full bg-primary text-on-primary font-label-md text-label-md py-sm rounded-lg shadow-sm hover:opacity-90 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-bold"
                >
                  다음
                </button>
              </form>
            </div>
          )}

          {/* Link back to login */}
          <div className="text-center pt-3 border-t border-outline-variant/20">
            <p className="text-[13px] text-on-surface-variant">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="font-bold text-primary hover:underline ml-1">
                로그인하기
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
