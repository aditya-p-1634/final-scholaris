import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { TopBar } from "./top-bar";
import { MobileNav } from "./mobile-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 px-5 lg:px-8 py-8 pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
