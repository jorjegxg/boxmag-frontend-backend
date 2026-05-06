"use client";

import React, { useState } from "react";
import Link from "next/link";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { FaCheckCircle, FaUserPlus } from "react-icons/fa";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red";

const isDevelopment = process.env.NODE_ENV === "development";

export default function RegistrationPage() {
  const [email, setEmail] = useState(
    isDevelopment ? "yotrevorgxg@gmail.com" : "",
  );
  const [password, setPassword] = useState(isDevelopment ? "dummy123" : "");
  const [confirmPassword, setConfirmPassword] = useState(
    isDevelopment ? "dummy123" : "",
  );
  const [firstName, setFirstName] = useState(isDevelopment ? "Ion" : "");
  const [surname, setSurname] = useState(isDevelopment ? "Popescu" : "");
  const [companyName, setCompanyName] = useState(
    isDevelopment ? "Boxmag Test SRL" : "",
  );
  const [phone, setPhone] = useState(isDevelopment ? "+40 700 000 000" : "");
  const [vatNumber, setVatNumber] = useState(isDevelopment ? "RO12345678" : "");
  const [acceptRegulations, setAcceptRegulations] = useState(isDevelopment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const backendBaseUrl = React.useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setFeedback({ kind: "error", message: "Email is required." });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({ kind: "error", message: "Passwords do not match." });
      return;
    }

    if (!acceptRegulations) {
      setFeedback({
        kind: "error",
        message: "You must accept the Regulations and Privacy Policy.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`${backendBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          firstName,
          surname,
          companyName,
          vatNumber,
          phone,
          acceptRegulations: true,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? "Registration failed");
      }

      setFeedback({
        kind: "success",
        message:
          "Account created. Check your email and click the verification link before signing in.",
      });
      setRegisteredEmail(normalizedEmail);
      setIsRegistered(true);
    } catch (error) {
      setIsRegistered(false);
      setRegisteredEmail("");
      setFeedback({
        kind: "error",
        message:
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Failed to register account",
      });
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-phone" className="block text-sm font-semibold text-gray-800 mb-1">Phone Number</label>
                <input id="reg-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+40 700 000 000" className={inputClass} />
              </div>
              <div>
                <label htmlFor="reg-vat" className="block text-sm font-semibold text-gray-800 mb-1">VAT Number</label>
                <input id="reg-vat" type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="VAT Number" className={inputClass} />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <input id="reg-accept" type="checkbox" checked={acceptRegulations} onChange={(e) => setAcceptRegulations(e.target.checked)} className="mt-1 rounded border-gray-300 text-my-red focus:ring-my-red" />
              <label htmlFor="reg-accept" className="text-sm text-gray-700">
                I have read and accept the <Link href="/regulations" className="text-my-red font-semibold hover:underline">Regulations</Link> and the <Link href="/privacy-policy" className="text-my-red font-semibold hover:underline">Privacy Policy</Link> of the Online Store.
              </label>
            </div>
            {feedback?.kind === "error" ? (
              <p
                className="text-sm text-red-700 font-medium"
              >
                {feedback.message}
              </p>
            ) : null}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button type="submit" disabled={isSubmitting || isRegistered} className="px-6 py-3 rounded-lg bg-my-red text-white font-semibold hover:bg-my-red/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                {isSubmitting ? "Registering..." : "Register"}
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
      {isRegistered ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 sm:px-8">
              <div className="flex items-center gap-3">
                <FaCheckCircle className="h-7 w-7 text-green-600" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
                    Registration Successful
                  </p>
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    Confirm your email
                  </h2>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-7">
              <p className="text-sm text-gray-600 sm:text-base">
                We sent a verification link to the address below. Please open your inbox and
                confirm your account before signing in.
              </p>

              <div className="mt-4 rounded-xl border border-my-red/30 bg-my-red/5 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Verification email
                </p>
                <p className="mt-1 break-all text-base font-semibold text-my-red sm:text-lg">
                  {registeredEmail}
                </p>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Continue browsing
                </Link>
                <Link
                  href="/account"
                  className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-my-red/90 transition-colors"
                >
                  Go to sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
