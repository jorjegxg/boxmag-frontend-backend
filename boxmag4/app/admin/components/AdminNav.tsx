"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin/orders", label: "Comenzi", match: "/admin/orders" },
  {
    href: "/admin/box-types",
    label: "Tipuri de cutii și prețuri",
    match: "/admin/box-types",
  },
  {
    href: "/admin/shipping-methods",
    label: "Metode de livrare",
    match: "/admin/shipping-methods",
  },
  {
    href: "/admin/messages",
    label: "Mesaje contact",
    match: "/admin/messages",
  },
  { href: "/admin/customers", label: "Clienți", match: "/admin/customers" },
  { href: "/admin/newsletter", label: "Newsletter", match: "/admin/newsletter" },
] as const;

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  };

  return (
    <nav className="w-full bg-white px-6 lg:px-20 pt-4">
      <div className="max-w-7xl mx-auto flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.match || pathname.startsWith(`${item.match}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-my-red text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className="ml-auto rounded-md px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-60"
        >
          {isLoggingOut ? "Se deconectează..." : "Deconectare"}
        </button>
      </div>
    </nav>
  );
}
