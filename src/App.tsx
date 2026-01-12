import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";

import NexoLogin from "./pages/nexo_av/Login";
import NexoDashboard from "./pages/nexo_av/Dashboard";
import NexoUsersPage from "./pages/nexo_av/UsersPage";
import NexoClientsPage from "./pages/nexo_av/ClientsPage";
import NexoClientDetailPage from "./pages/nexo_av/ClientDetailPage";
import NexoQuotesPage from "./pages/nexo_av/QuotesPage";
import NexoQuoteDetailPage from "./pages/nexo_av/QuoteDetailPage";
import NexoEditQuotePage from "./pages/nexo_av/EditQuotePage";
import NexoNewQuotePage from "./pages/nexo_av/NewQuotePage";
import NexoProjectsPage from "./pages/nexo_av/ProjectsPage";
import NexoProjectDetailPage from "./pages/nexo_av/ProjectDetailPage";
import NexoSettingsPage from "./pages/nexo_av/SettingsPage";
import NexoCatalogPage from "./pages/nexo_av/CatalogPage";
import NexoProductDetailPage from "./pages/nexo_av/ProductDetailPage";
import NexoTaxDetailPage from "./pages/nexo_av/TaxDetailPage";
import NexoAuditPage from "./pages/nexo_av/AuditPage";
import NexoAuditEventDetailPage from "./pages/nexo_av/AuditEventDetailPage";
import NexoCalculatorPage from "./pages/nexo_av/CalculatorPage";
import NexoInvoicesPage from "./pages/nexo_av/InvoicesPage";
import NexoInvoiceDetailPage from "./pages/nexo_av/InvoiceDetailPage";
import NexoNewInvoicePage from "./pages/nexo_av/NewInvoicePage";
import NexoEditInvoicePage from "./pages/nexo_av/EditInvoicePage";
import NexoNotFound from "./pages/nexo_av/NotFound";
import NexoAccountSetup from "./pages/nexo_av/AccountSetup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="min-h-screen bg-background">
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            
            <Route path="/privacidad" element={<PrivacyPolicy />} />
            <Route path="/terminos" element={<TermsAndConditions />} />
            {/* NEXO AV Routes */}
            <Route path="/nexo-av" element={<NexoLogin />} />
            <Route path="/nexo-av/setup-account" element={<NexoAccountSetup />} />
            <Route path="/nexo-av/:userId/dashboard" element={<NexoDashboard />} />
            <Route path="/nexo-av/:userId/users" element={<NexoUsersPage />} />
            <Route path="/nexo-av/:userId/clients" element={<NexoClientsPage />} />
            <Route path="/nexo-av/:userId/clients/:clientId" element={<NexoClientDetailPage />} />
            <Route path="/nexo-av/:userId/quotes" element={<NexoQuotesPage />} />
            <Route path="/nexo-av/:userId/quotes/new" element={<NexoNewQuotePage />} />
            <Route path="/nexo-av/:userId/quotes/:quoteId" element={<NexoQuoteDetailPage />} />
            <Route path="/nexo-av/:userId/quotes/:quoteId/edit" element={<NexoEditQuotePage />} />
            <Route path="/nexo-av/:userId/clients/:clientId/quotes/new" element={<NexoNewQuotePage />} />
            <Route path="/nexo-av/:userId/projects" element={<NexoProjectsPage />} />
            <Route path="/nexo-av/:userId/projects/:projectId" element={<NexoProjectDetailPage />} />
            <Route path="/nexo-av/:userId/settings" element={<NexoSettingsPage />} />
            <Route path="/nexo-av/:userId/settings/taxes/:taxId" element={<NexoTaxDetailPage />} />
            <Route path="/nexo-av/:userId/audit" element={<NexoAuditPage />} />
            <Route path="/nexo-av/:userId/audit/:eventId" element={<NexoAuditEventDetailPage />} />
            <Route path="/nexo-av/:userId/catalog" element={<NexoCatalogPage />} />
            <Route path="/nexo-av/:userId/catalog/:productId" element={<NexoProductDetailPage />} />
            <Route path="/nexo-av/:userId/calculator" element={<NexoCalculatorPage />} />
            <Route path="/nexo-av/:userId/invoices" element={<NexoInvoicesPage />} />
            <Route path="/nexo-av/:userId/invoices/new" element={<NexoNewInvoicePage />} />
            <Route path="/nexo-av/:userId/invoices/:invoiceId" element={<NexoInvoiceDetailPage />} />
            <Route path="/nexo-av/:userId/invoices/:invoiceId/edit" element={<NexoEditInvoicePage />} />
            <Route path="/nexo-av/:userId/*" element={<NexoNotFound />} />
            {/* Legacy route - redirects to login */}
            <Route path="/nexo-av/dashboard" element={<NexoLogin />} />
            <Route path="/nexo-av/*" element={<NexoNotFound />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;