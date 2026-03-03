import { ReactNode, useEffect } from 'react';
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoAvtech from '@/assets/logo-avtech-white.png';
import Footer from '@/marketing/components/Footer';
import SeoHead from '@/marketing/components/SeoHead';
import { COMPANY } from '@/marketing/content/company';

type LegalPageLayoutProps = {
  title: string;
  description: string;
  canonicalPath: string;
  eyebrow: string;
  lastUpdated: string;
  children: ReactNode;
};

const LegalPageLayout = ({
  title,
  description,
  canonicalPath,
  eyebrow,
  lastUpdated,
  children,
}: LegalPageLayoutProps) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead title={title} description={description} canonicalPath={canonicalPath} />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between px-6 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-4">
            <img src={logoAvtech} alt="AV TECH" className="h-6 w-auto md:h-8" />
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1160px] px-6 py-16 sm:px-8 sm:py-20">
        <section className="grid gap-8 border-b border-white/10 pb-12 lg:grid-cols-[minmax(0,1.35fr)_320px] lg:items-end">
          <div>
            <p className="text-caption mb-4">{eyebrow}</p>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-body">{description}</p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span className="rounded-full border border-white/10 px-3 py-2">Última revisión: {lastUpdated}</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Información corporativa validada</span>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-caption mb-4">Datos del titular</p>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="text-foreground">{COMPANY.name}</p>
                <p>NIF {COMPANY.nif}</p>
              </div>
              <a
                href={`mailto:${COMPANY.email}`}
                className="flex items-start gap-3 transition-colors hover:text-foreground"
              >
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{COMPANY.email}</span>
              </a>
              <a
                href={`tel:${COMPANY.phoneHref}`}
                className="flex items-start gap-3 transition-colors hover:text-foreground"
              >
                <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{COMPANY.phone}</span>
              </a>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{COMPANY.address}</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="pt-10 sm:pt-14">{children}</section>
      </main>

      <Footer />
    </div>
  );
};

export default LegalPageLayout;
