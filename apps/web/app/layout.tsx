import './globals.css';

/**
 * Root layout for the Next.js app
 * This defines the structure of all pages in the app
 */
export const metadata = {
  title: 'Agent Base | Developer-First AI Agent Infrastructure',
  description: 'Build, deploy, and scale powerful AI agents with serverless infrastructure designed specifically for developers.',
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