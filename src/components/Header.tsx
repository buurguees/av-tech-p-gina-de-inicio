import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import logoAvtech from '@/assets/logo-avtech-white.png';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Detectar sección activa
      const sections = ['inicio', 'alcance', 'proyectos', 'productos', 'sobre-nosotros', 'contacto'];
      const scrollPosition = window.scrollY + 150;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { label: 'Alcance', id: 'alcance' },
    { label: 'Proyectos', id: 'proyectos' },
    { label: 'Productos', id: 'productos' },
    { label: 'Sobre Nosotros', id: 'sobre-nosotros' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-background/80 backdrop-blur-md border-b border-border/50 py-4' 
          : 'bg-background/40 backdrop-blur-sm py-6'
      }`}
    >
      <div className="container mx-auto px-6 md:px-8">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => scrollToSection('inicio')}
            className="relative z-10"
          >
            <img
              src={logoAvtech}
              alt="AV TECH"
              className="h-6 md:h-8 w-auto"
            />
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollToSection(link.id)}
                className={`text-xs tracking-wide uppercase transition-colors duration-300 ${
                  activeSection === link.id 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => scrollToSection('contacto')}
              className={`text-xs tracking-wide uppercase transition-colors duration-300 ${
                activeSection === 'contacto'
                  ? 'text-foreground border-b border-foreground pb-0.5'
                  : 'text-foreground border-b border-foreground pb-0.5 opacity-80 hover:opacity-100'
              }`}
            >
              Contáctanos
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden relative z-10 p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* Mobile Menu - Optimized dropdown */}
          <div
            className={`fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border/50 pt-20 pb-6 px-6 transition-all duration-200 md:hidden ${
              isMobileMenuOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-4'
            }`}
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollToSection(link.id)}
                  className={`text-sm uppercase tracking-wide transition-colors text-left py-2 ${
                    activeSection === link.id 
                      ? 'text-foreground' 
                      : 'text-muted-foreground'
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => scrollToSection('contacto')}
                className="text-sm text-foreground border-b border-foreground pb-1 uppercase tracking-wide text-left py-2 w-fit"
              >
                Contáctanos
              </button>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
