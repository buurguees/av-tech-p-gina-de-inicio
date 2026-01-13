import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Calculator, Loader2, Construction } from 'lucide-react';
import NexoHeader from './components/NexoHeader';
import MobileBottomNav from './components/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';

export default function CalculatorPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/nexo-av');
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_current_user_info');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const user = data[0];
          
          if (user.user_id !== userId) {
            navigate('/nexo-av');
            return;
          }
        } else {
          navigate('/nexo-av');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        navigate('/nexo-av');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-mobile-nav">
      <NexoHeader
        title="Calculadora"
        userId={userId || ''}
        showBack={false}
      />

      <main className="w-[90%] max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
          <div className={`p-4 ${isMobile ? 'p-3' : 'p-4'} rounded-full bg-orange-500/10 mb-4 md:mb-6`}>
            <Construction className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} text-orange-500`} />
          </div>
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl md:text-2xl'} font-bold text-white mb-2`}>
            Calculadora en desarrollo
          </h2>
          <p className={`text-white/60 ${isMobile ? 'text-sm' : 'text-sm md:text-base'} max-w-md px-4`}>
            Próximamente podrás calcular precios, márgenes, dimensiones de pantallas LED y más.
          </p>
          
          <div className={`mt-6 md:mt-8 grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-3 gap-4'} w-full max-w-2xl`}>
            <div className={`${isMobile ? 'p-4 touch-target' : 'p-4'} rounded-lg bg-white/5 border border-white/10 nexo-card-mobile`}>
              <Calculator className={`${isMobile ? 'w-7 h-7' : 'w-6 h-6'} text-orange-500 mx-auto mb-2`} />
              <p className={`text-white ${isMobile ? 'text-sm' : 'text-xs'} font-medium`}>Precios + IVA</p>
            </div>
            <div className={`${isMobile ? 'p-4 touch-target' : 'p-4'} rounded-lg bg-white/5 border border-white/10 nexo-card-mobile`}>
              <Calculator className={`${isMobile ? 'w-7 h-7' : 'w-6 h-6'} text-orange-500 mx-auto mb-2`} />
              <p className={`text-white ${isMobile ? 'text-sm' : 'text-xs'} font-medium`}>Márgenes</p>
            </div>
            <div className={`${isMobile ? 'p-4 touch-target' : 'p-4'} rounded-lg bg-white/5 border border-white/10 nexo-card-mobile`}>
              <Calculator className={`${isMobile ? 'w-7 h-7' : 'w-6 h-6'} text-orange-500 mx-auto mb-2`} />
              <p className={`text-white ${isMobile ? 'text-sm' : 'text-xs'} font-medium`}>Pantallas LED</p>
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav userId={userId || ''} />
    </div>
  );
}
