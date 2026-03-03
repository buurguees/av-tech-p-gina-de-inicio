import { useState } from 'react';
import { CookieConsent, Footer, Header, Hero, LoadingScreen } from '@/marketing/components';
import SeoHead from '@/marketing/components/SeoHead';
import { Alcance, Contacto, Productos, Proyectos, SobreNosotros } from '@/marketing/components/sections';

const HomePage = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <SeoHead
        title="AV TECH | Digital Signage Profesional, Pantallas LED y Soluciones Audiovisuales"
        description="AV TECH ESDEVENIMENTS diseña e instala soluciones de digital signage, pantallas LED y proyectos audiovisuales profesionales para retail, oficinas, restauración y espacios corporativos."
        canonicalPath="/"
      />
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
