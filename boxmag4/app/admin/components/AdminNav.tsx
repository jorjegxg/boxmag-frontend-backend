"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/orders", label: "Comenzi", match: "/admin/orders" },
  {
    href: "/admin/box-types",
    label: "Tipuri de cutii",
    match: "/admin/box-types",
  },
  {
    href: "/admin/shipping-methods",
    label: "Metode de livrare",
    match: "/admin/shipping-methods",
  },
] as const;

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full bg-white px-6 lg:px-20 pt-4">
      <div className="max-w-7xl mx-auto flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <Link
          href="/admin"
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
            pathname === "/admin"
              ? "bg-my-red text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Panou
        </Link>
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
      </div>
    </nav>
  );
}
