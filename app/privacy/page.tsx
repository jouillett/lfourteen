import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 - L14 엘포틴 코디",
  description: "L14 엘포틴 코디(기쁜하루)의 개인정보처리방침 안내입니다.",
};

export default function PrivacyPage() {
  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col antialiased">
      <Header />

      <main className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-8 py-10 md:py-16">
        <div className="bg-surface-container-lowest p-6 sm:p-10 rounded-2xl border border-surface-variant shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mb-2">개인정보처리방침</h1>
          <p className="text-sm text-on-surface-variant mb-8">
            기쁜하루(이하 &apos;회사&apos; 또는 &apos;엘포틴 코디&apos;)는 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하며, 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.
          </p>

          <div className="space-y-8 text-sm text-on-surface leading-relaxed">
            {/* 제1조 */}
            <section>
              <h2 className="text-base sm:text-lg font-bold text-primary mb-3">제1조 (개인정보의 처리 목적)</h2>
              <p className="mb-2">회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 관련 법률에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
              <ul className="list-disc pl-5 space-y-1 text-on-surface-variant">
                <li><strong>회원 가입 및 관리:</strong> 회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 부정이용 방지, 각종 고지·통지</li>
                <li><strong>재화 또는 서비스 제공:</strong> 물품(엘포틴 코디 상품 등) 배송, 주문 내역 확인, 정기배송(구독) 서비스 제공, 요금 결제 및 정산, 서비스 제공에 따른 포인트 적립 및 정산</li>
                <li><strong>고충 처리:</strong> 이용자의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보</li>
              </ul>
            </section>

            {/* 제2조 */}
            <section>
              <h2 className="text-base sm:text-lg font-bold text-primary mb-3">제2조 (처리하는 개인정보의 항목)</h2>
              <p className="mb-2">회사는 회원가입, 원활한 고객상담, 서비스 제공을 위해 다음과 같은 개인정보 항목을 처리하고 있습니다.</p>
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-2">
                <p><strong>1. 회원가입 및 주문 시 수집 항목</strong></p>
                <ul className="list-disc pl-5 space-y-1 text-on-surface-variant">
                  <li><strong>일반 회원가입:</strong> 휴대전화번호, 비밀번호(암호화 보관), 이름</li>
                  <li><strong>카카오/네이버 간편가입:</strong> 고유 식별자(ID), 이름(닉네임), 휴대전화번호, 이메일</li>
                  <li><strong>상품 주문 및 배송 시:</strong> 주문자 및 수령인 정보(이름, 휴대전화번호, 배송지 주소), 결제 정보(신용카드 정보, 계좌번호 등)</li>
                </ul>
                <p className="pt-2"><strong>2. 서비스 이용 과정에서 자동으로 생성·수집되는 항목</strong></p>
                <ul className="list-disc pl-5 space-y-1 text-on-surface-variant">
                  <li>IP 주소, 쿠키, 방문 일시, 서비스 이용 기록, 불량 이용 기록</li>
                </ul>
              </div>
            </section>

            {/* 제3조 */}
            <section>
              <h2 className="text-base sm:text-lg font-bold text-primary mb-3">제3조 (개인정보의 처리 및 보유 기간)</h2>
              <p className="mb-2">
                회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-on-surface-variant">
                <li><strong>회원 정보:</strong> 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 수사·조사 종료 시까지)</li>
                <li><strong>전자상거래 등에서의 소비자보호에 관한 법률에 따른 보존:</strong>
                  <ul className="list-circle pl-5 mt-1 space-y-0.5">
                    <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
                    <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
                    <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
                    <li>표시·광고에 관한 기록: 6개월</li>
                  </ul>
                </li>
              </ul>
            </section>

            {/* 제4조 */}
            <section>
              <h2 className="text-base sm:text-lg font-bold text-primary mb-3">제4조 (개인정보의 제3자 제공 및 처리위탁)</h2>
              <p className="mb-2">회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 외부 전문업체에 위탁하고 있습니다.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-outline-variant text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-surface-container-high">
                      <th className="border border-outline-variant p-2.5">수탁업체</th>
                      <th className="border border-outline-variant p-2.5">위탁 업무 내용</th>
                      <th className="border border-outline-variant p-2.5">보유 및 이용기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-outline-variant p-2.5">CJ대한통운 / 롯데택배 등 제휴 택배사</td>
                      <td className="border border-outline-variant p-2.5">상품 배송 및 배송 위치 추적</td>
                      <td className="border border-outline-variant p-2.5">배송 완료 및 관계법령 보존기간까지</td>
                    </tr>
                    <tr>
                      <td className="border border-outline-variant p-2.5">토스페이먼츠(주)</td>
                      <td className="border border-outline-variant p-2.5">전자결제 및 에스크로 결제 대행</td>
                      <td className="border border-outline-variant p-2.5">거래완료 및 관계법령 보존기간까지</td>
                    </tr>
                    <tr>
                      <td className="border border-outline-variant p-2.5">네이버클라우드(주)</td>
                      <td className="border border-outline-variant p-2.5">문자메시지(SMS/알림톡) 발송 대행</td>
                      <td className="border border-outline-variant p-2.5">발송 완료 후 법정 보존기간까지</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 제5조 */}
            <section>
              <h2 className="text-base sm:text-lg font-bold text-primary mb-3">제5조 (정보주체의 권리·의무 및 행사방법)</h2>
              <p className="mb-2">
                정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다. 권리 행사는 마이페이지 내 회원정보 수정 메뉴를 통하거나 고객센터(010-2115-2249) 또는 서면, 전자우편을 통해 가능하며, 회사는 이에 대해 지체 없이 조치하겠습니다.
              </p>
            </section>

            {/* 제6조 */}
            <section>
              <h2 className="text-base sm:text-lg font-bold text-primary mb-3">제6조 (개인정보의 파기절차 및 방법)</h2>
              <p className="mb-2">
                회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다. 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 파기하며, 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.
              </p>
            </section>

            {/* 제7조 */}
            <section>
              <h2 className="text-base sm:text-lg font-bold text-primary mb-3">제7조 (개인정보 보호책임자 및 연락처)</h2>
              <p className="mb-3">
                회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
              </p>
              <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/30 space-y-1">
                <p><strong>[개인정보 보호책임자]</strong></p>
                <p>성명: 조민균 (대표)</p>
                <p>상호: 기쁜하루</p>
                <p>연락처: 010-2115-2249</p>
                <p>이메일: beluga.in.the.forest@gmail.com</p>
                <p>주소: 경기도 성남시 분당구 궁내로22번길 16 (궁내동, 장미월드빌) 302호</p>
              </div>
            </section>

            {/* 제8조 */}
            <section>
              <h2 className="text-base sm:text-lg font-bold text-primary mb-3">제8조 (개인정보 처리방침의 변경)</h2>
              <p>이 개인정보처리방침은 2026년 1월 1일부터 적용됩니다.</p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
