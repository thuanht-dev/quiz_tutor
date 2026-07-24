import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { AuthSessionRefresh } from "@/components/auth-session-refresh";
import { Providers } from "@/components/providers";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Website trắc nghiệm vui nhộn dành cho gia sư và học sinh tiểu học.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${nunito.variable} ${fredoka.variable} h-full`}>
      <body className="min-h-full font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-teal-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Bỏ qua đến nội dung chính
        </a>
        <Providers>
          <AuthSessionRefresh />
          {children}
        </Providers>
      </body>
    </html>
  );
}
