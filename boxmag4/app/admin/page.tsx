"use client";

import Link from "next/link";
import { B2b } from "../global/components/b2b";

const mockOrders = [
  {
    id: "ORD-1024",
    customer: "Luminex Store",
    boxType: "E-commerce Boxes Fefco 703",
    quantity: 1200,
    totalPrice: "2,180.00 EUR",
    status: "Pending",
  },
  {
    id: "ORD-1025",
    customer: "Trendy Hub",
    boxType: "Shipping Box Fefco 427",
    quantity: 800,
    totalPrice: "1,240.00 EUR",
    status: "In Progress",
  },
  {
    id: "ORD-1026",
    customer: "Fresh Bites",
    boxType: "Pizza Box",
    quantity: 2000,
    totalPrice: "1,760.00 EUR",
    status: "Completed",
  },
];

export default function AdminPage() {
  return (
    <div>
      <B2b />

      <section className="w-full bg-white px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            Home
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">Admin</span>
        </div>
      </section>

      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <SectionTitle title="Box Types Management" subtitle="UI only - no functionality yet" />

          <div className="p-6 lg:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Box Type ID" placeholder="e.g. BF10" />
              <Field label="Title" placeholder="e.g. Boxfix Premium 500" />
              <Field label="Price (EUR)" placeholder="e.g. 1.35" />
              <Field label="Photo URL / Object Key" placeholder="e.g. boxes/premium-500.png" />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="bg-my-yellow hover:bg-my-yellow-bright text-black font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Add Box Type
              </button>
              <button
                type="button"
                className="bg-my-red hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Update Selected
              </button>
              <button
                type="button"
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Reset Fields
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-my-light-gray2 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Title</th>
                      <th className="px-4 py-3 text-left font-semibold">Price</th>
                      <th className="px-4 py-3 text-left font-semibold">Photo</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3">1</td>
                      <td className="px-4 py-3">E-commerce Boxes Fefco 703</td>
                      <td className="px-4 py-3">1.20 EUR</td>
                      <td className="px-4 py-3">boxes/ecommerce.png</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-green-100 text-green-700 px-2.5 py-1 text-xs font-medium">
                          Active
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3">2</td>
                      <td className="px-4 py-3">Shipping Box Fefco 427</td>
                      <td className="px-4 py-3">1.55 EUR</td>
                      <td className="px-4 py-3">boxes/felco.png</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-green-100 text-green-700 px-2.5 py-1 text-xs font-medium">
                          Active
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3">3</td>
                      <td className="px-4 py-3">Pizza Box</td>
                      <td className="px-4 py-3">0.88 EUR</td>
                      <td className="px-4 py-3">boxes/pizza.png</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-yellow-100 text-yellow-700 px-2.5 py-1 text-xs font-medium">
                          Draft
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-white px-6 lg:px-20 pb-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <SectionTitle title="Orders" subtitle="Recent orders overview" />

          <div className="p-6 lg:p-8">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-my-light-gray2 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Order ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left font-semibold">Box Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Quantity</th>
                      <th className="px-4 py-3 text-left font-semibold">Total</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockOrders.map((order) => (
                      <tr key={order.id} className="border-t border-gray-200">
                        <td className="px-4 py-3 font-medium">{order.id}</td>
                        <td className="px-4 py-3">{order.customer}</td>
                        <td className="px-4 py-3">{order.boxType}</td>
                        <td className="px-4 py-3">{order.quantity}</td>
                        <td className="px-4 py-3">{order.totalPrice}</td>
                        <td className="px-4 py-3">
                          <OrderStatusBadge status={order.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="bg-my-red w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 sm:pl-8 sm:pr-4 sm:py-4 text-my-white">
      <span className="font-bold text-base sm:text-lg">{title}</span>
      {subtitle ? <span className="text-sm sm:text-base">{subtitle}</span> : null}
    </div>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
      />
    </label>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  if (status === "Completed") {
    return (
      <span className="inline-flex rounded-full bg-green-100 text-green-700 px-2.5 py-1 text-xs font-medium">
        {status}
      </span>
    );
  }

  if (status === "In Progress") {
    return (
      <span className="inline-flex rounded-full bg-blue-100 text-blue-700 px-2.5 py-1 text-xs font-medium">
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-yellow-100 text-yellow-700 px-2.5 py-1 text-xs font-medium">
      {status}
    </span>
  );
}
