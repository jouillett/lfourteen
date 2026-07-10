import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIdStr = searchParams.get("userId");

  if (!userIdStr) {
    return NextResponse.json({ success: false, message: "userId is required" }, { status: 400 });
  }

  const userId = parseInt(userIdStr, 10);

  try {
    const connection = await pool.getConnection();
    try {
      // Check if billing exists
      const [billingRows] = await connection.execute<RowDataPacket[]>(
        "SELECT id, `interval`, period, next_billing_at, created_at FROM billing WHERE customer_id = ? ORDER BY id DESC LIMIT 1",
        [userId]
      );

      if (billingRows.length === 0) {
        return NextResponse.json({ success: true, subscribed: false });
      }

      const billing = billingRows[0];

      // Get billing items
      const [itemRows] = await connection.execute<RowDataPacket[]>(
        `SELECT bi.id as item_id, bi.product_id, bi.priced_id, bi.quantity, p.name as product_name, pp.quantity as option_quantity_val, pp.price
         FROM billing_item bi
         JOIN products p ON bi.product_id = p.id
         JOIN prices pp ON bi.priced_id = pp.id
         WHERE bi.billing_id = ?`,
        [billing.id]
      );

      // Get available subscription options (product_id = 1)
      const [availableOptionRows] = await connection.execute<RowDataPacket[]>(
        `SELECT pp.id as priced_id, p.name as product_name, pp.quantity as option_quantity_val, pp.price
         FROM prices pp
         JOIN products p ON pp.product_id = p.id
         WHERE pp.product_id = 1`
      );

      return NextResponse.json({
        success: true,
        subscribed: true,
        billing: {
          id: billing.id,
          interval: billing.interval,
          period: billing.period,
          next_billing_at: billing.next_billing_at,
          created_at: billing.created_at
        },
        items: itemRows,
        availableOptions: availableOptionRows
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error("GET /api/mypage/billing error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { userId, billingId, interval, period, items } = body;

    if (!userId || !billingId) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update interval and period
      await connection.execute(
        "UPDATE billing SET `interval` = ?, period = ? WHERE id = ? AND customer_id = ?",
        [interval, period, billingId, userId]
      );

      // Update items (for simplicity, we assume we update the quantity of existing items)
      // If the user wants to remove an item or change priceId, we can handle it here.
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.action === "update") {
            await connection.execute(
              "UPDATE billing_item SET quantity = ?, priced_id = ? WHERE id = ? AND billing_id = ?",
              [item.quantity, item.priced_id, item.item_id, billingId]
            );
          } else if (item.action === "delete") {
            await connection.execute(
              "DELETE FROM billing_item WHERE id = ? AND billing_id = ?",
              [item.item_id, billingId]
            );
          } else if (item.action === "add") {
            await connection.execute(
              "INSERT INTO billing_item (billing_id, product_id, priced_id, quantity) VALUES (?, 1, ?, ?)",
              [billingId, item.priced_id, item.quantity]
            );
          }
        }
      }

      await connection.commit();
      return NextResponse.json({ success: true });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error("PUT /api/mypage/billing error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdStr = searchParams.get("userId");
    if (!userIdStr) {
      return NextResponse.json({ success: false, message: "userId is required" }, { status: 400 });
    }
    const userId = parseInt(userIdStr, 10);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get billing info
      const [billingRows] = await connection.execute<RowDataPacket[]>(
        "SELECT id, billing_key FROM billing WHERE customer_id = ?",
        [userId]
      );

      if (billingRows.length > 0) {
        for (const row of billingRows) {
          // Delete from Toss Payments
          if (row.billing_key) {
            const secretKey = process.env.TOSS_SECRET_KEY || "test_sk_XjExPeJWYVQR12P55agr49R5gvNL";
            const encodedSecretKey = Buffer.from(secretKey + ":").toString("base64");
            
            try {
              const tossRes = await fetch(`https://api.tosspayments.com/v1/billing/${row.billing_key}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Basic ${encodedSecretKey}`,
                  "Content-Type": "application/json"
                }
              });
              
              if (!tossRes.ok) {
                const errData = await tossRes.json().catch(() => ({}));
                console.error("Failed to cancel Toss billing key:", errData);
                // We proceed with local DB deletion even if Toss fails (e.g. key already deleted)
              }
            } catch (tossErr) {
              console.error("Toss billing cancellation error:", tossErr);
            }
          }

          // Delete from DB
          await connection.execute("DELETE FROM billing_item WHERE billing_id = ?", [row.id]);
        }
      }

      await connection.execute("DELETE FROM billing WHERE customer_id = ?", [userId]);

      await connection.commit();
      return NextResponse.json({ success: true });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error("DELETE /api/mypage/billing error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
