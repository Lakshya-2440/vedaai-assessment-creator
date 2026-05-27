"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, FileText, BookOpen, Sparkles } from "lucide-react";

const tabs = [
  { name: "Home", href: "/", icon: LayoutGrid },
  { name: "Assignments", href: "/assignments", icon: FileText },
  { name: "Library", href: "#", icon: BookOpen, disabled: true },
  { name: "AI Toolkit", href: "#", icon: Sparkles, disabled: true },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto flex max-w-3xl items-stretch justify-between rounded-[28px] bg-[#171717] px-2 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || (tab.href === "/assignments" && pathname.startsWith("/assignments"));

          if (tab.disabled) {
            return (
              <div key={tab.name} className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-gray-500">
                <Icon className="h-6 w-6" />
                <span className="text-[11px] font-semibold">{tab.name}</span>
              </div>
            );
          }

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-colors ${active ? "text-white" : "text-gray-500"}`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-[11px] font-semibold">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}