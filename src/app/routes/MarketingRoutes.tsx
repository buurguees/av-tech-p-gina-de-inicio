import { lazy } from 'react';
import { Route } from 'react-router-dom';

const HomePage = lazy(() => import('@/marketing/pages/HomePage'));
const PrivacyPolicyPage = lazy(() => import('@/marketing/pages/LegalPrivacyPage'));
const TermsAndConditionsPage = lazy(() => import('@/marketing/pages/LegalTermsPage'));
const SharkEventsPresentation = lazy(() => import('@/pages/presentations/SharkEventsPresentation'));

export const marketingRoutes = (
  <>
    <Route path="/" element={<HomePage />} />
    <Route path="/privacidad" element={<PrivacyPolicyPage />} />
    <Route path="/terminos" element={<TermsAndConditionsPage />} />
    <Route path="/sharkevents" element={<SharkEventsPresentation />} />
  </>
);
