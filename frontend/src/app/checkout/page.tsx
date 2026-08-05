import type { Metadata } from "next";

import { CheckoutForm } from "@/components/toranjan/checkout-form";

export const metadata: Metadata = {
  title: "ثبت سفارش — ترنجان",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24 pt-10 sm:px-8">
      <h1 className="mb-9 text-3xl font-light tracking-tight">ثبت سفارش</h1>
      <CheckoutForm />
    </main>
  );
}
