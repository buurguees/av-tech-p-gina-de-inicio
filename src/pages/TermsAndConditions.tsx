import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logoAvtech from '@/assets/logo-avtech-white.png';
import Footer from '@/components/Footer';

const COMPANY = {
  name: 'AV TECH ESDEVENIMENTS S.L.',
  nif: 'B75835728',
  email: 'info@avtechesdeveniments.com',
  phone: '+34 616 579 640',
  address: 'C/ Francesc Hombravella Maristany, 13, 08320, El Masnou, Barcelona, España',
};

function formatDateEs(date: Date) {
  return new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

const TermsAndConditions = () => {
  const lastUpdated = formatDateEs(new Date());

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4">
            <img src={logoAvtech} alt="AV TECH" className="h-6 md:h-8 w-auto" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1100px] mx-auto px-6 sm:px-8 py-16 sm:py-20">
        <div className="border-b border-border pb-10 mb-10">
          <h1 className="font-mono text-3xl sm:text-4xl md:text-5xl tracking-tight font-bold text-foreground">
            Términos y Condiciones
          </h1>
          <p className="mt-4 font-mono text-sm text-muted-foreground">
            Última actualización: {lastUpdated}
          </p>
          <p className="mt-6 font-mono text-base text-muted-foreground leading-relaxed max-w-3xl">
            Estos términos regulan el acceso y uso de este sitio web. Si continúas navegando, entiendes y aceptas estas condiciones.
          </p>
        </div>

        <section className="space-y-10">
          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">1. Identificación del titular</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed space-y-1">
              <p><span className="text-foreground">Titular:</span> {COMPANY.name}</p>
              <p><span className="text-foreground">NIF:</span> {COMPANY.nif}</p>
              <p><span className="text-foreground">Domicilio:</span> {COMPANY.address}</p>
              <p>
                <span className="text-foreground">Email:</span>{' '}
                <a className="underline underline-offset-4 hover:text-foreground transition-colors" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
              </p>
              <p>
                <span className="text-foreground">Teléfono:</span>{' '}
                <a className="underline underline-offset-4 hover:text-foreground transition-colors" href={`tel:${COMPANY.phone.replace(/\s/g, '')}`}>{COMPANY.phone}</a>
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">2. Objeto del sitio web</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                Este sitio web tiene un fin informativo y comercial sobre los servicios de {COMPANY.name} y permite contactar con nosotros para solicitar información.
              </p>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">3. Condiciones de uso</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <ul className="list-disc pl-5 space-y-2">
                <li>Te comprometes a hacer un uso lícito, diligente y conforme a la buena fe.</li>
                <li>No debes intentar dañar, deshabilitar, sobrecargar o deteriorar el sitio, ni impedir su uso por otras personas.</li>
                <li>No debes introducir o difundir virus u otros sistemas susceptibles de causar daños.</li>
              </ul>
            </div>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">4. Propiedad intelectual e industrial</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                Los contenidos del sitio web (textos, imágenes, diseños, logotipos, código, etc.) están protegidos por derechos de propiedad intelectual e industrial. Queda prohibida su reproducción, distribución o transformación sin autorización, salvo en los casos permitidos por la ley.
              </p>
            </div>
          </div>

          {/* Section 5 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">5. Enlaces a terceros</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                Este sitio web puede incluir enlaces a páginas de terceros (por ejemplo, redes sociales). {COMPANY.name} no se responsabiliza de los contenidos, políticas o prácticas de dichos sitios.
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">6. Responsabilidad</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                Nos esforzamos por mantener la información actualizada y el sitio disponible, pero no podemos garantizar la ausencia total de errores o interrupciones. En la medida permitida por la normativa aplicable, {COMPANY.name} no será responsable de daños derivados del uso del sitio o de la imposibilidad de acceso.
              </p>
            </div>
          </div>

          {/* Section 7 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">7. Comunicaciones y solicitudes</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                Las comunicaciones enviadas mediante este sitio (por ejemplo, solicitudes de información) no constituyen, por sí mismas, una relación contractual. La contratación de servicios, en su caso, se formalizará por los canales y documentos correspondientes.
              </p>
            </div>
          </div>

          {/* Section 8 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">8. Modificaciones</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                Podemos modificar estos términos cuando sea necesario. La fecha de "Última actualización" indica cuándo fueron revisados.
              </p>
            </div>
          </div>

          {/* Section 9 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">9. Ley aplicable y jurisdicción</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                Estos términos se rigen por la legislación española. Para la resolución de cualquier controversia, las partes se someten a los juzgados y tribunales que resulten competentes conforme a la normativa aplicable.
              </p>
            </div>
          </div>

          {/* Section 10 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">10. Contacto</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                Para cualquier consulta sobre estos términos, puedes escribir a{' '}
                <a className="underline underline-offset-4 hover:text-foreground transition-colors" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TermsAndConditions;
