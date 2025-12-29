import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Instagram } from 'lucide-react';
import logoAvtech from '@/assets/logo-avtech-white.png';

// TikTok icon component (not available in lucide-react)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const Footer = () => {
  return (
    <footer id="contacto" className="bg-card border-t border-border">
      <div className="container mx-auto px-6 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Brand - Full width on mobile */}
          <div className="col-span-2 lg:col-span-1">
            <img src={logoAvtech} alt="AV TECH" className="h-8 md:h-10 w-auto mb-4 md:mb-6" />
            <p className="text-muted-foreground text-sm leading-relaxed mb-4 md:mb-6">
              Transformamos espacios físicos en experiencias visuales de alto
              impacto.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/avtechesdeveniments/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              <a
                href="https://www.tiktok.com/@avtechesdeveniments"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
                aria-label="TikTok"
              >
                <TikTokIcon className="w-4 h-4 md:w-5 md:h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm md:text-base mb-4 md:mb-6">Enlaces</h4>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <a
                  href="#inicio"
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
                >
                  Inicio
                </a>
              </li>
              <li>
                <a
                  href="#proyectos"
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
                >
                  Proyectos
                </a>
              </li>
              <li>
                <a
                  href="#productos"
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
                >
                  Productos
                </a>
              </li>
              <li>
                <a
                  href="#sobre-nosotros"
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
                >
                  Sobre Nosotros
                </a>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-sm md:text-base mb-4 md:mb-6">Servicios</h4>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
                >
                  Pantallas LED
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
                >
                  Contenidos
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
                >
                  Instalación
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
                >
                  Eventos
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm md:text-base mb-4 md:mb-6">Contacto</h4>
            <ul className="space-y-3 md:space-y-4">
              <li className="flex items-start gap-2 md:gap-3">
                <Mail className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0 mt-0.5" />
                <a
                  href="mailto:info@avtechesdeveniments.com"
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm break-all"
                >
                  info@avtechesdeveniments.com
                </a>
              </li>
              <li className="flex items-center gap-2 md:gap-3">
                <Phone className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0" />
                <a
                  href="tel:+34616579640"
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
                >
                  +34 616 579 640
                </a>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <MapPin className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-xs md:text-sm">
                  C/ Francesc Hombravella Maristany, 13
                  <br />
                  08320, El Masnou, Barcelona
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 md:mt-16 pt-6 md:pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-xs md:text-sm text-center md:text-left">
            © {new Date().getFullYear()} AV TECH. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              to="/privacidad"
              className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
            >
              Privacidad
            </Link>
            <Link
              to="/terminos"
              className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
            >
              Términos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;