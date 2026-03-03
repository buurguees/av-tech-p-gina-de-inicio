import LegalPageLayout from '@/marketing/components/LegalPageLayout';
import { COMPANY, LEGAL_LAST_UPDATED } from '@/marketing/content/company';

const LegalTermsPage = () => {
  return (
    <LegalPageLayout
      title="Términos y condiciones de uso"
      description={`Condiciones legales que regulan el acceso, navegación y utilización del sitio web corporativo de ${COMPANY.name}.`}
      canonicalPath="/terminos"
      eyebrow="Marco legal del sitio web"
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-semibold text-foreground">1. Identificación del titular</h2>
          <div className="mt-4 space-y-2 text-body">
            <p><span className="text-foreground">Titular:</span> {COMPANY.name}</p>
            <p><span className="text-foreground">NIF:</span> {COMPANY.nif}</p>
            <p><span className="text-foreground">Domicilio:</span> {COMPANY.address}</p>
            <p>
              <span className="text-foreground">Correo electrónico:</span>{' '}
              <a className="underline underline-offset-4 hover:text-foreground" href={`mailto:${COMPANY.email}`}>
                {COMPANY.email}
              </a>
            </p>
            <p>
              <span className="text-foreground">Teléfono:</span>{' '}
              <a className="underline underline-offset-4 hover:text-foreground" href={`tel:${COMPANY.phoneHref}`}>
                {COMPANY.phone}
              </a>
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-semibold text-foreground">2. Objeto y alcance</h2>
          <div className="mt-4 space-y-4 text-body">
            <p>
              Este sitio web tiene finalidad informativa y comercial. Su objetivo es presentar los servicios, proyectos y soluciones
              audiovisuales de {COMPANY.name}, así como habilitar canales de contacto profesional.
            </p>
            <p>
              El acceso al sitio es gratuito, salvo el coste de conexión a través del proveedor de internet de cada persona usuaria.
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-semibold text-foreground">3. Condiciones de uso</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-body">
            <li>La persona usuaria se compromete a utilizar el sitio de forma lícita, diligente y conforme a la buena fe.</li>
            <li>No está permitido alterar, bloquear, sobrecargar o perjudicar el funcionamiento del sitio web.</li>
            <li>No se permite introducir malware, automatismos abusivos ni realizar acciones que comprometan la seguridad.</li>
            <li>La información facilitada a través de formularios o correo debe ser veraz y mantenerse actualizada.</li>
          </ul>
        </article>

        <article className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-semibold text-foreground">4. Propiedad intelectual e industrial</h2>
          <div className="mt-4 space-y-4 text-body">
            <p>
              Los textos, diseños, imágenes, marcas, logotipos, código fuente y demás elementos del sitio están protegidos por la
              normativa de propiedad intelectual e industrial.
            </p>
            <p>
              Queda prohibida su reproducción, distribución, comunicación pública, transformación o reutilización sin autorización
              previa y por escrito, salvo en los casos expresamente permitidos por la ley.
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-semibold text-foreground">5. Exclusión de garantías y responsabilidad</h2>
          <div className="mt-4 space-y-4 text-body">
            <p>
              {COMPANY.name} adopta medidas razonables para mantener el contenido actualizado y el sitio disponible, pero no garantiza
              la ausencia absoluta de errores, interrupciones o incidencias técnicas.
            </p>
            <p>
              En la medida permitida por la legislación aplicable, no será responsable de daños derivados del acceso, uso o imposibilidad
              de uso del sitio, ni del contenido de terceros enlazados desde esta web.
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-semibold text-foreground">6. Enlaces externos y comunicaciones</h2>
          <div className="mt-4 space-y-4 text-body">
            <p>
              Este sitio puede incluir enlaces a redes sociales u otras páginas de terceros. {COMPANY.name} no controla sus contenidos ni
              sus políticas, por lo que el acceso se realiza bajo la responsabilidad de cada persona usuaria.
            </p>
            <p>
              El envío de consultas mediante formularios, teléfono o correo electrónico no constituye por sí mismo una relación
              contractual. Cualquier contratación se formalizará por los canales y documentos específicos que procedan.
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-semibold text-foreground">7. Modificaciones y ley aplicable</h2>
          <div className="mt-4 space-y-4 text-body">
            <p>
              {COMPANY.name} podrá actualizar estas condiciones cuando resulte necesario por motivos legales, técnicos o operativos. La
              fecha de última revisión identifica la versión vigente en cada momento.
            </p>
            <p>
              Estas condiciones se rigen por la legislación española. Cualquier controversia se someterá a los juzgados y tribunales
              competentes conforme a derecho.
            </p>
          </div>
        </article>
      </div>
    </LegalPageLayout>
  );
};

export default LegalTermsPage;
