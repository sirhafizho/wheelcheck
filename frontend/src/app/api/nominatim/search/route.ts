import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'WheelCheck/1.0 (location picker)';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();
  const locale = request.nextUrl.searchParams.get('locale')?.trim() || 'en';

  if (!query) {
    return NextResponse.json([]);
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', query);
  url.searchParams.set('countrycodes', 'my');
  url.searchParams.set('limit', '5');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept-Language': locale,
        'User-Agent': USER_AGENT,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ message: 'Failed to search addresses' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Failed to search addresses' }, { status: 500 });
  }
}
