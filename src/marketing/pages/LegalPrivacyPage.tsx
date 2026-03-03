import LegalPageLayout from '@/marketing/components/LegalPageLayout';
import { COMPANY, LEGAL_LAST_UPDATED } from '@/marketing/content/company';

const LegalPrivacyPage = () => {
  return (
    <LegalPageLayout
      title="Política de privacidad"
      description={`Información sobre cómo ${COMPANY.name} recopila, utiliza, conserva y protege los datos personales recibidos a través del sitio web.`}
      canonicalPath="/privacidad"
      eyebrow="Protección de datos"
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-semibold text-foreground">1. Responsable del tratamiento</h2>
          <div className="mt-4 space-y-2 text-body">
            <p><span className="text-foreground">Responsable:</span> {COMPANY.name}</p>
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
          <h2 className="text-2xl font-semibold text-foreground">2. Qué datos tratamos</h2>
          <div className="mt-4 space-y-4 text-body">
            <p>
              Podemos tratar datos identificativos y de contacto cuando una persona usuaria se comunica con nosotros: nombre, empresa,
              correo electrónico, teléfono y el contenido del mensaje enviado.
            </p>
            <p>
              También pueden generarse datos técnicos imprescindibles para el funcionamiento del sitio, como registros básicos de
              navegación, seguridad o preferencia de consentimiento almacenada en el navegador.
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-semibold text-foreground">3. Finalidades y legitimación</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-body">
            <li>Atender solicitudes de información, presupuestos y consultas comerciales.</li>
            <li>Gestionar comunicaciones precontractuales o contractuales vinculadas a los servicios ofrecidos.</li>
            <li>Proteger el sitio web, prevenir abusos y mantener la seguridad técnica.</li>
            <li>Registrar la preferencia del banner de cookies o mecanismos equivalentes necesarios para la experiencia de navegación.</li>
          </ul>
          <p className="mt-4 text-body">
            Las bases jurídicas aplicables pueden ser el consentimiento, la ejecución de medidas precontractuales, la relación
            contractual o el interés legítimo en la seguridad y gestión del sitio.
          </p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-semibold text-foreground">4. Conservación y destinatarios</h2>
          <div className="mt-4 space-y-4 text-body">
            <p>
              Los datos se conservarán durante el tiempo necesario para atender la solicitud, mantener la relación profesional y cumplir
              con las obligaciones legales aplicables o defender posibles responsabilidades.
            </p>
            <p>
              No se cederán datos a terceros salvo obligación legal o cuando resulte necesario para la prestación del servicio mediante
              proveedores tecnológicos que actúen como encargados del tratamiento.
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-semibold text-foreground">5. Derechos de las personas interesadas</h2>
          <div className="mt-4 space-y-4 text-body">
            <p>
              Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad
              enviando una solicitud a{' '}
              <a className="underline underline-offset-4 hover:text-foreground" href={`mailto:${COMPANY.email}`}>
                {COMPANY.email}
              </a>.
            </p>
            <p>
              Si consideras que el tratamiento no se ajusta a la normativa, puedes presentar una reclamación ante la Agencia Española de
              Protección de Datos (AEPD).
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-semibold text-foreground">6. Seguridad y enlaces externos</h2>
          <div className="mt-4 space-y-4 text-body">
            <p>
              {COMPANY.name} aplica medidas técnicas y organizativas razonables para proteger los datos frente a accesos no autorizados,
              pérdida, alteración o divulgación indebida.
            </p>
            <p>
              Cuando el sitio enlaza a redes sociales o plataformas externas, el tratamiento posterior de los datos dependerá de las
              políticas propias de dichos terceros.
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-card p-8 lg:col-span-2">
          <h2 className="text-2xl font-semibold text-foreground">7. Actualizaciones de esta política</h2>
          <div className="mt-4 space-y-4 text-body">
            <p>
              Esta política podrá revisarse para adaptarse a cambios normativos, técnicos o funcionales del sitio web. La fecha de última
              revisión permite identificar la versión vigente.
            </p>
            <p>
              Si en el futuro se incorporan nuevas herramientas de analítica, campañas publicitarias, formularios adicionales o
              transferencias internacionales de datos, convendrá actualizar este texto para reflejar ese tratamiento de manera exacta.
            </p>
          </div>
        </article>
      </div>
    </LegalPageLayout>
  );
};

export default LegalPrivacyPage;
