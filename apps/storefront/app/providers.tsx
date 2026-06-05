"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LayoutProvider } from "@/contexts/LayoutContext";
import SiteThemeProvider from "@/components/SiteThemeProvider";
import { useDynamicFavicon } from "@/hooks/use-dynamic-favicon";
import { Toaster } from "@/components/ui/toaster";

const SplashScreen = React.lazy(() => import("@/components/SplashScreen"));
const AIChatWidget = React.lazy(() => import("@/components/AIChatWidget"));
const PromoPopup = React.lazy(() => import("@/components/PromoPopup"));

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

function AppContent() {
  useDynamicFavicon();
  return null;
}

function useSplash() {
  const [show, setShow] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, []);
  return show;
}

function ClientShell({ children }: { children: React.ReactNode }) {
  const splash = useSplash();
  return (
    <>
      <React.Suspense fallback={null}>
        <SplashScreen visible={splash} />
      </React.Suspense>
      <SiteThemeProvider />
      <AppContent />
      <React.Suspense fallback={null}>
        <AIChatWidget />
        <PromoPopup />
      </React.Suspense>
      {children}
      <Toaster />
    </>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <LayoutProvider>
                <ClientShell>{children}</ClientShell>
              </LayoutProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
