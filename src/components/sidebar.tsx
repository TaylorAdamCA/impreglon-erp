"use client";

import Image from "next/image";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { NavLinks } from "@/components/nav-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  user: {
    username: string;
    role: string;
  };
}

export function Sidebar({ collapsed, user }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-4">
        {collapsed ? (
          <div className="mx-auto h-8 w-8 rounded bg-sidebar-accent/50 flex items-center justify-center">
            <span className="text-xs font-bold text-sidebar-foreground">IC</span>
          </div>
        ) : (
          <Image
            src="/logo.png"
            alt="Impreglon Canada"
            width={180}
            height={36}
            className="brightness-0 invert"
            priority
          />
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <NavLinks collapsed={collapsed} />
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* User info */}
      <div className={cn("shrink-0 p-3", collapsed && "flex justify-center")}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                {user.username[0].toUpperCase()}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {user.username} ({user.role})
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                {user.username[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.username}
                </p>
                <Badge
                  variant="secondary"
                  className="mt-0.5 bg-sidebar-accent text-sidebar-accent-foreground text-[10px] px-1.5 py-0"
                >
                  {user.role}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
