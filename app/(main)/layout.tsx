import "@/styles/globals.css";
import { CustomTrigger } from "@/components/custom-trigger";
import { SettingsBar } from "@/components/settings-bar";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ModelProvider } from "@/contexts/model-context";
import { Providers } from "@/components/providers";
import { cookies } from "next/headers";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const initialModel = cookieStore.get("selectedModel")?.value;

  return (
    <Providers>
      <ModelProvider initialModel={initialModel}>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar />

        <SidebarInset className="h-screen min-h-screen w-full overflow-y-hidden">
          <CustomTrigger />
          <SettingsBar />
          {children}
          </SidebarInset>
        </SidebarProvider>
      </ModelProvider>
    </Providers>
  );
}
