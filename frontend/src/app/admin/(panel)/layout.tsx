import { AdminToaster } from "@/components/toranjan/admin-toast";

import { AdminShell } from "../admin-shell";

/**
 * A route group, so the URLs stay `/admin`, `/admin/orders` and so on while the
 * login page — which sits outside it — renders without a shell that would only
 * bounce it back to itself.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminToaster>
      <AdminShell>{children}</AdminShell>
    </AdminToaster>
  );
}
