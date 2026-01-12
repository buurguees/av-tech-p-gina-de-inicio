import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from 'motion/react';
import { 
  Calendar,
  Phone,
  Mail,
  Instagram,
  Globe,
  ChevronDown,
  X,
  Menu
} from 'lucide-react';
import logoAvtech from '@/assets/logos/Logto_AVETCH_Simple_Fondo_Negro_Logo_Blanco.png';

// ============================================
// CONFIGURACIÓN DEL CLIENTE
// ============================================
const CONFIG = {
  clientName: "Shark Events",
  contactPhone: "+34 699 566 601",
  contactEmail: "info@avtechesdeveniments.com",
  website: "www.avtechesdeveniments.com",
  instagram: "avtechesdeveniments",
  instagramDisplay: "@avtechesdeveniments",
  address: "C/ Francesc Hombravella Maristany, 13, 08320, El Masnou, Barcelona",
};

// ============================================
// CUSTOM ICONS - Elementos gráficos profesionales
// ============================================

const GraphicVisualDesign = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF8C00" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#FF4500" stopOpacity="0.9" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" stroke="url(#grad1)" strokeWidth="2" fill="none" opacity="0.3" />
    <path d="M20 32 L32 20 L44 32 L32 44 Z" fill="url(#grad1)" opacity="0.6" />
    <circle cx="32" cy="32" r="8" fill="#FF8C00" />
    <circle cx="32" cy="32" r="4" fill="#fff" />
  </svg>
);

const GraphicLED = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <defs>
      <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF8C00" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#FFA500" stopOpacity="0.9" />
      </linearGradient>
    </defs>
    <rect x="12" y="20" width="40" height="24" rx="2" stroke="url(#grad2)" strokeWidth="2" fill="none" opacity="0.4" />
    <rect x="16" y="24" width="10" height="6" fill="#FF8C00" opacity="0.7" />
    <rect x="27" y="24" width="10" height="6" fill="#FF8C00" opacity="0.5" />
    <rect x="38" y="24" width="10" height="6" fill="#FF8C00" opacity="0.8" />
    <rect x="16" y="34" width="10" height="6" fill="#FF8C00" opacity="0.6" />
    <rect x="27" y="34" width="10" height="6" fill="#FF8C00" opacity="0.9" />
    <rect x="38" y="34" width="10" height="6" fill="#FF8C00" opacity="0.5" />
  </svg>
);

const GraphicLiveControl = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <defs>
      <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF8C00" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#FF6347" stopOpacity="0.9" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="24" stroke="url(#grad3)" strokeWidth="2" fill="none" opacity="0.3" />
    <path d="M32 16 L32 32 L44 32" stroke="#FF8C00" strokeWidth="3" strokeLinecap="round" />
    <circle cx="32" cy="32" r="3" fill="#FF8C00" />
    <circle cx="32" cy="32" r="18" stroke="#FF8C00" strokeWidth="1" fill="none" opacity="0.2" />
  </svg>
);

const GraphicMultitude = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF8C00" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#FF4500" stopOpacity="0.8" />
      </linearGradient>
    </defs>
    <rect x="6" y="18" width="8" height="20" fill="url(#grad4)" opacity="0.6" />
    <rect x="16" y="12" width="8" height="26" fill="url(#grad4)" opacity="0.8" />
    <rect x="26" y="8" width="8" height="30" fill="url(#grad4)" opacity="1" />
    <rect x="36" y="14" width="8" height="24" fill="url(#grad4)" opacity="0.7" />
  </svg>
);

const GraphicStage = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF8C00" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#FFA500" stopOpacity="0.8" />
      </linearGradient>
    </defs>
    <path d="M8 36 L24 12 L40 36 Z" stroke="url(#grad5)" strokeWidth="2" fill="none" opacity="0.4" />
    <rect x="14" y="28" width="20" height="8" fill="#FF8C00" opacity="0.6" />
    <circle cx="24" cy="20" r="4" fill="#FF8C00" opacity="0.8" />
  </svg>
);

const GraphicBrand = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="grad6" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF8C00" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#FF6347" stopOpacity="0.8" />
      </linearGradient>
    </defs>
    <polygon points="24,8 38,18 38,30 24,40 10,30 10,18" stroke="url(#grad6)" strokeWidth="2" fill="none" opacity="0.3" />
    <polygon points="24,14 32,20 32,28 24,34 16,28 16,20" fill="#FF8C00" opacity="0.6" />
    <circle cx="24" cy="24" r="4" fill="#FF8C00" />
  </svg>
);

const GraphicLocation = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="grad7" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF8C00" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#FFA500" stopOpacity="0.8" />
      </linearGradient>
    </defs>
    <path d="M24 8 C16 8 12 14 12 20 C12 28 24 40 24 40 C24 40 36 28 36 20 C36 14 32 8 24 8 Z" fill="url(#grad7)" opacity="0.5" />
    <circle cx="24" cy="20" r="6" fill="#FF8C00" opacity="0.8" />
  </svg>
);

// ============================================
// CUSTOM CURSOR (Solo Desktop)
// ============================================
const CustomCursor = () => {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springConfig = { damping: 25, stiffness: 700 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 16);
      cursorY.set(e.clientY - 16);
    };

    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, []);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 pointer-events-none z-[100] hidden lg:block"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
        }}
      >
        <div className="w-full h-full rounded-full border-2 border-orange-400/50 bg-orange-400/10" />
      </motion.div>
      <motion.div
        className="fixed top-0 left-0 w-1 h-1 pointer-events-none z-[100] hidden lg:block"
        style={{
          x: useSpring(cursorX, { damping: 30, stiffness: 1000 }),
          y: useSpring(cursorY, { damping: 30, stiffness: 1000 }),
          translateX: 15,
          translateY: 15,
        }}
      >
        <div className="w-full h-full rounded-full bg-orange-400" />
      </motion.div>
    </>
  );
};

// ============================================
// GRID BACKGROUND PATTERN (Optimizado para mobile)
// ============================================
const GridBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-10 md:opacity-20">
      <div 
        className="absolute inset-0" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 140, 0, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 140, 0, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  );
};

// ============================================
// FLOATING ORB (Menos en mobile)
// ============================================
const FloatingOrb = ({ delay = 0, duration = 20, size = 400, className = '' }) => {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl ${className}`}
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle, rgba(255, 140, 0, 0.15) 0%, transparent 70%)',
      }}
      animate={{
        x: [0, 100, -50, 0],
        y: [0, -100, 50, 0],
        scale: [1, 1.2, 0.9, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
};

// ============================================
// MAGNETIC BUTTON (Optimizado para touch)
// ============================================
const MagneticButton = ({ children, onClick, className = '', variant = 'primary' }: any) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (window.innerWidth < 1024) return; // Desactivar en mobile/tablet
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.3);
    y.set((e.clientY - centerY) * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const baseClass = variant === 'primary' 
    ? 'bg-white text-black hover:bg-white/90 active:bg-white/80' 
    : 'bg-white/10 border-2 border-white/20 text-white hover:bg-white/20 hover:border-orange-400/50 active:bg-white/15';

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`px-6 py-4 rounded-xl font-mono text-sm uppercase tracking-wider transition-all shadow-lg backdrop-blur-sm relative overflow-hidden group touch-manipulation ${baseClass} ${className}`}
      style={{ x, y }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-orange-400/20 to-orange-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      <span className="relative z-10">
        {children}
      </span>
    </motion.button>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
const SharkEventsPresentation = () => {
  const [activeSection, setActiveSection] = useState('hero');
  const [activeEnergyTab, setActiveEnergyTab] = useState<'start' | 'peak' | 'final'>('start');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showCTA, setShowCTA] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progressBar = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const progressBarWidth = useTransform(progressBar, [0, 1], ['0%', '100%']);

  const sections = [
    { id: 'hero', label: 'Inicio' },
    { id: 'que-hacemos', label: 'Qué hacemos' },
    { id: 'eventos-shark', label: 'Eventos SHARK' },
    { id: 'solucion', label: 'Solución' },
    { id: 'energy', label: 'Energy' },
    { id: 'formatos', label: 'Formatos' },
    { id: 'beneficios', label: 'Beneficios' },
    { id: 'proceso', label: 'Proceso' },
    { id: 'cta', label: 'Contacto' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }

      const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      setShowCTA(scrollPercent > 0.3);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden" style={{ cursor: 'default' }}>
      <CustomCursor />
      
      {/* Enhanced Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-black/50 z-50 backdrop-blur-sm">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600 shadow-lg shadow-orange-500/50"
          style={{ width: progressBarWidth, backgroundSize: '200% 100%' }}
          animate={{
            backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Navigation Sticky - Optimizado Mobile */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <motion.button 
              onClick={() => scrollToSection('hero')} 
              className="flex-shrink-0"
              whileTap={{ scale: 0.95 }}
            >
              <img src={logoAvtech} alt="AV TECH" className="h-6 sm:h-7 w-auto" />
            </motion.button>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              {sections.map((section, index) => (
                <motion.button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`text-xs uppercase tracking-wider transition-all relative py-2 ${
                    activeSection === section.id
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.1 }}
                >
                  {section.label}
                  {activeSection === section.id && (
                    <motion.div
                      layoutId="activeSection"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={() => scrollToSection('cta')}
                className="text-xs uppercase tracking-wider text-white/80 hover:text-white active:text-orange-400 transition-colors px-4 py-2 bg-white/5 rounded-lg backdrop-blur-sm touch-manipulation"
              >
                Contacto
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white/80 hover:text-white active:text-orange-400 transition-colors touch-manipulation"
                aria-label="Menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-black/95 backdrop-blur-xl border-t border-white/10 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-2 max-h-[70vh] overflow-y-auto">
                {sections.map((section, index) => (
                  <motion.button
                    key={section.id}
                    onClick={() => {
                      scrollToSection(section.id);
                      setMobileMenuOpen(false);
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm uppercase tracking-wider transition-all touch-manipulation ${
                      activeSection === section.id
                        ? 'text-white bg-white/10'
                        : 'text-white/70 hover:text-white hover:bg-white/5 active:bg-white/10'
                    }`}
                  >
                    {section.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* CTA Flotante - Optimizado Mobile */}
      <AnimatePresence>
        {showCTA && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-4 sm:right-6 z-50"
          >
            <motion.button
              onClick={() => scrollToSection('cta')}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-black px-5 py-3.5 rounded-xl font-mono text-xs sm:text-sm uppercase tracking-wider shadow-2xl hover:shadow-orange-500/50 flex items-center gap-2 touch-manipulation active:bg-white/90"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Agendar</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION - Optimizado Mobile */}
      <section id="hero" className="min-h-screen flex items-center justify-center relative pt-20 sm:pt-24 px-4 sm:px-6 overflow-hidden">
        {/* Animated Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-orange-950/30" />
        <GridBackground />
        
        {/* Floating Orbs - Menos en mobile */}
        <div className="absolute inset-0 overflow-hidden">
          <FloatingOrb delay={0} duration={20} size={300} className="hidden sm:block" />
          <FloatingOrb delay={5} duration={25} size={250} />
          <FloatingOrb delay={10} duration={22} size={400} className="hidden md:block" />
        </div>
        
        {/* Animated LED Lines - Menos en mobile */}
        <div className="absolute inset-0 overflow-hidden hidden sm:block">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-px bg-gradient-to-b from-transparent via-orange-400/30 to-transparent"
              style={{
                left: `${20 + i * 30}%`,
                height: '100%',
              }}
              animate={{
                opacity: [0.2, 0.6, 0.2],
                scaleY: [1, 1.3, 1],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        {/* Enhanced Floating Particles - Menos en mobile */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full hidden sm:block"
              style={{
                width: Math.random() * 3 + 1,
                height: Math.random() * 3 + 1,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: i % 2 === 0 ? 'rgba(255, 140, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)',
                boxShadow: '0 0 10px currentColor',
              }}
              animate={{
                y: [0, -40, 0],
                x: [0, Math.random() * 30 - 15, 0],
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.6, 0.05, 0.01, 0.9] }}
          >
            <motion.h1 
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 sm:mb-8 font-display tracking-tight leading-[1.1]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
              }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <motion.span
                className="inline-block"
                animate={{
                  textShadow: [
                    '0 0 20px rgba(255,140,0,0.3)',
                    '0 0 40px rgba(255,140,0,0.6)',
                    '0 0 20px rgba(255,140,0,0.3)',
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
              >
                HIGH IMPACT
              </motion.span>
              <br />
              <span className="bg-gradient-to-r from-white via-orange-400 to-white bg-clip-text text-transparent relative inline-block">
                VISUAL EXPERIENCES
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-lg sm:text-xl md:text-2xl text-white/80 mb-8 sm:mb-10 font-mono max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              Donde la música se convierte en espectáculo visual inolvidable.
            </motion.p>
            
            {/* Tags optimizados para mobile */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-12">
              {['Reggaeton', 'Tech House', 'Commercial'].map((tag, i) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1, type: 'spring', stiffness: 200 }}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs sm:text-sm font-mono backdrop-blur-sm"
                >
                  {tag}
                </motion.span>
              ))}
              <motion.span 
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-full text-xs sm:text-sm font-mono backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 }}
              >
                ·
              </motion.span>
              {['Large Stages', 'Private Villas', 'Special Locations'].map((tag, i) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 1.0 + i * 0.1, type: 'spring', stiffness: 200 }}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs sm:text-sm font-mono backdrop-blur-sm"
                >
                  {tag}
                </motion.span>
              ))}
            </div>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.8 }}
            >
              <MagneticButton onClick={() => scrollToSection('solucion')} variant="primary">
                Ver propuesta
              </MagneticButton>
              <MagneticButton onClick={() => scrollToSection('cta')} variant="secondary">
                Agendar reunión
              </MagneticButton>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="mt-16 sm:mt-20"
          >
            <button
              onClick={() => scrollToSection('que-hacemos')}
              className="flex flex-col items-center gap-2 text-white/50 hover:text-white active:text-orange-400 transition-colors group touch-manipulation"
            >
              <span className="text-xs uppercase tracking-wider font-mono">Explorar</span>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ChevronDown className="w-6 h-6 group-hover:text-orange-400 transition-colors" />
              </motion.div>
            </button>
          </motion.div>
        </div>
      </section>

      {/* QUÉ HACEMOS - Optimizado Mobile */}
      <Section id="que-hacemos" className="py-20 sm:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-950/5 to-transparent" />
        <GridBackground />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <SectionHeader
            tag="Qué hacemos"
            title="No solo instalamos LED"
            subtitle="Diseñamos el impacto visual que define la fiesta"
          />
          <div className="mt-10 sm:mt-16 space-y-6 sm:space-y-8">
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8 }}
              className="text-lg sm:text-xl text-white/80 font-mono leading-relaxed max-w-3xl"
            >
              No se trata solo de pantallas. Se trata de{' '}
              {['ritmo', 'energía', 'identidad de marca', 'recuerdo'].map((word, i, arr) => (
                <span key={word}>
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.2, duration: 0.5 }}
                    className="text-orange-400 font-semibold relative inline-block mx-1"
                  >
                    {word}
                    <motion.span
                      className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-orange-400/50"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.2, duration: 0.5 }}
                    />
                  </motion.span>
                  {i < arr.length - 1 && (i < arr.length - 2 ? ', de ' : ' y, sobre todo, de ')}
                </span>
              ))}
              .
            </motion.p>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-base sm:text-lg text-white/60 font-mono leading-relaxed max-w-3xl"
            >
              Trabajamos con marcas ambiciosas que buscan diferenciación real. Eventos donde el visual no acompaña la música:{' '}
              <strong className="text-white relative inline-block">
                forma parte del show
              </strong>.
            </motion.p>
          </div>
        </div>
      </Section>

      {/* EVENTOS COMO SHARK - Optimizado Mobile */}
      <Section id="eventos-shark" className="py-20 sm:py-32 bg-white/5 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-950/10 via-transparent to-orange-950/10" />
        <GridBackground />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <SectionHeader
            tag="Eventos tipo SHARK"
            title="Multitudinarias, ambiciosas, memorables"
          />
          <div className="mt-10 sm:mt-16 grid md:grid-cols-2 gap-8 sm:gap-10">
            <div className="space-y-6 sm:space-y-8">
              <FeatureItem graphic={<GraphicMultitude />} title="Multitudinarias" index={0}>
                Miles de personas. Alto nivel comercial y experiencial.
              </FeatureItem>
              <FeatureItem graphic={<GraphicStage />} title="Escenarios grandes" index={1}>
                Main stages, festivales, localizaciones singulares.
              </FeatureItem>
              <FeatureItem graphic={<GraphicBrand />} title="Visual como marca" index={2}>
                El visual refuerza y amplifica la identidad SHARK.
              </FeatureItem>
              <FeatureItem graphic={<GraphicLocation />} title="Localizaciones especiales" index={3}>
                Villas, bosques, casinos, playas... cada espacio es único.
              </FeatureItem>
            </div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 sm:p-8 border border-white/10 backdrop-blur-sm relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 to-orange-400/10 opacity-50" />
              <motion.p 
                className="text-xl sm:text-2xl font-bold mb-4 font-display relative z-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                "El visual no acompaña la música: forma parte del show"
              </motion.p>
              <motion.p 
                className="text-white/70 font-mono relative z-10 text-base sm:text-lg"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                En eventos SHARK, cada drop, cada momento, cada transición visual cuenta una historia. 
                Y esa historia es la de tu marca.
              </motion.p>
            </motion.div>
          </div>

          {/* Media Placeholders - Grid optimizado mobile */}
          <div className="mt-10 sm:mt-16 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
                onClick={() => setLightboxImage(`placeholder-${i}`)}
                whileTap={{ scale: 0.95 }}
                className="aspect-video bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 cursor-pointer transition-all overflow-hidden relative touch-manipulation"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 to-orange-400/20" />
                <div className="w-full h-full flex items-center justify-center relative z-10">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                    <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white/60 border-b-[6px] border-b-transparent ml-1" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* NUESTRA SOLUCIÓN - Optimizado Mobile */}
      <Section id="solucion" className="py-20 sm:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-950/5 to-transparent" />
        <GridBackground />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <SectionHeader
            tag="Nuestra solución"
            title="3 pilares para SHARK"
            subtitle="Visual Design · LED & Escenografía · Live Visual Control"
          />
          <div className="mt-10 sm:mt-16 grid md:grid-cols-3 gap-6 sm:gap-8">
            <SolutionCard
              graphic={<GraphicVisualDesign />}
              title="Visual Design"
              items={[
                'Contenidos 100% custom',
                'Visuales rítmicos y claros',
                'Identidad SHARK integrada',
              ]}
              index={0}
            />
            <SolutionCard
              graphic={<GraphicLED />}
              title="LED & Escenografía"
              items={[
                'Pantallas LED masivas',
                'Montajes premium y seguros',
                'Adaptable interior/exterior',
              ]}
              index={1}
            />
            <SolutionCard
              graphic={<GraphicLiveControl />}
              title="Live Visual Control"
              items={[
                'Dirección en tiempo real',
                'Sync con drops y DJs',
                'Coordinación total',
              ]}
              index={2}
            />
          </div>

          {/* Galería de renders - Grid optimizado */}
          <div className="mt-10 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
                onClick={() => setLightboxImage(`render-${i}`)}
                whileTap={{ scale: 0.95 }}
                className="aspect-square bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 cursor-pointer transition-all overflow-hidden relative touch-manipulation"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 to-orange-400/20" />
                <div className="w-full h-full flex items-center justify-center relative z-10">
                  <span className="text-white/30 text-xs font-mono">R{i}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ENERGY THAT EVOLVES - Optimizado Mobile */}
      <Section id="energy" className="py-20 sm:py-32 bg-white/5 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-950/10 via-transparent to-orange-950/10" />
        <GridBackground />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <SectionHeader
            tag="Concepto base"
            title="ENERGY THAT EVOLVES"
            subtitle="START → PEAK → FINAL"
          />
          
          <div className="mt-10 sm:mt-16">
            {/* Tabs - Touch friendly */}
            <div className="flex gap-2 sm:gap-4 mb-8 border-b border-white/10 overflow-x-auto">
              {(['start', 'peak', 'final'] as const).map((tab) => (
                <motion.button
                  key={tab}
                  onClick={() => setActiveEnergyTab(tab)}
                  className={`px-6 py-3 font-mono text-sm uppercase tracking-wider transition-all border-b-2 relative whitespace-nowrap touch-manipulation ${
                    activeEnergyTab === tab
                      ? 'border-orange-400 text-white'
                      : 'border-transparent text-white/50 active:text-white/80'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {tab.toUpperCase()}
                  {activeEnergyTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeEnergyTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="grid md:grid-cols-2 gap-6 sm:gap-8"
              >
                <motion.div 
                  className="aspect-video bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-transparent" />
                  <div className="w-full h-full flex items-center justify-center relative z-10">
                    <span className="text-white/30 text-sm font-mono px-4 text-center">
                      {activeEnergyTab === 'start' && 'START: Build-up'}
                      {activeEnergyTab === 'peak' && 'PEAK: Explosión'}
                      {activeEnergyTab === 'final' && 'FINAL: Cierre'}
                    </span>
                  </div>
                </motion.div>
                <div className="space-y-4 sm:space-y-6">
                  {activeEnergyTab === 'start' && (
                    <>
                      <h3 className="text-2xl sm:text-3xl font-bold font-display">START</h3>
                      <p className="text-white/80 font-mono text-base sm:text-lg">
                        Imagen limpia, presencia marca SHARK, build-up sutil. El público entra en el ambiente 
                        mientras la identidad visual se establece.
                      </p>
                      <div className="flex items-center gap-2 text-orange-400">
                        <motion.div 
                          className="w-2 h-2 rounded-full bg-orange-400"
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span className="text-sm font-mono">Energía creciente</span>
                      </div>
                    </>
                  )}
                  {activeEnergyTab === 'peak' && (
                    <>
                      <h3 className="text-2xl sm:text-3xl font-bold font-display">PEAK</h3>
                      <p className="text-white/80 font-mono text-base sm:text-lg">
                        Explosión de color, movimiento intenso, impacto 360º. El momento álgido donde el visual 
                        y la música se fusionan en una experiencia total.
                      </p>
                      <div className="flex items-center gap-2 text-orange-400">
                        <motion.div 
                          className="w-2 h-2 rounded-full bg-orange-400"
                          animate={{ scale: [1, 1.8, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        <span className="text-sm font-mono">Máxima intensidad</span>
                      </div>
                    </>
                  )}
                  {activeEnergyTab === 'final' && (
                    <>
                      <h3 className="text-2xl sm:text-3xl font-bold font-display">FINAL</h3>
                      <p className="text-white/80 font-mono text-base sm:text-lg">
                        Cierre envolvente, replays, CTA redes. El momento de recordar, compartir y conectar 
                        con la comunidad SHARK.
                      </p>
                      <div className="flex items-center gap-2 text-orange-400">
                        <motion.div 
                          className="w-2 h-2 rounded-full bg-orange-400"
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span className="text-sm font-mono">Conexión post-evento</span>
                      </div>
                    </>
                  )}
                  <p className="text-sm text-white/60 font-mono italic">
                    Adaptable a villa íntima o festival masivo.
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Section>

      {/* CADA ESPACIO, SU IMPACTO - Optimizado Mobile */}
      <Section id="formatos" className="py-20 sm:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-950/5 to-transparent" />
        <GridBackground />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <SectionHeader
            tag="Cada espacio, su impacto visual"
            title="Formatos adaptados"
          />
          <div className="mt-10 sm:mt-16 grid md:grid-cols-3 gap-6 sm:gap-8">
            <FormatCard
              title="Grandes Escenarios"
              description="Festival / macro / mapping 3D"
              features={['Pantallas LED masivas', 'Mapping arquitectónico', 'Multi-pantalla']}
              index={0}
            />
            <FormatCard
              title="Villas Privadas"
              description="Premium / vibe exclusiva"
              features={['LED interior/exterior', 'Ambientación premium', 'Experiencia íntima']}
              index={1}
            />
            <FormatCard
              title="Localizaciones Especiales"
              description="Site-specific / clima"
              features={['Adaptación al entorno', 'Resistencia climática', 'Diseño único']}
              index={2}
            />
          </div>
        </div>
      </Section>

      {/* BENEFICIOS - Optimizado Mobile */}
      <Section id="beneficios" className="py-20 sm:py-32 bg-white/5 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-950/10 via-transparent to-orange-950/10" />
        <GridBackground />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <SectionHeader
            tag="Qué gana SHARK"
            title="Beneficios reales"
          />
          <div className="mt-10 sm:mt-16 grid sm:grid-cols-2 gap-4 sm:gap-6">
            {[
              { title: 'Marca más fuerte', desc: 'Identidad visual consistente en cada evento' },
              { title: 'Diferenciación brutal', desc: 'Contenido único SHARK, no genéricos' },
              { title: 'Más impacto emocional', desc: 'Público más fiel, experiencias memorables' },
              { title: 'Contenido reutilizable', desc: 'Material premium para redes sociales' },
              { title: 'Eventos memorables', desc: 'Boca-oreja masivo, recuerdo duradero' },
            ].map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
                className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-5 sm:p-6 border border-white/10 backdrop-blur-sm relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-400/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="w-8 h-1 bg-orange-400/50 rounded-full mb-4" />
                  <h4 className="font-bold mb-2 font-display text-base sm:text-lg">{benefit.title}</h4>
                  <p className="text-white/70 text-sm sm:text-base font-mono">{benefit.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* PROCESO - Optimizado Mobile */}
      <Section id="proceso" className="py-20 sm:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-950/5 to-transparent" />
        <GridBackground />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <SectionHeader
            tag="Cómo trabajamos"
            title="Proceso limpio"
          />
          <div className="mt-10 sm:mt-16">
            <div className="space-y-6 sm:space-y-8">
              {[
                { step: '01', title: 'Entender evento SHARK', desc: 'Espacio, público, line-up, objetivos' },
                { step: '02', title: 'Moodboard + base visual', desc: 'Concepto adaptado a SHARK' },
                { step: '03', title: 'Producción + instalación', desc: 'Equipo certificado, montaje premium' },
                { step: '04', title: 'Dirección visual en directo', desc: 'VJ + coordinación con producción' },
                { step: '05', title: 'Entrega resultado', desc: 'Material post-evento para redes' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
                  className="flex gap-4 sm:gap-6 items-start"
                >
                  <div className="text-3xl sm:text-4xl font-bold text-orange-400/50 font-mono flex-shrink-0 w-16 sm:w-20">
                    {item.step}
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="text-lg sm:text-xl font-bold mb-2 font-display">{item.title}</h4>
                    <p className="text-white/70 text-sm sm:text-base font-mono">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* CTA FINAL - Optimizado Mobile */}
      <Section id="cta" className="py-20 sm:py-32 bg-gradient-to-br from-black via-orange-950/20 to-black relative overflow-hidden">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0">
          <FloatingOrb delay={0} duration={15} size={400} />
          <FloatingOrb delay={5} duration={18} size={350} className="hidden sm:block" />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="space-y-10 sm:space-y-12"
          >
            {/* Título */}
            <div className="space-y-4 sm:space-y-6">
              <motion.h2 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display leading-tight"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                Esto es solo el punto de partida
              </motion.h2>
              <motion.p 
                className="text-lg sm:text-xl text-white/80 font-mono max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                La propuesta real nace al aplicarla a un evento concreto
              </motion.p>
            </div>

            {/* Separador */}
            <motion.div 
              className="flex items-center justify-center gap-4 py-4"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-orange-400/50 to-transparent" />
              <motion.div
                className="w-2 h-2 rounded-full bg-orange-400"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
              <div className="h-px w-16 bg-gradient-to-l from-transparent via-orange-400/50 to-transparent" />
            </motion.div>

            {/* Reunión */}
            <div className="space-y-6 sm:space-y-8">
              <motion.h3 
                className="text-2xl sm:text-3xl font-bold font-display"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
              >
                Reunión 20–30 min
              </motion.h3>
              
              {/* Lista */}
              <ul className="space-y-4 max-w-lg mx-auto text-left">
                {[
                  'Ver vídeos reales de proyectos similares',
                  'Ajustar concepto al próximo SHARK',
                  'Definir formato ideal y presupuesto',
                  'Valorar prueba pequeña',
                ].map((item, i) => (
                  <motion.li 
                    key={i} 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.0 + i * 0.1 }}
                    className="flex items-start gap-3 text-white/80 text-base sm:text-lg font-mono"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2.5 flex-shrink-0" />
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Separador */}
            <motion.div 
              className="flex items-center justify-center gap-4 py-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.4 }}
            >
              <div className="h-px w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="h-px w-20 bg-gradient-to-l from-transparent via-white/20 to-transparent" />
            </motion.div>

            {/* Contacto - Optimizado Mobile */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.6 }}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-white/70 font-mono text-sm sm:text-base">
                <a 
                  href={`tel:${CONFIG.contactPhone}`} 
                  className="flex items-center gap-2 transition-all active:text-orange-400 touch-manipulation"
                >
                  <Phone className="w-5 h-5 text-orange-400" />
                  <span className="break-all">{CONFIG.contactPhone}</span>
                </a>
                
                <span className="hidden sm:inline text-white/30">·</span>
                
                <a 
                  href={`mailto:${CONFIG.contactEmail}`} 
                  className="flex items-center gap-2 transition-all active:text-orange-400 touch-manipulation"
                >
                  <Mail className="w-5 h-5 text-orange-400" />
                  <span className="break-all text-center">{CONFIG.contactEmail}</span>
                </a>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-white/70 font-mono text-sm sm:text-base">
                <a 
                  href={`https://www.instagram.com/${CONFIG.instagram}/`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 transition-all active:text-orange-400 touch-manipulation"
                >
                  <Instagram className="w-5 h-5 text-orange-400" />
                  <span>{CONFIG.instagramDisplay}</span>
                </a>
                
                <span className="hidden sm:inline text-white/30">·</span>
                
                <a 
                  href={`https://${CONFIG.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 transition-all active:text-orange-400 touch-manipulation"
                >
                  <Globe className="w-5 h-5 text-orange-400" />
                  <span>{CONFIG.website}</span>
                </a>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </Section>

      {/* Lightbox Modal - Optimizado Mobile */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl"
            onClick={() => setLightboxImage(null)}
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxImage(null);
              }}
              className="absolute top-4 right-4 text-white hover:text-orange-400 active:text-orange-500 transition-colors p-3 bg-white/10 rounded-lg backdrop-blur-sm z-10 touch-manipulation"
            >
              <X className="w-6 h-6 sm:w-8 sm:h-8" />
            </motion.button>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-6xl w-full aspect-video bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-transparent" />
              <span className="text-white/30 text-sm font-mono relative z-10 px-4 text-center">
                Imagen: {lightboxImage}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// COMPONENTES AUXILIARES
// ============================================

interface SectionProps {
  id: string;
  className?: string;
  children: React.ReactNode;
}

const Section = ({ id, className = '', children }: SectionProps) => {
  return (
    <section id={id} className={`relative ${className}`}>
      {children}
    </section>
  );
};

interface SectionHeaderProps {
  tag: string;
  title: string;
  subtitle?: string;
}

const SectionHeader = ({ tag, title, subtitle }: SectionHeaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <motion.div 
          className="w-2 h-2 rounded-full bg-orange-400"
          animate={{ 
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
        <span className="text-xs uppercase tracking-wider text-white/60 font-mono">{tag}</span>
      </div>
      <motion.h2 
        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 font-display tracking-tight leading-tight"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p 
          className="text-base sm:text-lg text-white/70 font-mono"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
};

interface FeatureItemProps {
  graphic: React.ReactNode;
  title: string;
  children: React.ReactNode;
  index: number;
}

const FeatureItem = ({ graphic, title, children, index }: FeatureItemProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
      className="flex gap-4 items-start"
    >
      <div className="flex-shrink-0">
        {graphic}
      </div>
      <div className="flex-1">
        <h4 className="font-bold mb-2 font-display text-base sm:text-lg">{title}</h4>
        <p className="text-white/70 text-sm sm:text-base font-mono">{children}</p>
      </div>
    </motion.div>
  );
};

interface SolutionCardProps {
  graphic: React.ReactNode;
  title: string;
  items: string[];
  index: number;
}

const SolutionCard = ({ graphic, title, items, index }: SolutionCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.2, type: 'spring', stiffness: 200 }}
      className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 sm:p-8 border border-white/10 backdrop-blur-sm relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 to-orange-400/5" />
      <div className="flex justify-center mb-6 relative z-10">
        {graphic}
      </div>
      <h3 className="text-xl sm:text-2xl font-bold mb-4 font-display text-center relative z-10">{title}</h3>
      <ul className="space-y-3 relative z-10">
        {items.map((item, i) => (
          <motion.li 
            key={i} 
            className="flex items-start gap-3 text-white/80 text-sm sm:text-base font-mono"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2 + i * 0.1 }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
            <span>{item}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
};

interface FormatCardProps {
  title: string;
  description: string;
  features: string[];
  index: number;
}

const FormatCard = ({ title, description, features, index }: FormatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.2, type: 'spring', stiffness: 200 }}
      className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 to-orange-400/5" />
      <h3 className="text-lg sm:text-xl font-bold mb-2 font-display relative z-10">{title}</h3>
      <p className="text-white/60 text-sm font-mono mb-4 relative z-10">{description}</p>
      <ul className="space-y-2 relative z-10">
        {features.map((feature, i) => (
          <motion.li 
            key={i} 
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2 + i * 0.1 }}
            className="text-white/80 text-sm font-mono flex items-center gap-2"
          >
            <div className="w-1 h-1 rounded-full bg-orange-400 flex-shrink-0" />
            {feature}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
};

export default SharkEventsPresentation;
