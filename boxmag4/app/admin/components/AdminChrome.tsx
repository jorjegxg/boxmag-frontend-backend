"use client";

import { usePathname } from "next/navigation";
import AdminNav from "./AdminNav";

export default function AdminChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showNav = pathname !== "/admin/login";

  return (
    <>
      {showNav ? <AdminNav /> : null}
      {children}
    </>
  );
}
