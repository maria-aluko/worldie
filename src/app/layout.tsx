import type { Metadata } from "next";
import { Unbounded, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Worldie — Predict the 2026 World Cup",
    template: "%s · Worldie",
  },
  description:
    "Make your 2026 FIFA World Cup predictions, share them everywhere, and battle your friends on the live leaderboard.",
  openGraph: {
    title: "Worldie — Predict the 2026 World Cup",
    description:
      "Pick your champion, fill the bracket, and see how you stack up against the world.",
    type: "website",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Worldie — Predict the 2026 World Cup",
    description:
      "Pick your champion, fill the bracket, and see how you stack up against the world.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${unbounded.variable} ${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply stored theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light');})();` }} />
      </head>
      <body className="bg-pitch min-h-full flex flex-col">{children}</body>
    </html>
  );
}
