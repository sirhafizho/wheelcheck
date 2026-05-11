import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

export const metadata = {
  title: 'WheelCheck',
  description: "Malaysia's wheelchair accessibility checker",
};
