import { Mail, Phone, MapPin, Instagram, Linkedin, Youtube } from 'lucide-react';
import logoAvtech from '@/assets/logo-avtech-white.png';

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
                href="#"
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              <a
                href="#"
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              <a
                href="#"
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4 md:w-5 md:h-5" />
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
                <MapPin className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-xs md:text-sm">
                  Barcelona, España
                </span>
              </li>
              <li className="flex items-center gap-2 md:gap-3">
                <Phone className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0" />
                <a
                  href="tel:+34900000000"
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
                >
                  +34 900 000 000
                </a>
              </li>
              <li className="flex items-center gap-2 md:gap-3">
                <Mail className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0" />
                <a
                  href="mailto:info@avtech.es"
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
                >
                  info@avtech.es
                </a>
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
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
            >
              Privacidad
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
            >
              Términos
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;