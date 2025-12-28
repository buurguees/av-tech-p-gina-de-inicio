import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    { label: 'Inicio', href: '#inicio' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Cómo funciona', href: '#como-funciona' },
    { label: 'Contacto', href: '#contacto' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'glass py-3' : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-4 md:px-8">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <a href="#inicio" className="relative z-10">
            <img
              src={logoAvtech}
              alt="AV TECH"
              className="h-8 md:h-10 w-auto"
            />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground hover-underline transition-colors duration-300"
              >
                {link.label}
              </a>
            ))}
            <Button variant="hero-outline" size="sm">
              Solicitar Demo
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden relative z-10 p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>

          {/* Mobile Menu */}
          <div
            className={`fixed inset-0 bg-background/98 backdrop-blur-xl flex flex-col items-center justify-center gap-8 transition-all duration-500 md:hidden ${
              isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-medium text-foreground hover:text-muted-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Button
              variant="hero"
              size="lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Solicitar Demo
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;