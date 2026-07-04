"use client";

import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { openDaumPostcode } from "../../../lib/daumPostcode";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const profileSchema = z.object({
        password: z.string().min(10, "비밀번호는 최소 10자 이상이어야 합니다"),
        passwordConfirm: z.string().min(1, "비밀번호 확인을 입력해주세요."),
        name: z.string().min(1, "이름을 입력해주세요."),
  zipcode: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  mobile1: z.string().min(1),
  mobile2: z.string().min(1),
  mobile3: z.string().min(1),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  phone3: z.string().optional(),
        email: z.string().email("올바른 이메일 형식이 아닙니다.").optional().or(z.literal('')),
}).refine((data) => data.password === data.passwordConfirm, {
        message: "비밀번호가 일치하지 않습니다.",
  path: ["passwordConfirm"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: {
      mobile1: '010',
      phone1: '02'
    }
  });

  useEffect(() => {
    const id = localStorage.getItem("customerId") || localStorage.getItem("userId");
    if (!id) {
        alert("로그인이 필요합니다.");
      router.push("/login?redirect=/mypage/profile");
      return;
    }
    setCustomerId(id);

    fetch(`/api/check-order?customerId=${id}&status=1,2,4&unreviewed=true`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setReviewCount(data.count || 0);
        }
      })
      .catch(console.error);

    fetch(`/api/profile?customerId=${id}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          const d = res.data;
          
          const parsePhoneNum = (str: string) => {
            if (!str) return [];
            const cleaned = ('' + str).replace(/\D/g, '');
            const match = cleaned.match(/^(\d{2,3})(\d{3,4})(\d{4})$/);
            if (match) {
              return [match[1], match[2], match[3]];
            }
            return str.split('-');
          };

          const mobileParts = parsePhoneNum(d.mobile);
          const phoneParts = parsePhoneNum(d.phone);

          reset({
            name: d.name || '',
            zipcode: d.zip_code || '',
            address1: d.address || '',
            address2: d.detail_address || '',
            mobile1: mobileParts[0] || '010',
            mobile2: mobileParts[1] || '',
            mobile3: mobileParts[2] || '',
            phone1: phoneParts[0] || '02',
            phone2: phoneParts[1] || '',
            phone3: phoneParts[2] || '',
            email: d.email || ''
          });
        }
      })
      .catch(err => console.error(err));
  }, [router, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!customerId) return;
    
    try {
      const payload = {
        customerId,
        password: data.password || undefined,
        name: data.name,
        zip_code: data.zipcode,
        address: data.address1,
        detail_address: data.address2,
        mobile: `${data.mobile1}${data.mobile2}${data.mobile3}`,
        phone: (data.phone2 && data.phone3) ? `${data.phone1}${data.phone2}${data.phone3}` : '',
        email: data.email
      };

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      
      if (result.success) {
          alert("회원정보가 수정되었습니다.");
        reset({ ...data, password: '', passwordConfirm: '' }); // Clear passwords after update
      } else {
          alert("수정 실패: " + result.message);
      }
    } catch (err) {
      console.error(err);
          alert("오류가 발생했습니다.");
    }
  };

  const handleAddressSearch = () => {
    openDaumPostcode((z, a) => {
      setValue("zipcode", z);
      setValue("address1", a);
    });
  };

  const handleDelete = async () => {
    if (!customerId) return;
      if (confirm("정말로 탈퇴하시겠습니까? 복구 불가능한 작업입니다.")) {
      try {
        const res = await fetch(`/api/profile?customerId=${customerId}`, {
          method: "DELETE"
        });
        const result = await res.json();
        if (result.success) {
          alert("회원탈퇴가 완료되었습니다.");
          localStorage.removeItem("customerId");
          localStorage.removeItem("userId");
          localStorage.removeItem("isLoggedIn");
          router.push("/");
        } else {
          alert("탈퇴 실패: " + result.message);
        }
      } catch (err) {
        console.error(err);
          alert("오류가 발생했습니다.");
      }
    }
  };

  const handleWriteReview = (e: React.MouseEvent) => {
    e.preventDefault();
    if (reviewCount === null || reviewCount === 0) {
      alert("작성 가능한 후기가 없습니다.");
      return;
    }
    window.open('/review/write', 'writeReviewPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');
  };

  const LabelCol = ({ children, required = false }: { children: React.ReactNode, required?: boolean }) => (
    <div className="w-[110px] md:w-[160px] py-4 px-3 md:px-4 text-[13px] md:text-[14px] text-on-surface flex-shrink-0 bg-[#FAFAFA] md:bg-transparent">
      {children}
      {required && <span className="text-[#D9534F] ml-1">*</span>}
    </div>
  );

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row pt-6 md:pt-16 px-4 md:px-16 pb-24 gap-6 md:gap-12 lg:gap-24" data-purpose="mypage-layout">
        
        {/* Mobile Sidebar Menu (Horizontal Scroll) */}
        <nav aria-label="Mobile My Page Navigation" className="md:hidden w-full overflow-x-auto hide-scrollbar border-b border-outline-variant/30 pb-2 -mx-4 px-4">
          <ul className="flex space-x-6 text-[14px] text-on-surface-variant whitespace-nowrap">
            <li><Link href="/mypage/order" className="hover:text-on-surface transition-colors pb-2">주문/배송 내역</Link></li>
            <li><Link className="hover:text-on-surface transition-colors pb-2" href="/mypage/cancel">취소/교환/반품</Link></li>
            <li><Link href="/mypage/inquiry" className="hover:text-on-surface transition-colors pb-2">상품문의</Link></li>
            <li><button onClick={handleWriteReview} className="hover:text-on-surface transition-colors pb-2">구매후기 작성</button></li>
            <li><Link className="hover:text-on-surface transition-colors pb-2" href="/mypage/review">내가 쓴 구매후기</Link></li>
            <li><Link href="/mypage/shipping" className="hover:text-on-surface transition-colors pb-2">배송지 관리</Link></li>
            <li><Link href="/mypage/profile" className="font-bold text-primary border-b-2 border-primary pb-2">회원정보 수정</Link></li>
          </ul>
        </nav>
        {/* Sidebar Menu (Desktop only) */}
        <nav aria-label="My Page Navigation" className="hidden md:flex flex-col w-48 flex-shrink-0">
          <h1 className="text-[22px] font-bold mb-8 text-on-surface">마이페이지</h1>
          <ul className="flex flex-col space-y-5 text-[15px] text-on-surface-variant">
            <li><Link href="/mypage/order" className="hover:text-on-surface transition-colors">주문/배송 내역</Link></li>
            <li><Link className="hover:text-on-surface transition-colors" href="/mypage/cancel">취소/교환/반품</Link></li>
            <li><Link href="/mypage/inquiry" className="hover:text-on-surface transition-colors">상품문의</Link></li>
            <li><a href="#" onClick={handleWriteReview} className="hover:text-on-surface transition-colors flex items-center justify-between">구매후기 작성 <span className="text-outline text-sm">{reviewCount && reviewCount > 0 ? reviewCount : ''}</span></a></li>
            <li><Link className="hover:text-on-surface transition-colors" href="/mypage/review">내가 쓴 구매후기</Link></li>
            <li><Link href="/mypage/shipping" className="hover:text-on-surface transition-colors">배송지 관리</Link></li>
            <li><Link href="/mypage/profile" className="font-bold text-on-surface hover:underline underline-offset-4">회원정보 수정</Link></li>
          </ul>
        </nav>

        {/* Content Area */}
        <section className="flex-1 flex flex-col space-y-6" data-purpose="profile-content">
          <h2 className="text-[20px] font-bold text-on-surface">회원정보 수정</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="w-full">
            <div className="border-t-2 border-black w-full flex flex-col text-[14px]">
              
              {/* 비밀번호 */}
              <div className="flex border-b border-[#EAEAEA]">
                <LabelCol required>비밀번호</LabelCol>
                <div className="flex-1 py-3 px-4 flex flex-col md:flex-row md:items-center gap-2">
                  <input 
                    type="password" 
                    {...register("password")} 
                    className="bg-white border border-[#CCCCCC] px-3 py-1.5 w-full md:w-[200px] outline-none focus:border-black" 
                  />
                  <span className="text-[#888888] text-[13px]">(영문 대/소문자/숫자/특수문자 중 2가지 이상 조합, 10자~16자)</span>
                  {errors.password && <p className="text-error text-xs md:ml-2">{errors.password.message}</p>}
                </div>
              </div>

              {/* 비밀번호 확인 */}
              <div className="flex border-b border-[#EAEAEA]">
                <LabelCol required>비밀번호 확인</LabelCol>
                <div className="flex-1 py-3 px-4 flex items-center">
                  <input 
                    type="password" 
                    {...register("passwordConfirm")} 
                    className="bg-white border border-[#CCCCCC] px-3 py-1.5 w-full md:w-[200px] outline-none focus:border-black" 
                  />
                  {errors.passwordConfirm && <p className="text-error text-xs ml-3">{errors.passwordConfirm.message}</p>}
                </div>
              </div>

              {/* 이름 */}
              <div className="flex border-b border-[#EAEAEA]">
                <LabelCol required>이름</LabelCol>
                <div className="flex-1 py-3 px-4 flex items-center">
                  <input 
                    type="text" 
                    {...register("name")} 
                    className="bg-white border border-[#CCCCCC] px-3 py-1.5 w-full md:w-[200px] outline-none focus:border-black" 
                  />
                  {errors.name && <p className="text-error text-xs ml-3">{errors.name.message}</p>}
                </div>
              </div>

              {/* 주소 */}
              <div className="flex border-b border-[#EAEAEA]">
                <LabelCol>주소</LabelCol>
                <div className="flex-1 py-3 px-4 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      {...register("zipcode")} 
                      readOnly
                    placeholder="우편번호"
                      className="bg-[#F5F5F5] border border-[#CCCCCC] px-3 py-1.5 w-[100px] outline-none text-[#888888]" 
                    />
                    <button 
                      type="button" 
                      onClick={handleAddressSearch}
                      className="bg-white border border-[#CCCCCC] text-[#333333] px-3 py-1.5 text-[13px] hover:bg-[#FAFAFA] transition-colors"
                    >
                      주소검색                    </button>
                  </div>
                  <input 
                    type="text" 
                    {...register("address1")} 
                    placeholder="기본주소"
                    className="bg-white border border-[#CCCCCC] px-3 py-1.5 w-full md:w-[400px] outline-none focus:border-black" 
                  />
                  <input 
                    type="text" 
                    {...register("address2")} 
                    placeholder="나머지 주소(선택 입력 가능)"
                    className="bg-white border border-[#CCCCCC] px-3 py-1.5 w-full md:w-[400px] outline-none focus:border-black" 
                  />
                </div>
              </div>

              {/* 휴대폰 */}
              <div className="flex border-b border-[#EAEAEA]">
                <LabelCol required>휴대폰</LabelCol>
                <div className="flex-1 py-3 px-4 flex items-center gap-2">
                  <select {...register("mobile1")} className="border border-[#CCCCCC] px-2 py-1.5 w-[70px] outline-none focus:border-black bg-white">
                    <option value="010">010</option>
                    <option value="011">011</option>
                    <option value="016">016</option>
                    <option value="017">017</option>
                    <option value="018">018</option>
                    <option value="019">019</option>
                  </select>
                  <span className="text-[#888888]">-</span>
                  <input type="text" maxLength={4} {...register("mobile2")} className="bg-white border border-[#CCCCCC] px-3 py-1.5 w-[70px] text-center outline-none focus:border-black" />
                  <span className="text-[#888888]">-</span>
                  <input type="text" maxLength={4} {...register("mobile3")} className="bg-white border border-[#CCCCCC] px-3 py-1.5 w-[70px] text-center outline-none focus:border-black" />
              {(errors.mobile2 || errors.mobile3) && <p className="text-error text-xs ml-3">번호를 확인해주세요.</p>}
                </div>
              </div>

              {/* 일반전화 */}
              <div className="flex border-b border-[#EAEAEA]">
                <LabelCol>일반전화</LabelCol>
                <div className="flex-1 py-3 px-4 flex items-center gap-2">
                  <select {...register("phone1")} className="border border-[#CCCCCC] px-2 py-1.5 w-[70px] outline-none focus:border-black bg-white">
                    <option value="02">02</option>
                    <option value="031">031</option>
                    <option value="032">032</option>
                    <option value="033">033</option>
                    <option value="041">041</option>
                    <option value="042">042</option>
                    <option value="043">043</option>
                    <option value="051">051</option>
                    <option value="052">052</option>
                    <option value="053">053</option>
                    <option value="054">054</option>
                    <option value="055">055</option>
                    <option value="061">061</option>
                    <option value="062">062</option>
                    <option value="063">063</option>
                    <option value="064">064</option>
                  </select>
                  <span className="text-[#888888]">-</span>
                  <input type="text" maxLength={4} {...register("phone2")} className="bg-white border border-[#CCCCCC] px-3 py-1.5 w-[70px] text-center outline-none focus:border-black" />
                  <span className="text-[#888888]">-</span>
                  <input type="text" maxLength={4} {...register("phone3")} className="bg-white border border-[#CCCCCC] px-3 py-1.5 w-[70px] text-center outline-none focus:border-black" />
                </div>
              </div>

              {/* 이메일 */}
              <div className="flex border-b border-[#EAEAEA]">
                <LabelCol>이메일</LabelCol>
                <div className="flex-1 py-3 px-4 flex items-center">
                  <input 
                    type="email" 
                    {...register("email")} 
                    className="bg-white border border-[#CCCCCC] px-3 py-1.5 w-full md:w-[250px] outline-none focus:border-black" 
                  />
                  {errors.email && <p className="text-error text-xs ml-3">{errors.email.message}</p>}
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col md:flex-row items-center relative w-full pt-4">
              <div className="flex gap-1 mx-auto">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#333333] text-white w-[140px] py-3 text-[14px] font-bold hover:bg-[#222222] transition-colors outline-none disabled:opacity-50"
                >
              회원정보수정
                </button>
                <button 
                  type="button" 
                  className="bg-[#999999] text-white w-[140px] py-3 text-[14px] font-bold hover:bg-[#888888] transition-colors outline-none"
                  onClick={() => window.history.back()}
                >
                  취소
                </button>
              </div>
              <button 
                type="button" 
                className="md:absolute right-0 top-4 mt-4 md:mt-0 border border-[#DDDDDD] text-[#666666] px-5 py-2 text-[13px] hover:bg-[#FAFAFA] transition-colors bg-white"
                onClick={handleDelete}
              >
              회원탈퇴
              </button>
            </div>

          </form>
        </section>
      </main>

      <Footer />
    </div>
  );
}
