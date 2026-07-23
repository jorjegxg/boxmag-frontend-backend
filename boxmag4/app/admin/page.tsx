import Link from "next/link";
import { AdminBreadcrumb } from "./components/admin-ui";

const SECTIONS = [
  {
    href: "/admin/orders",
    title: "Comenzi",
    description: "Vezi și actualizează statusul comenzilor din magazin și B2B.",
  },
  {
    href: "/admin/box-types",
    title: "Tipuri de cutii",
    description: "Adaugă tipuri noi, activează sau ascunde cutiile din catalog.",
  },
  {
    href: "/admin/shipping-methods",
    title: "Metode de livrare",
    description: "Gestionează metodele de livrare afișate la checkout.",
  },
] as const;

export default function AdminHubPage() {
  return (
    <div>
      <AdminBreadcrumb />

      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panou admin</h1>
            <p className="mt-1 text-sm text-gray-600">
              Alege o secțiune pentru a gestiona magazinul.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SECTIONS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="rounded-[20px] border border-black/15 bg-white p-6 transition-colors hover:border-my-red hover:bg-gray-50"
              >
                <h2 className="text-lg font-bold text-my-red">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {section.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
