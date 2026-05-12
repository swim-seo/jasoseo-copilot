import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "자소서 코파일럿",
  description: "여러 전문가의 피드백을 한꺼번에 받는 AI 자소서 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-[var(--border)] bg-[var(--background)]">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight text-[15px]">
              자소서 코파일럿
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/write"
                className="px-3 py-1.5 rounded-md hover:bg-[var(--accent-soft)] transition"
              >
                새 자소서
              </Link>
              <Link
                href="/review"
                className="px-3 py-1.5 rounded-md hover:bg-[var(--accent-soft)] transition"
              >
                초안 검토
              </Link>
              <Link
                href="/history"
                className="px-3 py-1.5 rounded-md hover:bg-[var(--accent-soft)] transition"
              >
                히스토리
              </Link>
              <Link
                href="/profile"
                className="px-3 py-1.5 rounded-md hover:bg-[var(--accent-soft)] transition"
              >
                내 프로필
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--muted)]">
          168 chunks · careersaida · 면접왕 이형
        </footer>
      </body>
    </html>
  );
}
