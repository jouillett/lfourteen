"use client";

import React from "react";

interface SocialLoginButtonsProps {
  title?: string;
  subtitle?: string;
  showBanner?: boolean;
  className?: string;
}

export default function SocialLoginButtons({
  title = "간편 로그인 / 회원가입",
  subtitle = "아이디와 비밀번호 입력하기 귀찮으시죠?\n1초 회원가입으로 입력없이 간편하게 로그인 하세요.",
  showBanner = true,
  className = "",
}: SocialLoginButtonsProps) {
  const kakaoClientId = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY || "576d20bc8a37554e4badd9e698428e2f";
  const naverClientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || "NsHvqbGAlupjtc2yek0j";

  const getRedirectUri = () => {
    if (typeof window !== "undefined") {
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return `${window.location.origin}/oauth`;
      }
    }
    return "https://lfourteen.life/oauth";
  };

  const handleKakaoLogin = () => {
    const redirectUri = getRedirectUri();
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoClientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&state=kakao&scope=account_email,phone_number,name`;
    window.location.href = kakaoAuthUrl;
  };

  const handleNaverLogin = () => {
    const redirectUri = getRedirectUri();
    const state = "naver_" + Math.random().toString(36).substring(2, 10);
    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${naverClientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${encodeURIComponent(state)}`;
    window.location.href = naverAuthUrl;
  };

  return (
    <div className={`w-full flex flex-col ${className}`}>
      {title && (
        <h2 className="text-[22px] font-bold text-on-surface mb-1 text-left">{title}</h2>
      )}
      {subtitle && (
        <p className="text-[13px] sm:text-[14px] text-on-surface-variant mb-5 whitespace-pre-line text-left leading-relaxed">
          {subtitle}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full">
        {/* Kakao 1-Second Button */}
        <button
          type="button"
          onClick={handleKakaoLogin}
          className="w-full h-[52px] flex items-center justify-center gap-3 px-4 rounded-xl font-bold text-[15px] bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] transition-all duration-150 shadow-sm active:scale-[0.99] cursor-pointer"
        >
          {/* Kakao Speech Bubble Icon */}
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.477 3 2 6.477 2 10.771c0 2.766 1.838 5.19 4.606 6.55-.203.757-.74 2.756-.848 3.19-.133.535.195.528.411.385.17-.113 2.684-1.834 3.766-2.58.68.098 1.38.15 2.065.15 5.523 0 10-3.477 10-7.771C22 6.477 17.523 3 12 3z" />
          </svg>
          <span>카카오 1초 로그인/회원가입</span>
        </button>

        {/* Naver 1-Second Button */}
        <button
          type="button"
          onClick={handleNaverLogin}
          className="w-full h-[52px] flex items-center justify-center gap-3 px-4 rounded-xl font-bold text-[15px] bg-[#03C75A] hover:bg-[#02B350] text-white transition-all duration-150 shadow-sm active:scale-[0.99] cursor-pointer"
        >
          {/* Naver 'N' Icon */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.273 12.845 7.372 0H0v24h7.727V11.155L16.628 24H24V0h-7.727v12.845z" />
          </svg>
          <span>네이버 1초 로그인/회원가입</span>
        </button>
      </div>

      {/* Promotional Benefit Banner */}
      {showBanner && (
        <div className="mt-4 p-4 rounded-xl bg-[#F7EFE5] border border-[#E9DFCE] flex items-center justify-between gap-3 text-left">
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-[#4A3B2C] leading-snug">
              1초 간편가입 회원 전용 혜택!
            </span>
            <span className="text-[12px] text-[#7A6956] mt-0.5">
              가입 즉시 현금처럼 쓰는 <strong className="text-[#B36B00]">1,000P</strong> 적립금 지급
            </span>
          </div>
          <div className="shrink-0 w-10 h-10 rounded-full bg-[#E5D7C3] flex items-center justify-center text-[#B36B00]">
            <span className="material-symbols-outlined text-[22px]">redeem</span>
          </div>
        </div>
      )}
    </div>
  );
}
