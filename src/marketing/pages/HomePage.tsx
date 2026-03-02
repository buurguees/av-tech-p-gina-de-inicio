import { useState } from 'react';
import { CookieConsent, Footer, Header, Hero, LoadingScreen } from '@/marketing/components';
import { Alcance, Contacto, Productos, Proyectos, SobreNosotros } from '@/marketing/components/sections';

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
