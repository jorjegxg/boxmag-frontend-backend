import AdminChrome from "./components/AdminChrome";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div lang="ro">
      <AdminChrome>{children}</AdminChrome>
    </div>
  );
}
