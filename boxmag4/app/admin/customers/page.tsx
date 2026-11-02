"use client";

import { useState } from "react";
import { AdminBreadcrumb, SectionTitle } from "../components/admin-ui";
import {
  AdminPagination,
  adminInputClass,
  useAdminList,
  useDebouncedValue,
} from "../components/admin-list";
import { formatAdminDate } from "../admin-ro";

type AdminCustomer = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  vatNumber: string;
  phone: string;
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  ordersCount: number;
};

const CUSTOMERS_PAGE_SIZE = 20;

export default function AdminCustomersPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const { items, total, page, setPage, isLoading, error } = useAdminList<AdminCustomer>(
    "/api/customers",
    { q: search },
    CUSTOMERS_PAGE_SIZE,
  );

  return (
    <div>
      <AdminBreadcrumb current="Clienți" />

      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <SectionTitle title="Clienți" subtitle="Conturi de client înregistrate" />

          <div className="p-6 lg:p-8 space-y-6">
            <label className="block text-sm text-gray-700">
              <span className="block mb-1 font-semibold">Caută</span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Email, nume, companie sau cod TVA"
                className={adminInputClass}
              />
            </label>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-my-light-gray2 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Client</th>
                      <th className="px-4 py-3 text-left font-semibold">Email</th>
                      <th className="px-4 py-3 text-left font-semibold">Companie</th>
                      <th className="px-4 py-3 text-left font-semibold">Cod TVA</th>
                      <th className="px-4 py-3 text-left font-semibold">Telefon</th>
                      <th className="px-4 py-3 text-left font-semibold">Comenzi</th>
                      <th className="px-4 py-3 text-left font-semibold">Creat</th>
                      <th className="px-4 py-3 text-left font-semibold">Ultima logare</th>
                      <th className="px-4 py-3 text-left font-semibold">Stare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={9}>
                          Se încarcă clienții...
                        </td>
                      </tr>
                    ) : null}
                    {!isLoading && error ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-red-600" colSpan={9}>
                          Eroare la încărcarea clienților: {error}
                        </td>
                      </tr>
                    ) : null}
                    {!isLoading && !error && items.length === 0 ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={9}>
                          {search ? "Niciun client nu corespunde căutării." : "Nu există clienți."}
                        </td>
                      </tr>
                    ) : null}
                    {!isLoading && !error
                      ? items.map((customer) => (
                          <tr key={customer.id} className="border-t border-gray-200">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {[customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
                                "—"}
                            </td>
                            <td className="px-4 py-3 text-my-red">
                              <a href={`mailto:${customer.email}`} className="hover:underline">
                                {customer.email}
                              </a>
                            </td>
                            <td className="px-4 py-3">{customer.companyName || "—"}</td>
                            <td className="px-4 py-3">{customer.vatNumber || "—"}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{customer.phone || "—"}</td>
                            <td className="px-4 py-3">{customer.ordersCount}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                              {formatAdminDate(customer.createdAt)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                              {customer.lastLoginAt ? formatAdminDate(customer.lastLoginAt) : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
                                  customer.isActive && customer.emailVerifiedAt
                                    ? "text-green-700 bg-green-50"
                                    : "text-yellow-700 bg-yellow-50"
                                }`}
                              >
                                {!customer.emailVerifiedAt
                                  ? "Neverificat"
                                  : customer.isActive
                                    ? "Activ"
                                    : "Inactiv"}
                              </span>
                            </td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            </div>

            {!error ? (
              <AdminPagination
                page={page}
                total={total}
                pageSize={CUSTOMERS_PAGE_SIZE}
                isLoading={isLoading}
                itemLabel="clienți"
                onPageChange={setPage}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
