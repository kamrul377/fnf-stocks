"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import { visibleNav } from "@/lib/nav";

type NavItem = { href: string; label: string; group?: string };

// মেনু আইটেম ও ক্যাটাগরির জন্য ক্লিন SVG আইকন জেনারেটর
function NavIcon({ name, className = "w-4 h-4 shrink-0" }: { name: string; className?: string }) {
  const k = name.toLowerCase();

  if (k === "/" || k.includes("dashboard") || k.includes("overview")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    );
  }
  if (k.includes("purchase") || k.includes("stock-in") || k.includes("in")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (k.includes("drum") || k.includes("fiber") || k.includes("length") || k.includes("roll")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.03.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.03-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
      </svg>
    );
  }
  if (k.includes("item") || k.includes("product") || k.includes("inventory") || k.includes("stock")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    );
  }
  if (k.includes("issue") || k.includes("assign") || k.includes("out") || k.includes("transfer")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    );
  }
  if (k.includes("return") || k.includes("damage") || k.includes("operation")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (k.includes("report") || k.includes("log") || k.includes("history") || k.includes("audit")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  if (k.includes("user") || k.includes("role") || k.includes("admin") || k.includes("staff")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  }
  if (k.includes("setting") || k.includes("config")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, perms } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDark(localStorage.getItem("theme") === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const nav: NavItem[] = useMemo(() => {
    if (!user) return [];
    return visibleNav(user.role, perms);
  }, [user, perms]);

  const groupedNav = useMemo(() => {
    const groups: Record<string, NavItem[]> = {};

    nav.forEach((item) => {
      let category = item.group;
      if (!category) {
        const key = `${item.href} ${item.label}`.toLowerCase();
        if (key === "/" || key.includes("dashboard")) {
          category = "Overview";
        } else if (
          key.includes("item") ||
          key.includes("purchase") ||
          key.includes("stock") ||
          key.includes("drum") ||
          key.includes("fiber")
        ) {
          category = "Inventory & Stock";
        } else if (
          key.includes("issue") ||
          key.includes("assign") ||
          key.includes("return") ||
          key.includes("damage") ||
          key.includes("transfer")
        ) {
          category = "Operations";
        } else if (
          key.includes("report") ||
          key.includes("log") ||
          key.includes("user") ||
          key.includes("setting") ||
          key.includes("role")
        ) {
          category = "Reports & Admin";
        } else {
          category = "General";
        }
      }

      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });

    return groups;
  }, [nav]);

  const isGroupExpanded = (groupName: string, items: NavItem[]) => {
    if (typeof openGroups[groupName] === "boolean") {
      return openGroups[groupName];
    }
    const hasActive = items.some((i) => i.href === path);
    return hasActive || groupName === "Overview";
  };

  const toggleGroup = (groupName: string, currentExpanded: boolean) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !currentExpanded,
    }));
  };

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-xs md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Always Fixed Left Sidebar (Light & Dark Adaptive) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col border-r transition-all duration-200 ease-in-out ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200/90 dark:border-slate-800 shadow-sm md:shadow-none`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
              F
            </div>
            <div className="leading-tight">
              <span className="font-bold text-[15px] tracking-tight text-slate-900 dark:text-white block">
                FnF Stocks
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Inventory & ISP Ops
              </span>
            </div>
          </Link>

          <button
            onClick={() => setOpen(false)}
            className="md:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
            aria-label="Close Sidebar"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Category-wise Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5">
          {Object.entries(groupedNav).map(([groupName, items]) => {
            const isExpanded = isGroupExpanded(groupName, items);
            const hasActiveChild = items.some((i) => i.href === path);

            if (items.length === 1 && groupName === "Overview") {
              const single = items[0];
              const isActive = path === single.href;
              return (
                <Link
                  key={single.href}
                  href={single.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold tracking-tight transition-all ${isActive
                    ? "bg-brand text-white shadow-xs"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-950 dark:hover:text-white"
                    }`}
                >
                  <NavIcon
                    name={`${single.href} ${single.label}`}
                    className={`w-4 h-4 ${isActive ? "text-white" : "text-brand"}`}
                  />
                  <span className="truncate">{single.label}</span>
                </Link>
              );
            }

            return (
              <div key={groupName} className="space-y-1">
                {/* Category Header Button */}
                <button
                  type="button"
                  onClick={() => toggleGroup(groupName, isExpanded)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors ${hasActiveChild
                    ? "text-brand dark:text-brand bg-brand/5 dark:bg-brand/10"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <NavIcon name={groupName} className="w-3.5 h-3.5 opacity-80" />
                    <span>{groupName}</span>
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : "opacity-70"
                      }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Collapsible Sub-menu Items */}
                {isExpanded && (
                  <div className="pl-2.5 pr-1 py-1 space-y-1 ml-2.5 border-l-2 border-slate-200/80 dark:border-slate-800">
                    {items.map((n) => {
                      const isActive = path === n.href;
                      return (
                        <Link
                          key={n.href}
                          href={n.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] tracking-tight transition-all ${isActive
                            ? "bg-brand text-white font-semibold shadow-xs"
                            : "text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-950 dark:hover:text-white"
                            }`}
                        >
                          <NavIcon
                            name={`${n.href} ${n.label}`}
                            className={`w-4 h-4 ${isActive
                              ? "text-white"
                              : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700"
                              }`}
                          />
                          <span className="truncate">{n.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Bottom User Card */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60">
            <div className="w-8 h-8 rounded-full bg-brand/15 text-brand border border-brand/25 flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user.name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {user.name}
              </p>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {user.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 h-16 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md transition-colors">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <NavIcon name={path} className="w-4 h-4 text-brand" />
              <span className="font-semibold text-sm tracking-tight">
                {nav.find((n) => n.href === path)?.label || "Workspace"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-200">{user.name}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-brand/15 text-brand font-bold uppercase text-[10px]">
                {user.role}
              </span>
            </div>

            <button
              onClick={() => setDark((d) => !d)}
              className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-9 h-9 flex items-center justify-center text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {dark ? "☀️" : "🌙"}
            </button>

            <button
              onClick={() => signOut(auth)}
              className="rounded-full bg-red-500/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-500/20 px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Main Page Content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}