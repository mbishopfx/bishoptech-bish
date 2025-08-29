import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ChatCacheProvider } from "@/contexts/chat-cache";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | AI Chat",
    default: "AI Chat",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`bg-background selection:bg-sidebar-logo relative antialiased selection:text-white dark:selection:text-black`}
      >
        <ConvexClientProvider>
          <ChatCacheProvider>
            <Providers>{children}</Providers>
          </ChatCacheProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
