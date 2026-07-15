import DesktopHome from "../components/DesktopHome";
import MobileHome from "../components/MobileHome";
import pool from "../lib/db";
import { RowDataPacket } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let reviewCount = 0;
  let qnaCount = 0;
  let topReviews: any[] = [];

  try {
    const [reviewRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM review');
    const [qnaRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM qna');
    reviewCount = reviewRows[0].count;
    qnaCount = qnaRows[0].count;

    const [topReviewsData] = await pool.query<RowDataPacket[]>(
      'SELECT customer_name, rating, content, created_at FROM review ORDER BY focus LIMIT 2'
    );
    topReviews = topReviewsData.map(r => {
      let dateStr = "";
      if (r.created_at) {
        const d = new Date(r.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(2);
        dateStr = `${yy}.${mm}.${dd}`;
      }
      
      const custName = Buffer.isBuffer(r.customer_name) ? r.customer_name.toString('utf8') : (r.customer_name || 'User');
      const contentStr = Buffer.isBuffer(r.content) ? r.content.toString('utf8') : (r.content || '');

      return {
        customer_name: custName,
        rating: r.rating,
        content: contentStr,
        created_at: dateStr
      };
    });
  } catch (error) {
    console.error("Failed to fetch counts from database", error);
  }

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .desktop-only-view { display: block !important; }
          .mobile-only-view { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-only-view { display: none !important; }
          .mobile-only-view { display: block !important; }
        }
      `}</style>
      <div className="desktop-only-view">
        <DesktopHome initialReviewCount={reviewCount} initialQnaCount={qnaCount} topReviews={topReviews} />
      </div>
      <div className="mobile-only-view">
        <MobileHome initialReviewCount={reviewCount} initialQnaCount={qnaCount} topReviews={topReviews} />
      </div>
    </>
  );
}
