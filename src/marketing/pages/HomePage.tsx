import { useState } from 'react';
import Header from '@/marketing/components/Header';
import Hero from '@/marketing/components/Hero';
import Alcance from '@/marketing/components/sections/Alcance';
import Proyectos from '@/marketing/components/sections/Proyectos';
import Productos from '@/marketing/components/sections/Productos';
import SobreNosotros from '@/marketing/components/sections/SobreNosotros';
import Contacto from '@/marketing/components/sections/Contacto';
import Footer from '@/marketing/components/Footer';
import LoadingScreen from '@/marketing/components/LoadingScreen';
import CookieConsent from '@/marketing/components/CookieConsent';

const HomePage = () => {
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

export default HomePage;
