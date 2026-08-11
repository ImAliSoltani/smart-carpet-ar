import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderDetail } from "./order-detail";

export const metadata: Metadata = { title: "سفارش" };

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  // A non-numeric id can never match an order, so it is a 404 rather than a
  // request that will fail: `Number("abc")` is `NaN`, and `NaN === NaN` is
  // false, so it would otherwise fall through to «this order was not found»
  // after a round trip.
  if (!Number.isInteger(orderId) || orderId < 1) notFound();

  return <OrderDetail orderId={orderId} />;
}
