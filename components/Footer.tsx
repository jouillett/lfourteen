export default function Footer() {
  return (
    <footer className="bg-surface-container-highest mt-xl w-full">
      <div className="w-[90%] mx-auto py-8 flex flex-col md:flex-row items-start justify-between border-t border-outline-variant gap-md">
        <div className="flex flex-col gap-xs font-caption text-caption text-on-surface-variant text-left">
          <span>상호 기쁜하루 <span className="mx-1 opacity-50">|</span> 대표 조민균</span>
          <span>문의전화 031-755-1568 <span className="mx-1 opacity-50">|</span> 주소 경기도 성남시 분당구 궁내로22번길 16</span>
          <span>사업자등록번호 691-23-02249</span>
          <span>통신판매업신고 신청중</span>
        </div>
        <div className="font-body-md text-body-md text-on-surface-variant self-start">© 2026 L14 Cordy. All rights reserved.</div>
      </div>
    </footer>
  );
}
