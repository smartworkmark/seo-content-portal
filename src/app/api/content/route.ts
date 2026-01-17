import { NextRequest, NextResponse } from 'next/server';
import { fetchAllContent } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const refresh = searchParams.get('refresh') === 'true';

    const data = await fetchAllContent(refresh);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': refresh
          ? 'no-cache, no-store, must-revalidate'
          : 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}
