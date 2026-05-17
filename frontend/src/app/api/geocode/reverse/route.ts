import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'WheelCheck/1.0 (reverse-geocode)';

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat');
  const lng = request.nextUrl.searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', lat);
  url.searchParams.set('lon', lng);
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');

  try {
    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Reverse geocode failed' }, { status: response.status });
    }

    const data = await response.json();

    const address = data.address || {};
    const road = [address.house_number, address.road].filter(Boolean).join(' ');
    const city = address.city || address.town || address.village || address.county || '';

    return NextResponse.json({
      displayName: data.display_name || '',
      road,
      city,
      postcode: address.postcode || '',
      state: address.state || '',
    });
  } catch {
    return NextResponse.json({ error: 'Reverse geocode failed' }, { status: 500 });
  }
}
