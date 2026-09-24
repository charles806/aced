import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ACED — Study Smarter with AI",
    template: "%s | ACED",
  },
  description:
    "ACED keeps your notes and study materials organized in one place, tracks your study time and progress, and uses AI to help you actually understand what you're learning.",
  openGraph: {
    title: "ACED — Study Smarter with AI",
    description:
      "Organize subjects and notes, track study progress, and learn with AI summaries, flashcards, quizzes, and an AI Tutor.",
    siteName: "ACED",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ACED — Study Smarter with AI",
    description:
      "Organize subjects and notes, track study progress, and learn with AI summaries, flashcards, quizzes, and an AI Tutor.",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("sv-theme");if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}