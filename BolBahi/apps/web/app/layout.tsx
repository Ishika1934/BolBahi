import type { Metadata } from 'next';
import { Poppins, Plus_Jakarta_Sans, Mukta, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const poppins = Poppins({
  weight: ['500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const mukta = Mukta({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['devanagari', 'latin'],
  variable: '--font-mukta',
  display: 'swap',
});

const noto = Noto_Sans_Devanagari({
  weight: ['400', '500', '600', '700'],
  subsets: ['devanagari'],
  variable: '--font-noto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BolBahi - Bol do, bahi ban jayegi',
  description: 'Voice-first khata (credit ledger) for Indian kirana shopkeepers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="hi"
      className={`${poppins.variable} ${jakarta.variable} ${mukta.variable} ${noto.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased selection:bg-[#E8731A]/20 font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
