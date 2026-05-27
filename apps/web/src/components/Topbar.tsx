"use client";

import { Bell, Menu } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-5 sm:pt-4">
      <div className="mx-auto flex h-16 items-center justify-between rounded-[24px] bg-white px-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)] sm:px-5 md:px-6">
        <div className="flex items-center gap-3 md:gap-3">
          <div className="flex items-center gap-3 md:hidden">
            <img src="/logo.png" alt="VedaAI" className="h-8 w-8 rounded-xl object-contain" />
            <span className="text-xl font-semibold tracking-tight text-gray-900">VedaAI</span>
          </div>

          <button
            onClick={() => router.back()}
            className="rounded-full p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Go back"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <div className="hidden items-center gap-2 text-gray-400 font-medium md:flex">
          <span className="text-sm">{pathname === "/assignments/new" ? "Assignment" : pathname === "/assignments" ? "Assignments" : "Assignment"}</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 md:bg-transparent md:p-2 md:hover:text-gray-600">
            <Bell className="h-6 w-6 md:h-5 md:w-5" />
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-orange-500 md:h-2 md:w-2 md:border-white"></span>
          </button>

          <div className="flex items-center gap-2 rounded-full bg-white px-1.5 py-1.5 shadow-sm border border-gray-100 md:px-3">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=John"
              alt="John Doe"
              className="h-8 w-8 rounded-full bg-gray-100 object-cover md:h-6 md:w-6"
            />
            <span className="hidden text-sm font-medium text-gray-700 md:inline">John Doe</span>
            <svg className="hidden h-4 w-4 text-gray-400 md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-900 transition-colors hover:bg-gray-100 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-7 w-7" />
          </button>
        </div>
      </div>
    </header>
  );
}
