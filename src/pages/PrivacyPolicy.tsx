import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logoAvtech from '@/assets/logo-avtech-white.png';
import Footer from '@/components/Footer';

const COMPANY = {
  name: 'AV TECH ESDEVENIMENTS S.L.',
  nif: 'B75835728',
  email: 'info@avtechesdeveniments.com',
  phone: '+34 699 566 601',
  address: 'C/ Francesc Hombravella Maristany, 13, 08320, El Masnou, Barcelona, España',
};

function formatDateEs(date: Date) {
  return new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

const PrivacyPolicy = () => {
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
            Política de Privacidad
          </h1>
          <p className="mt-4 font-mono text-sm text-muted-foreground">
            Última actualización: {lastUpdated}
          </p>
          <p className="mt-6 font-mono text-base text-muted-foreground leading-relaxed max-w-3xl">
            Esta Política de Privacidad describe cómo {COMPANY.name} trata los datos personales de las personas usuarias cuando contactan con nosotros o navegan por este sitio web.
          </p>
        </div>

        <section className="space-y-10">
          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">1. Responsable del tratamiento</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed space-y-1">
              <p><span className="text-foreground">Razón social:</span> {COMPANY.name}</p>
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
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">2. Qué datos tratamos</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed space-y-3">
              <p>
                Dependiendo de cómo interactúes con nosotros, podemos tratar datos identificativos y de contacto (por ejemplo, nombre, empresa, correo electrónico, teléfono) y el contenido del mensaje que nos envíes.
              </p>
              <p>
                Este sitio web puede incluir enlaces a redes sociales (por ejemplo, Instagram). Si accedes a dichos enlaces, el tratamiento de datos se regirá por la política de privacidad de la plataforma correspondiente.
              </p>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">3. Finalidades del tratamiento</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <ul className="list-disc pl-5 space-y-2">
                <li>Atender consultas, solicitudes de información y comunicaciones recibidas por email, teléfono o mediante el formulario de contacto.</li>
                <li>Gestionar la relación comercial y/o precontractual derivada de tu solicitud.</li>
                <li>Garantizar el funcionamiento técnico y la seguridad del sitio web.</li>
              </ul>
            </div>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">4. Base jurídica (legitimación)</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="text-foreground">Consentimiento:</span> cuando nos contactas voluntariamente y nos facilitas tus datos para responderte.</li>
                <li><span className="text-foreground">Interés legítimo:</span> para mantener la seguridad del sitio web y prevenir usos indebidos.</li>
                <li><span className="text-foreground">Ejecución de medidas precontractuales/contractuales:</span> cuando la consulta se refiere a la prestación de servicios.</li>
              </ul>
            </div>
          </div>

          {/* Section 5 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">5. Conservación de los datos</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                Conservaremos los datos durante el tiempo necesario para atender tu solicitud y, posteriormente, durante los plazos exigidos por la normativa aplicable o mientras puedan derivarse responsabilidades.
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">6. Destinatarios</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                No comunicamos tus datos a terceros salvo obligación legal o cuando sea necesario para la prestación del servicio (por ejemplo, proveedores tecnológicos/hosting), actuando en todo caso bajo acuerdos de confidencialidad y encargo de tratamiento.
              </p>
            </div>
          </div>

          {/* Section 7 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">7. Derechos de las personas usuarias</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed space-y-3">
              <p>
                Puedes solicitar el ejercicio de tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a{' '}
                <a className="underline underline-offset-4 hover:text-foreground transition-colors" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
              </p>
              <p>
                Si consideras que tus derechos no han sido atendidos adecuadamente, puedes presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) en{' '}
                <a className="underline underline-offset-4 hover:text-foreground transition-colors" href="https://www.aepd.es/" target="_blank" rel="noreferrer">https://www.aepd.es/</a>.
              </p>
            </div>
          </div>

          {/* Section 8 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">8. Seguridad</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                Aplicamos medidas razonables para proteger la información y reducir el riesgo de acceso, uso o divulgación no autorizados.
              </p>
            </div>
          </div>

          {/* Section 9 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">9. Cookies y almacenamiento local</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed space-y-3">
              <p>
                Este sitio web utiliza elementos técnicos necesarios para su funcionamiento. Además, guardamos tu elección del banner de cookies en el almacenamiento local de tu navegador (localStorage) para no volver a mostrarlo en cada visita.
              </p>
              <p>
                Puedes eliminar cookies y datos del sitio desde la configuración de tu navegador. Si los eliminas, el banner podrá mostrarse de nuevo.
              </p>
            </div>
          </div>

          {/* Section 10 */}
          <div className="space-y-3">
            <h2 className="font-mono text-xl sm:text-2xl font-semibold text-foreground">10. Cambios en esta política</h2>
            <div className="font-mono text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                Podemos actualizar esta política para reflejar cambios legales o técnicos. La fecha de "Última actualización" indica cuándo fue revisada.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
