import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { PWAStatusBar } from "@/components/pwa/PWAStatusBar";
import { CopaDrawer } from "@/components/copa/CopaDrawer";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#0A0A0A" },
      { name: "theme-color", content: "#00C853", media: "(prefers-color-scheme: dark)" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "ANÁLISE RESTRITA" },
      { name: "msapplication-TileColor", content: "#00C853" },
      { name: "msapplication-TileImage", content: "/icons/icon-144x144.png" },
      { name: "format-detection", content: "telephone=no" },
      { title: "ANÁLISE RESTRITA — Análises Esportivas Premium" },
      { name: "description", content: "Análises esportivas premium em tempo real. Copa do Mundo 2026 e muito mais." },
      { property: "og:title", content: "ANÁLISE RESTRITA — Análises Esportivas Premium" },
      { name: "twitter:title", content: "ANÁLISE RESTRITA — Análises Esportivas Premium" },
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
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192x192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512x512.png" },
      { rel: "apple-touch-icon", sizes: "152x152", href: "/icons/icon-152x152.png" },
      { rel: "apple-touch-icon", sizes: "192x152", href: "/icons/icon-192x192.png" },
      { rel: "apple-touch-startup-image", href: "/icons/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-arena-black text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-arena-gold mb-4">404</h1>
        <p className="text-arena-text-secondary mb-6">Página não encontrada</p>
        <Link to="/" className="bg-arena-green text-black px-6 py-3 rounded-xl font-bold">
          Voltar para Home
        </Link>
      </div>
    </div>
  ),
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

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[PWA] SW registered:", reg.scope))
        .catch((err) => console.error("[PWA] SW error:", err));
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PWAStatusBar />
      <Outlet />
      <CopaDrawer />
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}