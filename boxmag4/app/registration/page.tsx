"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { FaUserPlus } from "react-icons/fa";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red";

export default function RegistrationPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [acceptRegulations, setAcceptRegulations] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: in a real app you would call an API to register
    router.push("/account");
  };

  return (
    <div>
      <B2b />

      {/* Path section */}
      <section className="w-full bg-white px-4 sm:px-6 lg:px-20 pt-6">
        <div className="max-w-4xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            Home
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">Registration</span>
        </div>
      </section>

      {/* Main title: REGISTRATION */}
      <section className="w-full px-4 sm:px-6 lg:px-20 py-8">
        <div className="max-w-4xl mx-auto bg-my-red rounded-lg flex items-center justify-center gap-4 py-6 px-6">
          <FaUserPlus className="w-10 h-10 sm:w-12 sm:h-12 text-white shrink-0" />
          <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wide">
            Registration
          </h1>
        </div>
      </section>

      {/* Registration form */}
      <section className="w-full px-4 sm:px-6 lg:px-20 pb-12">
        <div className="max-w-4xl mx-auto rounded-lg border-2 border-gray-200 bg-white px-6 py-6 sm:px-8 sm:py-8">
          <p className="text-gray-600 text-sm mb-6">
            Create an account to place orders and manage your details. Registration in the Online Store is optional. By registering you accept the{" "}
            <Link href="/regulations" className="text-my-red font-semibold hover:underline">Regulations</Link>.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-email" className="block text-sm font-semibold text-gray-800 mb-1">Email *</label>
                <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} required />
              </div>
              <div>
                <label htmlFor="reg-company" className="block text-sm font-semibold text-gray-800 mb-1">Company Name</label>
                <input id="reg-company" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company Name" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-password" className="block text-sm font-semibold text-gray-800 mb-1">Password *</label>
                <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={inputClass} required minLength={6} />
              </div>
              <div>
                <label htmlFor="reg-confirm" className="block text-sm font-semibold text-gray-800 mb-1">Confirm Password *</label>
                <input id="reg-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className={inputClass} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-firstName" className="block text-sm font-semibold text-gray-800 mb-1">First Name *</label>
                <input id="reg-firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" className={inputClass} required />
              </div>
              <div>
                <label htmlFor="reg-surname" className="block text-sm font-semibold text-gray-800 mb-1">Surname *</label>
                <input id="reg-surname" type="text" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Surname" className={inputClass} required />
              </div>
            </div>
            <div className="max-w-md">
              <label htmlFor="reg-vat" className="block text-sm font-semibold text-gray-800 mb-1">VAT Number</label>
              <input id="reg-vat" type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="VAT Number" className={inputClass} />
            </div>
            <div className="flex items-start gap-3">
              <input id="reg-accept" type="checkbox" checked={acceptRegulations} onChange={(e) => setAcceptRegulations(e.target.checked)} className="mt-1 rounded border-gray-300 text-my-red focus:ring-my-red" />
              <label htmlFor="reg-accept" className="text-sm text-gray-700">
                I have read and accept the <Link href="/regulations" className="text-my-red font-semibold hover:underline">Regulations</Link> and the <Link href="/privacy-policy" className="text-my-red font-semibold hover:underline">Privacy Policy</Link> of the Online Store.
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button type="submit" className="px-6 py-3 rounded-lg bg-my-red text-white font-semibold hover:bg-my-red/90 transition-colors">
                Register
              </button>
              <p className="flex items-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/account" className="ml-1 text-my-red font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
