"use client";

import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { NavLinks } from "@/components/nav-links";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

interface AppShellProps {
  user: {
    username: string;
    role: string;
  };
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar collapsed={collapsed} user={user} />
        </div>

        {/* Mobile sidebar (Sheet) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-64 bg-sidebar p-0 text-sidebar-foreground border-sidebar-border"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-16 items-center px-4">
              <Image
                src="/logo.png"
                alt="Impreglon Canada"
                width={180}
                height={36}
                className="brightness-0 invert"
              />
            </div>
            <Separator className="bg-sidebar-border" />
            <ScrollArea className="flex-1 py-2">
              <NavLinks collapsed={false} />
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
            onMobileOpen={() => setMobileOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
