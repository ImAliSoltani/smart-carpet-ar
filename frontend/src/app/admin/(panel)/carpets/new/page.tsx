import type { Metadata } from "next";

import { NewCarpet } from "./new-carpet";

export const metadata: Metadata = { title: "فرش تازه" };

export default function NewCarpetPage() {
  return <NewCarpet />;
}
