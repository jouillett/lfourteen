import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET(req: Request) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const customerId = searchParams.get('customerId');
    const statusGreaterThan = searchParams.get('statusGreaterThan');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '0', 10);
    const search = searchParams.get('search') || '';

    if (!customerId) {
      return NextResponse.json({ success: false, message: 'Missing customerId' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      let countQuery = `SELECT COUNT(*) as total FROM orders WHERE customer_id = ?`;
      let countParams: any[] = [customerId];

      if (statusGreaterThan) {
        countQuery += ` AND status > ?`;
        countParams.push(Number(statusGreaterThan));
      }
      if (search) {
        countQuery += ` AND order_name LIKE ?`;
        countParams.push(`%${search}%`);
      }
      const [countResult]: any = await connection.execute(countQuery, countParams);
      const total = countResult[0].total;

      let query = `SELECT * FROM orders WHERE customer_id = ?`;
      let queryParams: any[] = [customerId];

      if (statusGreaterThan) {
        query += ` AND status > ?`;
        queryParams.push(Number(statusGreaterThan));
      }
      if (search) {
        query += ` AND order_name LIKE ?`;
        queryParams.push(`%${search}%`);
      }
      query += ` ORDER BY created_at DESC`;

      if (limit > 0) {
        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);
      }

      const [orders]: any = await connection.execute(query, queryParams);
      
      const processedOrders = [];

      for (const row of orders) {
        const order = { ...row };
        for (const key in order) {
          if (Buffer.isBuffer(order[key])) {
            order[key] = order[key].toString('utf8');
          } else if (order[key] && order[key].type === 'Buffer') {
            order[key] = Buffer.from(order[key].data).toString('utf8');
          }
        }

        const [orderItems]: any = await connection.execute(
          `SELECT * FROM order_items WHERE order_id = ?`,
          [order.id]
        );

        if (orderItems.length > 0) {
          const firstItem = orderItems[0];
          
          const [products]: any = await connection.execute(
            `SELECT image, name, description FROM products WHERE id = ?`,
            [firstItem.product_id]
          );
          
          if (products.length > 0) {
            const product = products[0];
            
            const parseBuffer = (val: any) => {
              if (Buffer.isBuffer(val)) return val.toString('utf8');
              if (val && val.type === 'Buffer') return Buffer.from(val.data).toString('utf8');
              return val;
            };

            order.image = parseBuffer(product.image);
            
            if (orderItems.length === 1) {
              let title = parseBuffer(product.description);
              const [prices]: any = await connection.execute(
                `SELECT quantity FROM prices WHERE id = ?`,
                [firstItem.price_id]
              );
              if (prices.length > 0) {
                const quantity = prices[0].quantity;
                if (quantity > 1) {
                  title = title + ' ' + quantity + '개';
                }
              }
              const originalName = parseBuffer(order.order_name) || '';
              if (originalName.includes('(정기구독 첫 결제)')) {
                title += ' (정기구독 첫 결제)';
              } else if (originalName.includes('(정기구독)')) {
                title += ' (정기구독)';
              }
              order.order_name = title;
            } else {
              let title = parseBuffer(product.name);
              title = title + '외 ' + (orderItems.length - 1) + '개';
              const originalName = parseBuffer(order.order_name) || '';
              if (originalName.includes('(정기구독 첫 결제)')) {
                title += ' (정기구독 첫 결제)';
              } else if (originalName.includes('(정기구독)')) {
                title += ' (정기구독)';
              }
              order.order_name = title;
            }
          }

          // Calculate original price
          const [originalPriceResult]: any = await connection.execute(
            `SELECT SUM(oi.quantity * pr.price) as original_price
             FROM order_items oi
             JOIN prices pr ON oi.price_id = pr.id
             WHERE oi.order_id = ?`,
            [order.id]
          );
          if (originalPriceResult && originalPriceResult[0] && originalPriceResult[0].original_price) {
            order.original_price = Number(originalPriceResult[0].original_price);
          }
        }
        
        processedOrders.push(order);
      }
      
      return NextResponse.json({ success: true, data: processedOrders, total });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error in GET /api/orders:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('id');

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Missing order id' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.execute(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);
      await connection.execute(`DELETE FROM orders WHERE id = ?`, [orderId]);
      
      return NextResponse.json({ success: true, message: 'Order deleted successfully' });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error in DELETE /api/orders:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
