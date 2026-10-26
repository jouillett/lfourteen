import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSubscriptionCancelInfo } from "@/lib/subscription";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ hasPurchased: false });
    }

    const result = await getSubscriptionCancelInfo(pool, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /api/mypage/billing/cancel-preview error:", error);
    return NextResponse.json({ hasPurchased: false });
  }
}
