import React, { useEffect } from 'react';
import Script from 'next/script';

interface SharePopupProps {
  reviewId: number;
  onClose: () => void;
}

declare global {
  interface Window {
    Kakao: any;
  }
}

export default function SharePopup({ reviewId, onClose }: SharePopupProps) {
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/review?id=${reviewId}` : '';

  const handleKakaoInit = () => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init('8bdac5ec52f469341cfb0a0f7914368b');
    }
  };

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert('URL이 복사되었습니다.');
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          alert('URL이 복사되었습니다.');
        } else {
          throw new Error('Fallback copy failed');
        }
      }
    } catch (err) {
      console.error('Failed to copy link: ', err);
      alert('URL 복사에 실패했습니다.');
    }
  };

  const shareToKakao = () => {
    if (window.Kakao && window.Kakao.isInitialized()) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: '엘포틴 코디',
          description: '#유산균 L14 #편안한 장 #숙면',
          imageUrl: 'https://capofcom.cafe24.com/l14_coordy/images/l14coordy.png',
          link: {
            mobileWebUrl: `http://172.30.1.73:3000/review?id=${reviewId}`,
            webUrl: `http://172.30.1.73:3000/review?id=${reviewId}`,
          },
        },
        buttons: [
          {
            title: '리뷰 보기',
            link: {
              mobileWebUrl: `http://172.30.1.73:3000/review?id=${reviewId}`,
              webUrl: `http://172.30.1.73:3000/review?id=${reviewId}`,
            },
          },
        ],
      });
    } else {
      alert("카카오톡 SDK가 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
  };

  const shareToX = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
  };

  return (
    <>
      <Script 
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js" 
        integrity="sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J" 
        crossOrigin="anonymous"
        onLoad={handleKakaoInit}
      />
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div 
          className="bg-surface w-[320px] rounded-[16px] shadow-lg flex flex-col p-lg relative"
          onClick={e => e.stopPropagation()}
        >
          <button 
            onClick={onClose}
            className="absolute top-md right-md text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined font-light">close</span>
          </button>

          <h2 className="font-headline-sm text-headline-sm text-on-surface text-center mb-lg font-bold">공유하기</h2>

          <div className="grid grid-cols-4 gap-y-lg gap-x-sm mb-xl">
            <div className="flex flex-col items-center gap-xs cursor-pointer hover:opacity-80 transition-opacity" onClick={shareToKakao}>
              <div className="w-12 h-12 rounded-full bg-[#FEE500] flex items-center justify-center text-[#000000]">
                <span className="material-symbols-outlined text-[24px]">chat_bubble</span>
              </div>
              <span className="font-caption text-caption text-on-surface-variant">카카오톡</span>
            </div>

            <div className="flex flex-col items-center gap-xs cursor-pointer hover:opacity-80 transition-opacity" onClick={shareToX}>
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white font-bold text-lg">
                𝕏
              </div>
              <span className="font-caption text-caption text-on-surface-variant">X</span>
            </div>

            <div className="flex flex-col items-center gap-xs cursor-pointer hover:opacity-80 transition-opacity" onClick={shareToFacebook}>
              <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[28px]">facebook</span>
              </div>
              <span className="font-caption text-caption text-on-surface-variant">페이스북</span>
            </div>
          </div>

          <div className="flex w-full items-stretch h-10">
            <input 
              type="text" 
              readOnly 
              value={shareUrl} 
              className="flex-1 min-w-0 bg-surface-container border border-outline-variant border-r-0 rounded-l-lg px-sm font-body-sm text-body-sm text-on-surface outline-none"
            />
            <button 
              onClick={handleCopyUrl}
              className="shrink-0 bg-surface border border-outline-variant rounded-r-lg px-md font-label-md text-label-md text-on-surface hover:bg-surface-container transition-colors"
            >
              URL복사
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
