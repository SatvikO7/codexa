import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Codexa - Chat with your codebase",
  description:
    "Upload your project and chat with your code using AI. Understand functions, trace logic, and get instant answers about your codebase.",
  keywords: [
    "code chat",
    "AI code assistant",
    "codebase chat",
    "code understanding",
    "developer tools",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/fav.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/fav.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Codexa - Chat with your codebase",
    description: "Upload your project and chat with your code using AI.",
    type: "website",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
