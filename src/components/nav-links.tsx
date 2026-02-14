"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Factory,
  ShieldCheck,
  Truck,
  Receipt,
  Calendar,
  Users,
  Package,
  Wrench,
  Settings,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Orders",
    items: [
      { label: "Orders", href: "/orders", icon: ClipboardList },
      { label: "Quotes", href: "/quotes", icon: FileText },
    ],
  },
  {
    title: "Manufacturing",
    items: [
      { label: "Shop Floor", href: "/shop", icon: Factory },
      { label: "QA / Rework", href: "/qa", icon: ShieldCheck },
      { label: "Shipping", href: "/shipping", icon: Truck },
    ],
  },
  {
    title: "Financial",
    items: [
      { label: "Invoices", href: "/invoices", icon: Receipt },
      { label: "Month End", href: "/month-end", icon: Calendar },
    ],
  },
  {
    title: "Data",
    items: [
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Products", href: "/products", icon: Package },
      { label: "Tools", href: "/tools", icon: Wrench },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Process Templates", href: "/admin/process-templates", icon: ListChecks },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function NavLinks({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-2">
      {navGroups.map((group) => (
        <div key={group.title} className="mt-4 first:mt-0">
          {!collapsed && (
            <span className="mb-1 block px-3 text-xs font-semibold uppercase tracking-wider text-[var(--sidebar-muted)]">
              {group.title}
            </span>
          )}
          {collapsed && <div className="mb-1" />}
          {group.items.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </div>
      ))}
    </nav>
  );
}
