"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";

/**
 * Client-side data layer.
 *
 * The client is created in state rather than at module scope: on the server a
 * module-level client would be shared by every visitor being rendered at once,
 * and one shopper's cart or filters would land in another's cache.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The catalogue changes when the shopkeeper adds a carpet, not
            // between two clicks; refetching on every focus would only make
            // finished pages flicker.
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) =>
              error instanceof ApiError && !error.isTransient
                ? false // a 404 or a rejected filter answers the same way twice
                : failureCount < 2,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
