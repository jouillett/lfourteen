import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const carrierId = searchParams.get('carrierId');
    const trackId = searchParams.get('trackId');

    if (!carrierId || !trackId) {
      return NextResponse.json({ success: false, message: 'Missing carrierId or trackId' }, { status: 400 });
    }

    const cleanTrackId = trackId.replace(/[^0-9a-zA-Z]/g, '');
    const apiUrl = `https://apis.tracker.delivery/carriers/${carrierId}/tracks/${cleanTrackId}`;
    
    const res = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await res.json();
    
    return NextResponse.json({ success: true, data }, { status: res.ok ? 200 : res.status });
  } catch (error: any) {
    console.error('Tracking API error:', error);
    return NextResponse.json({ success: false, message: '배송 조회에 실패했습니다.' }, { status: 500 });
  }
}
