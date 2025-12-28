import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import logoAvtech from '@/assets/logo-avtech-white.png';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Alcance', href: '#alcance' },
    { label: 'Proyectos', href: '#proyectos' },
    { label: 'Productos', href: '#productos' },
    { label: 'Sobre Nosotros', href: '#sobre-nosotros' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'border-b border-border/50 py-4' : 'py-6'
      }`}
    >
      <div className="container mx-auto px-6">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <a href="#inicio" className="relative z-10">
            <img
              src={logoAvtech}
              alt="AV TECH"
              className="h-6 md:h-8 w-auto"
            />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300 tracking-wide uppercase"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contacto"
              className="text-xs text-foreground border-b border-foreground pb-0.5 tracking-wide uppercase"
            >
              Contáctanos
            </a>
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

          {/* Mobile Menu */}
          <div
            className={`fixed inset-0 bg-background flex flex-col items-center justify-center gap-8 transition-all duration-300 md:hidden ${
              isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wide"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contacto"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-lg text-foreground border-b border-foreground pb-1 uppercase tracking-wide"
            >
              Contáctanos
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
