"use client";

import { ArrowLeft, Bell, LayoutGrid } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();

  let title = "Assignment";
  if (pathname === "/assignments/new") {
    title = "Assignment";
  }

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => router.back()} 
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-gray-400 font-medium">
          <LayoutGrid className="w-4 h-4" />
          <span className="text-sm">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
          <img 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=John" 
            alt="John Doe" 
            className="w-6 h-6 rounded-full bg-gray-100"
          />
          <span className="text-sm font-medium text-gray-700">John Doe</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </header>
  );
}
