import { RowDataPacket } from "@/lib/db";

export function calculateNextAllowedDate(boxCount: number, fromDate: Date = new Date()): Date {
  const nextDate = new Date(fromDate);
  if (boxCount <= 1) {
    // 1박스: 현재 + 4주 (28일)
    nextDate.setDate(nextDate.getDate() + 28);
  } else if (boxCount <= 2) {
    // 2박스: 현재 + 2달
    nextDate.setMonth(nextDate.getMonth() + 2);
  } else if (boxCount <= 6) {
    // 6박스: 현재 + 4달
    nextDate.setMonth(nextDate.getMonth() + 4);
  } else {
    // 12박스 이상: 현재 + 7달
    nextDate.setMonth(nextDate.getMonth() + 7);
  }
  // Set to beginning of that day
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function formatKoreanDate(dateInput: Date | string): string {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일`;
}

export function formatDateForMySQL(dateInput: Date | string): string {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day} 00:00:00`;
}

export async function checkSubscriptionEligibility(
  db: any,
  customerId: number | string
): Promise<{ eligible: boolean; nextDate?: string; nextRaw?: string }> {
  try {
    // 1. Get customer mobile
    const [custRows]: any = await db.query(
      "SELECT mobile FROM customers WHERE id = ?",
      [customerId]
    );

    const parseBuffer = (val: any) => {
      if (!val) return "";
      if (Buffer.isBuffer(val)) return val.toString("utf8");
      if (val && val.type === "Buffer") return Buffer.from(val.data).toString("utf8");
      return String(val);
    };

    const mobileStr = custRows && custRows.length > 0 ? parseBuffer(custRows[0].mobile) : "";
    const cleanMobile = mobileStr.replace(/[^0-9]/g, "");

    // 2. Query subscription table
    const [subRows]: any = await db.query(
      "SELECT next FROM subscription WHERE (mobile = ? OR id = ?) AND next > NOW() ORDER BY next DESC LIMIT 1",
      [cleanMobile, customerId]
    );

    if (subRows && subRows.length > 0 && subRows[0].next) {
      const nextDate = subRows[0].next;
      return {
        eligible: false,
        nextDate: formatKoreanDate(nextDate),
        nextRaw: formatDateForMySQL(nextDate),
      };
    }

    return { eligible: true };
  } catch (error) {
    console.error("Error in checkSubscriptionEligibility:", error);
    // On error, default to eligible to avoid blocking legitimate users if DB issue
    return { eligible: true };
  }
}

export async function getSubscriptionCancelInfo(
  db: any,
  customerId: number | string
): Promise<{
  hasPurchased: boolean;
  totalBoxes?: number;
  nextDate?: string;
  formattedDate?: string;
}> {
  try {
    // 1. Check orders table for purchase history (status 0: 결제완료, 1: 배송중, 2: 배송완료)
    const [orderRows]: any = await db.query(
      "SELECT COUNT(*) as cnt FROM orders WHERE customer_id = ? AND status IN (0, 1, 2)",
      [customerId]
    );
    const orderCount = orderRows && orderRows.length > 0 ? Number(orderRows[0].cnt) : 0;

    if (orderCount === 0) {
      return { hasPurchased: false };
    }

    // 2. Determine box count from billing_item & prices
    const [itemRows]: any = await db.query(
      `SELECT bi.quantity as bi_qty, pr.quantity as box_qty 
       FROM billing b 
       JOIN billing_item bi ON b.id = bi.billing_id 
       JOIN prices pr ON bi.priced_id = pr.id 
       WHERE b.customer_id = ?`,
      [customerId]
    );

    let totalBoxes = 0;
    if (itemRows && itemRows.length > 0) {
      for (const row of itemRows) {
        const biQty = Number(row.bi_qty) || 1;
        const boxQty = Number(row.box_qty) || 1;
        totalBoxes += biQty * boxQty;
      }
    }

    if (totalBoxes === 0) {
      totalBoxes = 1; // Default fallback to 1 box
    }

    const nextDate = calculateNextAllowedDate(totalBoxes);

    return {
      hasPurchased: true,
      totalBoxes,
      nextDate: formatDateForMySQL(nextDate),
      formattedDate: formatKoreanDate(nextDate),
    };
  } catch (error) {
    console.error("Error in getSubscriptionCancelInfo:", error);
    return { hasPurchased: false };
  }
}
