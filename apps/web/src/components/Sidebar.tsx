"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, FileText, Settings, Sparkles, BookOpen, Clock } from "lucide-react";
import { listAssignments } from "@/lib/api";

export function Sidebar() {
  const pathname = usePathname();
  const isCreateAssignmentPage = pathname === "/assignments/new";
  const [assignmentCount, setAssignmentCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refreshCount = () => {
      listAssignments()
        .then(({ assignments }) => {
          if (!cancelled) setAssignmentCount(assignments.length);
        })
        .catch(() => {
          if (!cancelled) setAssignmentCount(null);
        });
    };

    refreshCount();
    window.addEventListener("assignments:changed", refreshCount);

    return () => {
      cancelled = true;
      window.removeEventListener("assignments:changed", refreshCount);
    };
  }, []);

  const links = [
    { name: "Home", href: "/", icon: LayoutGrid },
    { name: "My Groups", href: "#", icon: Users, disabled: true },
    { name: "Assignments", href: "/assignments", icon: FileText, badge: assignmentCount ?? undefined },
    { name: "AI Teacher's Toolkit", href: "#", icon: Sparkles, disabled: true },
    { name: "My Library", href: "#", icon: Clock, disabled: true },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 flex flex-col bg-white border-r border-gray-100 shadow-[2px_0_10px_rgba(0,0,0,0.03)] rounded-br-3xl rounded-tr-3xl">
      <div className="flex items-center gap-3 px-6 py-6">
        <img src="/logo.png" alt="VedaAI Logo" className="w-8 h-8 object-contain" />
        <span className="font-semibold text-xl tracking-tight text-gray-900">VedaAI</span>
      </div>

      <div className="px-5 mb-6">
        <Link
          href="/assignments/new"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-full transition-colors font-medium text-sm bg-[#2a2a2a] text-white hover:bg-black shadow-[0_0_0_2px_rgba(234,88,12,0.3)]"
        >
          <Sparkles className="w-4 h-4 text-white" />
          Create Assignment
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.name === "Assignments" && pathname.startsWith("/assignments") && pathname !== "/assignments/new");
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={(e) => {
                if (link.disabled) e.preventDefault();
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-gray-100 text-gray-900" 
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-gray-700" : "text-gray-400"}`} />
                {link.name}
              </div>
              {typeof link.badge === "number" && (
                <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg mb-4"
        >
          <Settings className="w-4 h-4 text-gray-400" />
          Settings
        </Link>

        <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-orange-200 overflow-hidden flex-shrink-0">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=monkey" alt="School logo" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-900 truncate">Delhi Public School</p>
            <p className="text-xs text-gray-500 truncate">Bokaro Steel City</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
