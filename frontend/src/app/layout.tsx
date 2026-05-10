import { notFound } from 'next/navigation';
import "./globals.css";

// This is the root layout that redirects to locale-based routes
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return notFound();
}

// Middleware will handle the redirect to /[locale]
export const metadata = {
  title: 'WheelCheck',
  description: "Malaysia's wheelchair accessibility checker",
};
