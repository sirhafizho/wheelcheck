import { render, screen } from '@testing-library/react';
import { AccessBadge } from '@/components/places/AccessBadge';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      full: 'Accessible',
      partial: 'Partially Accessible',
      notAccessible: 'Not Accessible',
      unknown: 'Unknown',
    };
    return translations[key] || key;
  },
}));

describe('AccessBadge', () => {
  it('renders FULL accessibility with correct icon and text', () => {
    render(<AccessBadge level="FULL" />);
    expect(screen.getByText('✅')).toBeInTheDocument();
    expect(screen.getByText('Accessible')).toBeInTheDocument();
  });

  it('renders PARTIAL accessibility with correct icon and text', () => {
    render(<AccessBadge level="PARTIAL" />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();
    expect(screen.getByText('Partially Accessible')).toBeInTheDocument();
  });

  it('renders NOT_ACCESSIBLE with correct icon and text', () => {
    render(<AccessBadge level="NOT_ACCESSIBLE" />);
    expect(screen.getByText('❌')).toBeInTheDocument();
    expect(screen.getByText('Not Accessible')).toBeInTheDocument();
  });

  it('renders UNKNOWN with correct icon and text', () => {
    render(<AccessBadge level="UNKNOWN" />);
    expect(screen.getByText('❓')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('hides text when showText is false', () => {
    render(<AccessBadge level="FULL" showText={false} />);
    expect(screen.getByText('✅')).toBeInTheDocument();
    expect(screen.queryByText('Accessible')).not.toBeInTheDocument();
  });

  it('has proper ARIA label', () => {
    render(<AccessBadge level="FULL" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', 'Accessibility: Accessible');
  });
});
