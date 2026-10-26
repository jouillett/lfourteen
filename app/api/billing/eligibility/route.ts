import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { checkSubscriptionEligibility } from "@/lib/subscription";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json({ eligible: true });
    }

    const result = await checkSubscriptionEligibility(pool, customerId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /api/billing/eligibility error:", error);
    return NextResponse.json({ eligible: true });
  }
}
