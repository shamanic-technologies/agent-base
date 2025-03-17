import './globals.css';

/**
 * Root layout for the Next.js app
 * This defines the structure of all pages in the app
 */
export const metadata = {
  title: 'HelloWorld AI Client',
  description: 'Client for the HelloWorld AI API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
} 