import { render, screen } from '@testing-library/react';
import { PlaceDetail } from '@/components/places/PlaceDetail';
import type { Place } from '@/lib/types';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const basePlace: Place = {
  id: 'abc-123',
  name: 'Hospital Kuala Lumpur',
  address: 'Jalan Pahang, 50586 Kuala Lumpur',
  latitude: 3.1569,
  longitude: 101.7123,
  accessibilityLevel: 'FULL',
  category: 'HOSPITAL',
  reviewCount: 3,
  createdAt: '2026-05-01T08:00:00Z',
};

describe('PlaceDetail', () => {
  it('renders place name as h1', () => {
    render(<PlaceDetail place={basePlace} locale="en" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hospital Kuala Lumpur');
  });

  it('renders address', () => {
    render(<PlaceDetail place={basePlace} locale="en" />);
    expect(screen.getByText('Jalan Pahang, 50586 Kuala Lumpur')).toBeInTheDocument();
  });

  it('shows state line when state is provided', () => {
    const place = { ...basePlace, city: 'Kuala Lumpur', state: 'Wilayah Persekutuan Kuala Lumpur' };
    render(<PlaceDetail place={place} locale="en" />);
    expect(screen.getByLabelText('State')).toHaveTextContent('Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur');
  });

  it('shows only state when city is absent', () => {
    const place = { ...basePlace, state: 'Selangor' };
    render(<PlaceDetail place={place} locale="en" />);
    expect(screen.getByLabelText('State')).toHaveTextContent('Selangor');
  });

  it('does not render state line when both city and state are absent', () => {
    render(<PlaceDetail place={basePlace} locale="en" />);
    expect(screen.queryByLabelText('State')).not.toBeInTheDocument();
  });

  it('shows data source label "OpenStreetMap" for OSM source', () => {
    const place = { ...basePlace, dataSource: 'OSM' };
    render(<PlaceDetail place={place} locale="en" />);
    expect(screen.getByTestId('data-source-label')).toHaveTextContent('OpenStreetMap');
  });

  it('shows data source label for Prasarana GTFS', () => {
    const place = { ...basePlace, dataSource: 'PRASARANA_GTFS' };
    render(<PlaceDetail place={place} locale="en" />);
    expect(screen.getByTestId('data-source-label')).toHaveTextContent('Prasarana GTFS (data.gov.my)');
  });

  it('shows data source label for data.gov.my facilities', () => {
    const place = { ...basePlace, dataSource: 'DATA_GOV_MY' };
    render(<PlaceDetail place={place} locale="en" />);
    expect(screen.getByTestId('data-source-label')).toHaveTextContent('data.gov.my');
  });

  it('shows "Community report" when dataSource is absent', () => {
    render(<PlaceDetail place={basePlace} locale="en" />);
    expect(screen.getByTestId('data-source-label')).toHaveTextContent('Community report');
  });

  it('shows "Community report" for COMMUNITY source', () => {
    const place = { ...basePlace, dataSource: 'COMMUNITY' };
    render(<PlaceDetail place={place} locale="en" />);
    expect(screen.getByTestId('data-source-label')).toHaveTextContent('Community report');
  });

  it('falls back to raw source name for unknown source keys', () => {
    const place = { ...basePlace, dataSource: 'MY_CUSTOM_SOURCE' };
    render(<PlaceDetail place={place} locale="en" />);
    expect(screen.getByTestId('data-source-label')).toHaveTextContent('MY_CUSTOM_SOURCE');
  });

  it('renders report button', () => {
    render(<PlaceDetail place={basePlace} locale="en" onReportClick={jest.fn()} />);
    expect(screen.getByRole('button', { name: /report/i })).toBeInTheDocument();
  });

  it('calls onReportClick when report button is clicked', async () => {
    const onReportClick = jest.fn();
    render(<PlaceDetail place={basePlace} locale="en" onReportClick={onReportClick} />);
    screen.getByRole('button', { name: /report/i }).click();
    expect(onReportClick).toHaveBeenCalledTimes(1);
  });
});
