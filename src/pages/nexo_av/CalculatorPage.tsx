import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Calculator, Loader2, Construction } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { createMobilePage } from './MobilePageWrapper';
import { lazy } from 'react';

// Lazy load mobile version
const CalculatorPageMobile = lazy(() => import('./mobile/CalculatorPageMobile'));

const CalculatorPageDesktop = () => {
  return (
    <div className="w-full">
      <div className="w-full px-3 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
          <div className="p-4 rounded-full bg-orange-500/10 mb-4 md:mb-6">
            <Construction className="w-12 h-12 text-orange-500" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
            Calculadora en desarrollo
          </h2>
          <p className="text-white/60 text-sm md:text-base max-w-md px-4">
            Próximamente podrás calcular precios, márgenes, dimensiones de pantallas LED y más.
          </p>
          
          <div className="mt-6 md:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 nexo-card-mobile">
              <Calculator className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <p className="text-white text-xs font-medium">Precios + IVA</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 nexo-card-mobile">
              <Calculator className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <p className="text-white text-xs font-medium">Márgenes</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 nexo-card-mobile">
              <Calculator className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <p className="text-white text-xs font-medium">Pantallas LED</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export version with mobile routing
const CalculatorPage = createMobilePage({
  DesktopComponent: CalculatorPageDesktop,
  MobileComponent: CalculatorPageMobile,
});

export default CalculatorPage;
