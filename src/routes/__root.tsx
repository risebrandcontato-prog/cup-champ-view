import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#0A0A0A" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "APOSTA RESTRITA" },
      { title: "APOSTA RESTRITA — Análises Esportivas Premium" },
      { name: "description", content: "Análises esportivas premium em tempo real. Copa do Mundo 2026 e muito mais." },
      { property: "og:title", content: "APOSTA RESTRITA — Análises Esportivas Premium" },
      { name: "twitter:title", content: "APOSTA RESTRITA — Análises Esportivas Premium" },
      { property: "og:description", content: "Análises esportivas premium em tempo real. Copa do Mundo 2026 e muito mais." },
      { name: "twitter:description", content: "Análises esportivas premium em tempo real. Copa do Mundo 2026 e muito mais." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ae9b7c3a-92cf-442b-9b10-48f3995b3b4c/id-preview-3e9a0ebb--4900223e-cd56-4dad-bb24-1ec9edd287da.lovable.app-1780679091145.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ae9b7c3a-92cf-442b-9b10-48f3995b3b4c/id-preview-3e9a0ebb--4900223e-cd56-4dad-bb24-1ec9edd287da.lovable.app-1780679091145.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/icons/icon-192x192.png" },
      { rel: "apple-touch-icon", href: "/icons/icon-192x192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
