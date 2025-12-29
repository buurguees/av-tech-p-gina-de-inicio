import { useState } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Alcance from '@/components/sections/Alcance';
import Proyectos from '@/components/sections/Proyectos';
import Productos from '@/components/sections/Productos';
import SobreNosotros from '@/components/sections/SobreNosotros';
import Contacto from '@/components/sections/Contacto';

import Footer from '@/components/Footer';
import LoadingScreen from '@/components/LoadingScreen';
import CookieConsent from '@/components/CookieConsent';

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading && <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />}
      {!isLoading && (
        <main className="min-h-screen">
          <Header />
          <Hero />
          <Alcance />
          <Proyectos />
          <Productos />
          <SobreNosotros />
          <Contacto />
          <Footer />
          <CookieConsent />
        </main>
      )}
    </>
  );
};

export default Index;
