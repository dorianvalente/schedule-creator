import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { CalendarDays, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [{ to: "/", label: "Schedule", icon: CalendarDays, end: true }];

const ADMIN_ITEM = { to: "/admin", label: "Admin", icon: ShieldCheck, end: false };

export default function Layout() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => setIsAdmin(u?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  const items = isAdmin ? [...navItems, ADMIN_ITEM] : navItems;

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      <header className="sticky top-0 z-30 bg-[#111111] text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-[#111111]">
              <CalendarDays className="h-4 w-4" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Schedule Creator</span>
          </div>
          <nav className="flex items-center gap-1">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-[#111111]"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}