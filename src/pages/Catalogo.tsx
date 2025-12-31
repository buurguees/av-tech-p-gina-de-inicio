import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// Importar imágenes para el carrusel de fondo
import catalogImage1 from '@/assets/catalog/pantalla-led-interior.png';
import catalogImage2 from '@/assets/catalog/mupys-led.png';
import catalogImage3 from '@/assets/catalog/totem-lcd.png';
import catalogImage4 from '@/assets/catalog/lcd-techo.png';
import project5 from '@/assets/projects/project-5.png';
import project7 from '@/assets/projects/project-7.jpg';

const backgroundImages = [
  catalogImage1,
  catalogImage2,
  catalogImage3,
  catalogImage4,
  project5,
  project7,
];

// Tipos
interface SubPack {
  id: string;
  name: string;
  size: string;
  features: string[];
}

interface Pack {
  id: string;
  name: string;
  description: string;
  priceMin?: number;
  priceMax?: number;
  comingSoon?: boolean;
  subPacks: SubPack[];
  gradient: string;
  accentColor: string;
}

// Columna izquierda: Monitores
const monitoresData: Pack[] = [
  {
    id: 'starter-pack-plus',
    name: 'Starter Pack Plus',
    description: 'Monitores de gran formato para espacios que requieren máximo impacto visual',
    priceMin: 1599,
    priceMax: 7099,
    gradient: 'from-emerald-600/20 via-teal-600/10 to-transparent',
    accentColor: 'hsl(160, 70%, 50%)',
    subPacks: [
      {
        id: 'pack-65',
        name: 'Pack 65"',
        size: '65 pulgadas',
        features: [
          'Monitor profesional de 65"',
          'Soporte de pared incluido',
          'Puesta en marcha',
          'Posibilidad de añadir monitores adicionales',
        ],
      },
      {
        id: 'pack-75',
        name: 'Pack 75"',
        size: '75 pulgadas',
        features: [
          'Monitor profesional de 75"',
          'Soporte de pared incluido',
          'Puesta en marcha',
          'Posibilidad de añadir monitores adicionales',
        ],
      },
      {
        id: 'pack-86',
        name: 'Pack 86"',
        size: '86 pulgadas',
        features: [
          'Monitor profesional de 86"',
          'Soporte de pared incluido',
          'Puesta en marcha',
          'Posibilidad de añadir monitores adicionales',
        ],
      },
      {
        id: 'pack-98',
        name: 'Pack 98"',
        size: '98 pulgadas',
        features: [
          'Monitor profesional de 98"',
          'Soporte de pared incluido',
          'Puesta en marcha',
          'Posibilidad de añadir monitores adicionales',
        ],
      },
    ],
  },
  {
    id: 'starter-pack',
    name: 'Starter Pack',
    description: 'Solución ideal para comenzar a digitalizar tu espacio con monitores profesionales de alta calidad',
    priceMin: 1099,
    priceMax: 1199,
    gradient: 'from-blue-600/20 via-indigo-600/10 to-transparent',
    accentColor: 'hsl(220, 70%, 60%)',
    subPacks: [
      {
        id: 'pack-49',
        name: 'Pack 49"',
        size: '49 pulgadas',
        features: [
          'Monitor profesional de 49"',
          'Soporte de pared incluido',
          'Puesta en marcha',
          'Posibilidad de añadir monitores adicionales',
        ],
      },
      {
        id: 'pack-55',
        name: 'Pack 55"',
        size: '55 pulgadas',
        features: [
          'Monitor profesional de 55"',
          'Soporte de pared incluido',
          'Puesta en marcha',
          'Posibilidad de añadir monitores adicionales',
        ],
      },
    ],
  },
];

// Columna derecha: LED y Cartelería
const otrosPacksData: Pack[] = [
  {
    id: 'pack-led-pro',
    name: 'LED Pro',
    description: 'Pantallas LED de alto impacto para eventos, retail y espacios de gran formato',
    comingSoon: true,
    gradient: 'from-rose-600/20 via-orange-600/10 to-transparent',
    accentColor: 'hsl(350, 70%, 55%)',
    subPacks: [],
  },
  {
    id: 'pack-signage-360',
    name: 'Signage 360',
    description: 'Soluciones completas de cartelería digital para comunicación corporativa y retail',
    comingSoon: true,
    gradient: 'from-violet-600/20 via-purple-600/10 to-transparent',
    accentColor: 'hsl(270, 70%, 60%)',
    subPacks: [],
  },
];

// Componente de Pack reutilizable
const PackCard = ({ 
  pack, 
  expandedPack, 
  selectedSubPack, 
  onPackEnter, 
  onPackLeave, 
  onPackClick,
  onSubPackClick,
  isMobile
}: { 
  pack: Pack;
  expandedPack: string | null;
  selectedSubPack: string | null;
  onPackEnter: (id: string) => void;
  onPackLeave: () => void;
  onPackClick: (id: string) => void;
  onSubPackClick: (id: string) => void;
  isMobile: boolean;
}) => {
  const isExpanded = expandedPack === pack.id;

  const handleClick = () => {
    if (pack.comingSoon) return;
    if (isMobile) {
      onPackClick(pack.id);
    }
  };

  const handleMouseEnter = () => {
    if (pack.comingSoon || isMobile) return;
    onPackEnter(pack.id);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    onPackLeave();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-lg border transition-all duration-500 ${
        pack.comingSoon 
          ? 'border-border/30 bg-secondary/10 cursor-default'
          : isExpanded 
            ? 'border-foreground/30 bg-secondary/50 cursor-pointer' 
            : 'border-border/50 bg-secondary/20 hover:border-border cursor-pointer'
      }`}
    >
      {/* Gradient Background */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${pack.gradient} transition-opacity duration-500 ${
          isExpanded ? 'opacity-100' : 'opacity-30'
        }`}
      />

      {/* Content */}
      <div className="relative z-10 p-6 lg:p-8">
        {/* Pack Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-mono text-xl lg:text-2xl font-medium text-foreground">
              {pack.name}
            </h2>
            {pack.comingSoon && (
              <span className="px-2 py-1 text-xs font-mono uppercase tracking-wider rounded bg-muted text-muted-foreground">
                Próximamente
              </span>
            )}
          </div>
          <p className="font-mono text-sm text-muted-foreground max-w-md mb-3">
            {pack.description}
          </p>
          {pack.priceMin && pack.priceMax && (
            <div className="font-mono text-sm">
              <span className="text-muted-foreground">Desde </span>
              <span className="text-foreground font-medium">{pack.priceMin.toLocaleString('es-ES')}€</span>
              <span className="text-muted-foreground"> hasta </span>
              <span className="text-foreground font-medium">{pack.priceMax.toLocaleString('es-ES')}€</span>
            </div>
          )}
        </div>

        {/* Expanded Content */}
        <AnimatePresence mode="wait">
          {isExpanded && pack.subPacks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-6 border-t border-border/30 mt-4">
                <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-4">
                  Opciones disponibles
                </div>
                
                {/* Sub-packs */}
                <div className="space-y-3">
                  {pack.subPacks.map((subPack) => (
                    <motion.div
                      key={subPack.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => onSubPackClick(subPack.id)}
                      className={`group p-4 rounded-md border transition-all duration-300 cursor-pointer ${
                        selectedSubPack === subPack.id
                          ? 'border-foreground/40 bg-foreground/5'
                          : 'border-border/30 hover:border-border/60 bg-background/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronRight 
                            className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
                              selectedSubPack === subPack.id ? 'rotate-90' : ''
                            }`}
                          />
                          <div>
                            <div className="font-mono text-sm font-medium text-foreground">
                              {subPack.name}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {subPack.size}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sub-pack Features */}
                      <AnimatePresence>
                        {selectedSubPack === subPack.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 mt-4 border-t border-border/20">
                              <div className="grid gap-2">
                                {subPack.features.map((feature, i) => (
                                  <div 
                                    key={i}
                                    className="flex items-center gap-2 font-mono text-xs text-muted-foreground"
                                  >
                                    <Check 
                                      className="w-3 h-3 shrink-0" 
                                      style={{ color: pack.accentColor }}
                                    />
                                    {feature}
                                  </div>
                                ))}
                              </div>
                              <Link to="/#contacto">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mt-4 font-mono text-xs"
                                >
                                  Solicitar presupuesto
                                </Button>
                              </Link>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Indicator */}
        {!isExpanded && !pack.comingSoon && pack.subPacks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/20">
            <div className="font-mono text-xs text-muted-foreground flex items-center gap-2">
              <span>{isMobile ? 'Toca para ver opciones' : 'Hover para ver opciones'}</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Catalogo = () => {
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [selectedSubPack, setSelectedSubPack] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-rotate background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handlePackEnter = (packId: string) => {
    setExpandedPack(packId);
    setSelectedSubPack(null);
  };

  const handlePackLeave = () => {
    setExpandedPack(null);
    setSelectedSubPack(null);
  };

  const handlePackClick = (packId: string) => {
    setExpandedPack(expandedPack === packId ? null : packId);
    setSelectedSubPack(null);
  };

  const handleSubPackClick = (subPackId: string) => {
    setSelectedSubPack(selectedSubPack === subPackId ? null : subPackId);
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background Carousel */}
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="sync">
          <motion.img
            key={currentImageIndex}
            src={backgroundImages[currentImageIndex]}
            alt="Fondo catálogo"
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
          />
        </AnimatePresence>
        
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-background/85" />
        
        {/* Gradient overlays */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 70%)'
          }}
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-mono text-sm">Volver</span>
            </Link>
            <div className="font-mono text-sm text-muted-foreground">
              Catálogo 2024
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24 pb-16">
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16"
          >
            <div className="section-tag mb-4">Packs Audiovisuales</div>
            <h1 className="section-title mb-6">
              <span className="section-title-primary">Soluciones completas</span>
              <br />
              <span className="section-title-secondary">para tu espacio</span>
            </h1>
            <p className="section-description max-w-2xl">
              Packs diseñados para maximizar el impacto visual de tu negocio. 
              Cada solución incluye hardware, instalación y puesta en marcha.
            </p>
          </motion.div>

          {/* Packs Grid - 2 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            {/* Columna Izquierda: Monitores */}
            <div className="space-y-4">
              <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-4">
                Monitores Profesionales
              </div>
              {monitoresData.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  expandedPack={expandedPack}
                  selectedSubPack={selectedSubPack}
                  onPackEnter={handlePackEnter}
                  onPackLeave={handlePackLeave}
                  onPackClick={handlePackClick}
                  onSubPackClick={handleSubPackClick}
                  isMobile={isMobile}
                />
              ))}
            </div>

            {/* Columna Derecha: LED y Cartelería */}
            <div className="space-y-4">
              <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-4">
                Soluciones Especiales
              </div>
              {otrosPacksData.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  expandedPack={expandedPack}
                  selectedSubPack={selectedSubPack}
                  onPackEnter={handlePackEnter}
                  onPackLeave={handlePackLeave}
                  onPackClick={handlePackClick}
                  onSubPackClick={handleSubPackClick}
                  isMobile={isMobile}
                />
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 text-center"
          >
            <p className="font-mono text-sm text-muted-foreground mb-4">
              ¿Necesitas una solución personalizada?
            </p>
            <Link to="/#contacto">
              <Button variant="default" size="lg" className="font-mono">
                Contactar
              </Button>
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Catalogo;
