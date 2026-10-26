export const TOSS_CARD_COMPANIES: Record<string, string> = {
  // 숫자 및 2자리 응답 코드 (Toss Payments REST API issuerCode / acquirerCode)
  "11": "국민카드",
  "15": "카카오뱅크",
  "21": "하나카드",
  "24": "토스뱅크",
  "30": "KDB산업은행",
  "31": "BC카드",
  "33": "우리카드",
  "W1": "우리카드",
  "34": "수협은행",
  "35": "전북은행",
  "36": "씨티카드",
  "37": "우체국",
  "38": "새마을금고",
  "39": "저축은행",
  "3A": "케이뱅크",
  "41": "신한카드",
  "42": "제주은행",
  "46": "광주은행",
  "51": "삼성카드",
  "61": "현대카드",
  "62": "신협",
  "71": "롯데카드",
  "91": "NH농협카드",
  "3K": "기업비씨",
  "7A": "아메리칸 익스프레스",
  "4J": "JCB",
  "4M": "마스터카드",
  "4V": "비자카드",
  "3C": "유니온페이",
  "6D": "다이너스 클럽",

  // 영문 코드 (Toss PaymentWidget SDK getSelectedPaymentInfo() / paymentMethodSelect card.cardCompany)
  "KOOKMIN": "국민카드",
  "KAKAOBANK": "카카오뱅크",
  "HANA": "하나카드",
  "TOSSBANK": "토스뱅크",
  "KDBBANK": "KDB산업은행",
  "BC": "BC카드",
  "WOORI": "우리카드",
  "SUHYEOP": "수협은행",
  "JEONBUKBANK": "전북은행",
  "CITI": "씨티카드",
  "POST": "우체국",
  "SAEMAUL": "새마을금고",
  "SAVINGBANK": "저축은행",
  "KBANK": "케이뱅크",
  "SHINHAN": "신한카드",
  "JEJUBANK": "제주은행",
  "GWANGJUBANK": "광주은행",
  "SAMSUNG": "삼성카드",
  "HYUNDAI": "현대카드",
  "SHINHYEOP": "신협",
  "LOTTE": "롯데카드",
  "NONGHYEOP": "NH농협카드",
  "IBK_BC": "기업비씨",
  "AMEX": "아메리칸 익스프레스",
  "MASTER": "마스터카드",
  "VISA": "비자카드",
  "UNIONPAY": "유니온페이",
  "DINERS": "다이너스 클럽",

  // 한글 코드
  "국민": "국민카드",
  "하나": "하나카드",
  "우리": "우리카드",
  "신한": "신한카드",
  "삼성": "삼성카드",
  "현대": "현대카드",
  "롯데": "롯데카드",
  "농협": "NH농협카드",
  "씨티": "씨티카드"
};

export function getCardCompanyName(codeOrName?: string | null): string {
  if (!codeOrName) return "";
  const clean = String(codeOrName).trim();
  if (TOSS_CARD_COMPANIES[clean]) {
    return TOSS_CARD_COMPANIES[clean];
  }
  const upper = clean.toUpperCase();
  if (TOSS_CARD_COMPANIES[upper]) {
    return TOSS_CARD_COMPANIES[upper];
  }
  if (clean.endsWith("카드") || clean.endsWith("은행") || clean.endsWith("페이")) {
    return clean;
  }
  return clean;
}

export function formatCardPaymentMethod(codeOrName?: string | null): string {
  const company = getCardCompanyName(codeOrName);
  if (!company) return "카드";
  if (company.startsWith("카드")) return company;
  return `카드 (${company})`;
}
