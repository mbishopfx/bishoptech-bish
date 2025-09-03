import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ThemeProvider } from "next-themes";
import { Providers } from "./providers";
import ChatShell from "@/components/ai/ChatShell";
import ThreadSidebar from "@/components/thread-sidebar";
import { cookies } from "next/headers";

const inter = Inter({
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | AI Chat",
    default: "AI Chat",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialModel = cookieStore.get("selectedModel")?.value;

  return (
    <html lang="en" className={`${inter.className}`} suppressHydrationWarning>
      <body
        className={`bg-background relative antialiased`}
      >
        <ConvexClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <Providers initialModel={initialModel}>
              <ChatShell sidebar={<ThreadSidebar />}>{children}</ChatShell>
            </Providers>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
