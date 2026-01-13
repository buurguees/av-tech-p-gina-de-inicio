import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const SharkEventsPresentation = lazy(() => import("./pages/presentations/SharkEventsPresentation"));

// NEXO AV pages - lazy loaded
const NexoLogin = lazy(() => import("./pages/nexo_av/Login"));
const NexoAv = lazy(() => import("./pages/nexo_av/nexoav"));
const NexoDashboard = lazy(() => import("./pages/nexo_av/Dashboard"));
const NexoUsersPage = lazy(() => import("./pages/nexo_av/UsersPage"));
const NexoClientsPage = lazy(() => import("./pages/nexo_av/ClientsPage"));
const NexoClientDetailPage = lazy(() => import("./pages/nexo_av/ClientDetailPage"));
const NexoQuotesPage = lazy(() => import("./pages/nexo_av/QuotesPage"));
const NexoQuoteDetailPage = lazy(() => import("./pages/nexo_av/QuoteDetailPage"));
const NexoEditQuotePage = lazy(() => import("./pages/nexo_av/EditQuotePage"));
const NexoNewQuotePage = lazy(() => import("./pages/nexo_av/NewQuotePage"));
const NexoProjectsPage = lazy(() => import("./pages/nexo_av/ProjectsPage"));
const NexoProjectDetailPage = lazy(() => import("./pages/nexo_av/ProjectDetailPage"));
const NexoSettingsPage = lazy(() => import("./pages/nexo_av/SettingsPage"));
const NexoCatalogPage = lazy(() => import("./pages/nexo_av/CatalogPage"));
const NexoProductDetailPage = lazy(() => import("./pages/nexo_av/ProductDetailPage"));
const NexoTaxDetailPage = lazy(() => import("./pages/nexo_av/TaxDetailPage"));
const NexoAuditPage = lazy(() => import("./pages/nexo_av/AuditPage"));
const NexoAuditEventDetailPage = lazy(() => import("./pages/nexo_av/AuditEventDetailPage"));
const NexoCalculatorPage = lazy(() => import("./pages/nexo_av/CalculatorPage"));
const NexoInvoicesPage = lazy(() => import("./pages/nexo_av/InvoicesPage"));
const NexoInvoiceDetailPage = lazy(() => import("./pages/nexo_av/InvoiceDetailPage"));
const NexoNewInvoicePage = lazy(() => import("./pages/nexo_av/NewInvoicePage"));
const NexoEditInvoicePage = lazy(() => import("./pages/nexo_av/EditInvoicePage"));
const NexoNotFound = lazy(() => import("./pages/nexo_av/NotFound"));
const NexoAccountSetup = lazy(() => import("./pages/nexo_av/AccountSetup"));
const NexoLeadMapPage = lazy(() => import("./pages/nexo_av/LeadMapPage"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="min-h-screen bg-background">
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              
              <Route path="/privacidad" element={<PrivacyPolicy />} />
              <Route path="/terminos" element={<TermsAndConditions />} />
              {/* Custom Presentation Routes */}
              <Route path="/sharkevents" element={<SharkEventsPresentation />} />
              {/* NEXO AV Routes */}
              <Route path="/nexo-av" element={<NexoLogin />} />
              <Route path="/nexo-av/setup-account" element={<NexoAccountSetup />} />
              {/* All authenticated routes use the shared layout */}
              <Route path="/nexo-av/:userId" element={<NexoAv />}>
                <Route path="dashboard" element={<NexoDashboard />} />
                <Route path="users" element={<NexoUsersPage />} />
                <Route path="clients" element={<NexoClientsPage />} />
                <Route path="clients/:clientId" element={<NexoClientDetailPage />} />
                <Route path="quotes" element={<NexoQuotesPage />} />
                <Route path="quotes/new" element={<NexoNewQuotePage />} />
                <Route path="quotes/:quoteId" element={<NexoQuoteDetailPage />} />
                <Route path="quotes/:quoteId/edit" element={<NexoEditQuotePage />} />
                <Route path="clients/:clientId/quotes/new" element={<NexoNewQuotePage />} />
                <Route path="projects" element={<NexoProjectsPage />} />
                <Route path="projects/:projectId" element={<NexoProjectDetailPage />} />
                <Route path="settings" element={<NexoSettingsPage />} />
                <Route path="settings/taxes/:taxId" element={<NexoTaxDetailPage />} />
                <Route path="audit" element={<NexoAuditPage />} />
                <Route path="audit/:eventId" element={<NexoAuditEventDetailPage />} />
                <Route path="catalog" element={<NexoCatalogPage />} />
                <Route path="catalog/:productId" element={<NexoProductDetailPage />} />
                <Route path="calculator" element={<NexoCalculatorPage />} />
                <Route path="lead-map" element={<NexoLeadMapPage />} />
                <Route path="invoices" element={<NexoInvoicesPage />} />
                <Route path="invoices/new" element={<NexoNewInvoicePage />} />
                <Route path="invoices/:invoiceId" element={<NexoInvoiceDetailPage />} />
                <Route path="invoices/:invoiceId/edit" element={<NexoEditInvoicePage />} />
                <Route path="*" element={<NexoNotFound />} />
              </Route>
              {/* Legacy route - redirects to login */}
              <Route path="/nexo-av/dashboard" element={<NexoLogin />} />
              <Route path="/nexo-av/*" element={<NexoNotFound />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;