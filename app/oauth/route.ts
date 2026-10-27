import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// Helper to normalize Korean mobile numbers (e.g. +82 10-1234-5678, +821012345678, 010-1234-5678)
function normalizeMobile(raw: string | undefined | null): string {
  if (!raw) return "";
  let digits = raw.replace(/\+82\s?/, "0").replace(/\D/g, "");
  if (digits.startsWith("82")) {
    digits = "0" + digits.slice(2);
  }
  return digits;
}

function renderErrorHtml(message: string, redirectUrl: string = "/join") {
  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>소셜 인증 오류</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #FAF9F5; padding: 20px;">
        <div style="background: white; border-radius: 16px; padding: 32px 24px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <div style="width: 50px; height: 50px; background-color: #FEECEB; color: #D32F2F; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px;">✕</div>
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #1c1b18;">인증에 실패했습니다</h2>
          <p style="font-size: 14px; color: #797670; line-height: 1.5; margin-bottom: 24px;">${message}</p>
          <a href="${redirectUrl}" style="display: block; width: 100%; box-sizing: border-box; padding: 12px 0; background: #2B231D; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px;">다시 시도하기</a>
        </div>
      </body>
    </html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

function renderLoginSuccessHtml(options: {
  userId: number;
  userName: string;
  userGrade: string;
  userPoints: number;
  isNewUser: boolean;
  redirectTarget: string;
  provider: "kakao" | "naver";
}) {
  const { userId, userName, userGrade, userPoints, isNewUser, redirectTarget, provider } = options;

  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isNewUser ? "회원가입 완료" : "로그인 완료"} - 엘포틴</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #FAF9F5; padding: 20px; box-sizing: border-box;">
        <div style="background: white; border-radius: 20px; padding: 40px 28px; max-width: 380px; width: 100%; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.08); border: 1px solid rgba(0,0,0,0.04);">
          <div style="width: 58px; height: 58px; background-color: #E8F5E9; color: #2E7D32; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; font-size: 28px; font-weight: bold;">✓</div>
          
          <h2 style="font-size: 22px; font-weight: bold; margin: 0 0 10px; color: #1c1b18;">
            ${isNewUser ? "회원가입 완료!" : "로그인 완료!"}
          </h2>
          
          <p style="font-size: 15px; color: #4a453e; line-height: 1.6; margin: 0 0 20px;">
            ${
              isNewUser
                ? `환영합니다, <strong>${userName}</strong>님!<br>엘포틴 회원가입이 완료되었습니다.`
                : `반갑습니다, <strong>${userName}</strong>님!`
            }
          </p>

          ${
            isNewUser
              ? `<div style="background: #FDF8F0; border: 1px solid #F5E6D0; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #7A5222; text-align: center;">
                  🎉 신규 가입 축하 <strong>1,000P</strong> 적립금이 지급되었습니다!
                </div>`
              : userPoints > 0 && userGrade !== "8"
              ? `<div style="background: #FDF8F0; border: 1px solid #F5E6D0; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #7A5222; text-align: center;">
                  현재 보유 포인트: <strong>${userPoints.toLocaleString()}P</strong>
                </div>`
              : ""
          }

          <button id="proceedBtn" onclick="proceed()" style="width: 100%; padding: 14px 0; background: #2B231D; color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: bold; cursor: pointer; transition: transform 0.1s, opacity 0.2s; box-shadow: 0 2px 8px rgba(43,35,29,0.2);">
            확인 (쇼핑하러 가기)
          </button>

          <p style="font-size: 12px; color: #9E9B95; margin-top: 14px; margin-bottom: 0;">
            버튼을 누르시면 화면으로 이동합니다
          </p>
        </div>

        <script>
          try {
            document.cookie = "session_active=1; path=/";
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("customerId", "${userId}");
            localStorage.setItem("customerGrade", "${userGrade}");
            localStorage.setItem("loginType", "${provider}");
            localStorage.setItem("lastActivity", Date.now().toString());
          } catch (e) {
            console.error("Storage error:", e);
          }

          var redirected = false;
          function proceed() {
            if (redirected) return;
            redirected = true;
            var btn = document.getElementById("proceedBtn");
            if (btn) {
              btn.innerText = "이동 중...";
              btn.style.opacity = "0.7";
            }
            window.location.replace("${redirectTarget}");
          }
        </script>
      </body>
    </html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const customerKey = searchParams.get("customerKey");

  console.log("[OAuth Request Received]", {
    url: request.url,
    state,
    code: code ? `${code.substring(0, 8)}...` : null,
    error,
    customerKey,
  });

  // Handle user cancelled / error from OAuth provider
  if (error) {
    if (error === "access_denied") {
      return renderErrorHtml("소셜 로그인을 취소하셨습니다.");
    }
    return renderErrorHtml(`인증 오류가 발생했습니다 (${error}: ${errorDescription || ""})`);
  }

  // 1. Identify Provider (Kakao vs. Naver vs. Other)
  const isKakao = state.startsWith("kakao");
  const isNaver = state.startsWith("naver");

  // Fallback for non-social or direct validation pings (e.g. Toss Payments BrandPay or health check)
  if (!isKakao && !isNaver) {
    return NextResponse.json(
      {
        success: true,
        message: "OAuth endpoint ready",
        received: { code: !!code, state, customerKey },
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }

  if (!code) {
    return renderErrorHtml("인증 코드가 전달되지 않았습니다.");
  }

  try {
    let mobile = "";
    let name = "고객";
    let email = "";

    // 2. Process Kakao OAuth
    if (isKakao) {
      const kakaoRestApiKey = process.env.KAKAO_REST_API_KEY || "576d20bc8a37554e4badd9e698428e2f";
      const kakaoClientSecret = process.env.KAKAO_CLIENT_SECRET || "wTPYaEcLDfazkcAbVFj7z7bt3R6VO5EG";
      
      const host = request.headers.get("host") || "";
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
      const redirectUri = isLocal
        ? `http://${host}/oauth`
        : (process.env.KAKAO_REDIRECT_URI || "https://lfourteen.life/oauth");

      // Exchange code for Access Token
      const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: kakaoRestApiKey,
          client_secret: kakaoClientSecret,
          redirect_uri: redirectUri,
          code: code,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("[Kakao Token Error]", tokenData);
        return renderErrorHtml("카카오 토큰 발급에 실패했습니다: " + (tokenData.error_description || tokenData.error));
      }

      // Fetch User Info
      const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      });

      const userData = await userRes.json();
      if (!userRes.ok) {
        console.error("[Kakao User Info Error]", userData);
        return renderErrorHtml("카카오 사용자 정보를 조회할 수 없습니다.");
      }

      const kakaoAccount = userData.kakao_account || {};
      mobile = normalizeMobile(kakaoAccount.phone_number);
      name = kakaoAccount.name || kakaoAccount.profile?.nickname || "카카오회원";
      email = kakaoAccount.email || "";
    }

    // 3. Process Naver OAuth
    if (isNaver) {
      const naverClientId = process.env.NAVER_CLIENT_ID || "NsHvqbGAlupjtc2yek0j";
      const naverClientSecret = process.env.NAVER_CLIENT_SECRET || "DW413k5xgz";

      // Exchange code for Access Token
      const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${naverClientId}&client_secret=${naverClientSecret}&code=${encodeURIComponent(
        code
      )}&state=${encodeURIComponent(state)}`;

      const tokenRes = await fetch(tokenUrl, { method: "GET" });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("[Naver Token Error]", tokenData);
        return renderErrorHtml("네이버 토큰 발급에 실패했습니다: " + (tokenData.error_description || tokenData.error));
      }

      // Fetch User Info
      const userRes = await fetch("https://openapi.naver.com/v1/nid/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const userData = await userRes.json();
      if (!userRes.ok || userData.resultcode !== "00") {
        console.error("[Naver User Info Error]", userData);
        return renderErrorHtml("네이버 사용자 정보를 조회할 수 없습니다: " + (userData.message || ""));
      }

      const naverAccount = userData.response || {};
      mobile = normalizeMobile(naverAccount.mobile || naverAccount.mobile_e164);
      name = naverAccount.name || naverAccount.nickname || "네이버회원";
      email = naverAccount.email || "";
    }

    // 4. Validate Phone Number
    if (!mobile) {
      // If mobile number is not provided by provider (e.g. permission unselected), forward to regular join
      return renderErrorHtml(
        "소셜 계정에 휴대폰 번호가 등록되어 있지 않거나 권한이 동의되지 않았습니다. 일반 휴대폰 번호로 가입을 진행해주세요.",
        `/join?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`
      );
    }

    // 5. Database Processing: Check if customer exists by mobile
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existingRows]: any = await connection.execute(
        "SELECT id, name, mobile, email, point, grade FROM customers WHERE mobile = ?",
        [mobile]
      );

      let userId: number;
      let userName: string = name;
      let userGrade: string = "9";
      let userPoints: number = 0;
      let isNewUser: boolean = false;

      if (existingRows && existingRows.length > 0) {
        // --- EXISTING CUSTOMER: LOGIN ---
        const existing = existingRows[0];
        userId = existing.id;
        userName = existing.name || name;
        userGrade = String(existing.grade || "9");

        // Update login timestamp & fill name/email if empty
        await connection.execute(
          `UPDATE customers SET 
            login = NOW(),
            name = IF(name IS NULL OR name = '', ?, name),
            email = IF(email IS NULL OR email = '', ?, email)
           WHERE id = ?`,
          [name, email, userId]
        );

        // Delete expired points
        await connection.execute("DELETE FROM points WHERE customer_id = ? AND expired_at < NOW()", [userId]);

        // Sync total points
        const [pointSumRow]: any = await connection.execute(
          "SELECT IFNULL(SUM(point_amount), 0) as total FROM points WHERE customer_id = ?",
          [userId]
        );
        userPoints = Number(pointSumRow[0]?.total) || 0;
        if (Number(existing.point) !== userPoints) {
          await connection.execute("UPDATE customers SET point = ? WHERE id = ?", [userPoints, userId]);
        }
      } else {
        // --- NEW CUSTOMER: SIGNUP ---
        isNewUser = true;

        // Generate Blowfish-encrypted password for account
        const { Blowfish } = require("javascript-blowfish");
        const bf = new Blowfish("yrhan");
        const randomPlainPassword = Math.random().toString(36).slice(-10) + "!A1";
        const encryptedPassword = bf.base64Encode(bf.encrypt(randomPlainPassword));

        const [insertResult]: any = await connection.execute(
          `INSERT INTO customers (mobile, password, name, email, grade, login)
           VALUES (?, ?, ?, ?, 9, NOW())`,
          [mobile, encryptedPassword, name, email]
        );
        userId = insertResult.insertId;

        // Check if user exists in quit table
        const [quitRows]: any = await connection.execute(
          "SELECT created_at FROM quit WHERE mobile = ? ORDER BY created_at DESC LIMIT 1",
          [mobile]
        );

        let givePoints = true;
        if (quitRows.length > 0) {
          const quitDate = new Date(quitRows[0].created_at);
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          if (quitDate > oneYearAgo) {
            givePoints = false;
          }
        }

        if (givePoints) {
          await connection.execute(
            `INSERT INTO points (customer_id, order_id, point_amount, expired_at)
             VALUES (?, 0, 1000, DATE_ADD(NOW(), INTERVAL 1 MONTH))`,
            [userId]
          );
          userPoints = 1000;
          if (quitRows.length > 0) {
            await connection.execute("DELETE FROM quit WHERE mobile = ?", [mobile]);
          }
        } else {
          // Reset point to 0 if quit within 1 year
          await connection.execute("UPDATE customers SET point = 0 WHERE id = ?", [userId]);
          userPoints = 0;
        }
      }

      await connection.commit();

      let redirectTarget = "/";
      if (userGrade === "8") {
        redirectTarget = "/confidential";
      }

      return renderLoginSuccessHtml({
        userId,
        userName,
        userGrade,
        userPoints,
        isNewUser,
        redirectTarget,
        provider: isKakao ? "kakao" : "naver",
      });
    } catch (dbErr: any) {
      await connection.rollback();
      console.error("[Database Error in /oauth]", dbErr);
      return renderErrorHtml("회원 정보 저장 중 데이터베이스 오류가 발생했습니다.");
    } finally {
      connection.release();
    }
  } catch (err: any) {
    console.error("[OAuth Handler Error]", err);
    return renderErrorHtml("소셜 로그인 처리 중 오류가 발생했습니다: " + err.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(
      { success: true, message: "OAuth POST received", body },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
