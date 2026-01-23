"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function NavBar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/sessions", label: "Sessions" },
    { href: "/hands", label: "Hands" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--card-border)] px-4 py-2 md:relative md:border-t-0 md:border-b">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="hidden md:block font-bold text-lg">Poker Tracker</div>

        <div className="flex items-center gap-1 w-full md:w-auto justify-around md:justify-center md:gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-lg transition-colors ${
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-[var(--primary)] text-black font-medium"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="hidden md:block text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
