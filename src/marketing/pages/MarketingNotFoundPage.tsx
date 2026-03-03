import { ArrowLeft, FileText, Home, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import SeoHead from '@/marketing/components/SeoHead';

const MarketingNotFoundPage = () => {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:px-8">
      <SeoHead
        title="Página no encontrada | AV TECH"
        description="La URL solicitada no existe o ha cambiado. Accede al inicio de AV TECH o utiliza nuestros canales de contacto."
        canonicalPath="/404"
        robots="noindex, nofollow"
      />

      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[1160px] items-center">
        <section className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-card p-8 sm:p-10">
            <p className="text-caption mb-4">Error 404</p>
            <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">Ruta no disponible</h1>
            <p className="mt-6 max-w-2xl text-body">
              La página que intentas abrir no existe, ha cambiado de ubicación o la URL introducida no es correcta.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85"
              >
                <Home className="h-4 w-4" />
                Ir al inicio
              </Link>
              <a
                href="/#contacto"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
                Contacto
              </a>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 sm:p-10">
            <p className="text-caption mb-4">Accesos útiles</p>
            <div className="space-y-3">
              <Link
                to="/terminos"
                className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="inline-flex items-center gap-3">
                  <FileText className="h-4 w-4" />
                  Términos y condiciones
                </span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
              <Link
                to="/privacidad"
                className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="inline-flex items-center gap-3">
                  <FileText className="h-4 w-4" />
                  Política de privacidad
                </span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
};

export default MarketingNotFoundPage;
