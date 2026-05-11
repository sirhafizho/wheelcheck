import { render, screen } from '@testing-library/react';
import { PlaceCard } from '@/components/places/PlaceCard';
import type { Place } from '@/lib/types';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

describe('PlaceCard', () => {
  const mockPlace: Place = {
    id: '1',
    name: 'Test Place',
    address: '123 Test St, Kuala Lumpur',
    latitude: 3.139,
    longitude: 101.6869,
    accessibilityLevel: 'FULL',
    category: 'Restaurant',
    reviewCount: 5,
    createdAt: '2024-01-01T10:00:00Z',
  };

  it('renders place name', () => {
    render(<PlaceCard place={mockPlace} locale="en" />);
    expect(screen.getByText('Test Place')).toBeInTheDocument();
  });

  it('renders place address', () => {
    render(<PlaceCard place={mockPlace} locale="en" />);
    expect(screen.getByText('123 Test St, Kuala Lumpur')).toBeInTheDocument();
  });

  it('renders accessibility badge', () => {
    render(<PlaceCard place={mockPlace} locale="en" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders review count', () => {
    render(<PlaceCard place={mockPlace} locale="en" />);
    expect(screen.getByText(/5.*review/)).toBeInTheDocument();
  });

  it('links to place detail page', () => {
    render(<PlaceCard place={mockPlace} locale="en" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/en/places/1');
  });
});
