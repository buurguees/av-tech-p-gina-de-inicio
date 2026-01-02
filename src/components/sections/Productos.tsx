import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ContactFormDialog } from '@/components/ContactFormDialog';
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
  secondaryDescription?: string;
  subPacks: SubPack[];
  gradient: string;
  accentColor: string;
}

// Todos los packs combinados
const allPacksData: Pack[] = [
  {
    id: 'starter-pack',
    name: 'Starter Pack',
    description: 'La forma más sencilla de empezar a destacar',
    secondaryDescription: 'Perfecto para tiendas, oficinas, centros de atención al cliente y espacios corporativos.',
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
  {
    id: 'starter-pack-plus',
    name: 'Starter Pack Plus',
    description: 'Más tamaño. Más impacto. Más presencia.',
    secondaryDescription: 'Ideal para escaparates, zonas de paso, showrooms y espacios de alto tráfico.',
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
    id: 'pack-led-pro',
    name: 'LED Pro',
    description: 'Cuando tu espacio necesita algo más que una pantalla',
    secondaryDescription: 'Para proyectos ambiciosos, marcas atrevidas y espacios que quieren marcar diferencia.',
    gradient: 'from-rose-600/20 via-orange-600/10 to-transparent',
    accentColor: 'hsl(350, 70%, 55%)',
    subPacks: [],
  },
  {
    id: 'pack-signage-360',
    name: 'Signage 360',
    description: 'La comunicación visual, totalmente integrada',
    secondaryDescription: 'Ideal para franquicias, cadenas, gimnasios y negocios en crecimiento.',
    gradient: 'from-violet-600/20 via-purple-600/10 to-transparent',
    accentColor: 'hsl(270, 70%, 60%)',
    subPacks: [],
  },
];

// Componente de Pack en la lista (versión compacta)
const PackListItem = ({ 
  pack, 
  isSelected,
  onClick,
}: { 
  pack: Pack;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <motion.div
      layout
      onClick={onClick}
      className={`relative overflow-hidden rounded-lg border transition-all duration-300 cursor-pointer ${
        isSelected 
          ? 'border-foreground/40 bg-secondary/60' 
          : 'border-border/50 bg-secondary/20 hover:border-border hover:bg-secondary/30'
      }`}
    >
      {/* Gradient Background */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${pack.gradient} transition-opacity duration-300 ${
          isSelected ? 'opacity-100' : 'opacity-30'
        }`}
      />

      {/* Content */}
      <div className="relative z-10 p-4 lg:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono text-base lg:text-lg font-medium text-foreground">
              {pack.name}
            </h3>
            <p className="font-mono text-xs text-muted-foreground mt-1 line-clamp-1">
              {pack.description}
            </p>
          </div>
          <ChevronRight 
            className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${
              isSelected ? 'rotate-90 text-foreground' : ''
            }`}
          />
        </div>
      </div>
    </motion.div>
  );
};

// Componente de Pack expandido (versión completa en la columna derecha)
const PackExpanded = ({ 
  pack,
  selectedSubPack,
  onSubPackClick,
  onClose,
}: { 
  pack: Pack;
  selectedSubPack: string | null;
  onSubPackClick: (id: string) => void;
  onClose: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-lg border border-foreground/30 bg-secondary/50 h-full"
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${pack.gradient} opacity-60`} />

      {/* Content */}
      <div className="relative z-10 p-5 lg:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-mono text-xl lg:text-2xl font-medium text-foreground mb-2">
              {pack.name}
            </h3>
            <p className="font-mono text-sm text-muted-foreground max-w-md">
              {pack.description}
            </p>
            {pack.secondaryDescription && (
              <p className="font-mono text-xs text-muted-foreground/70 max-w-md mt-2">
                {pack.secondaryDescription}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-foreground/10 transition-colors lg:hidden"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Sub-packs */}
        {pack.subPacks.length > 0 ? (
          <div className="pt-4 border-t border-border/30">
            <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Opciones disponibles
            </div>
            
            <div className="space-y-2">
              {pack.subPacks.map((subPack) => (
                <motion.div
                  key={subPack.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => onSubPackClick(subPack.id)}
                  className={`group p-3 rounded-md border transition-all duration-300 cursor-pointer ${
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
                        <div className="pt-3 mt-3 border-t border-border/20">
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
                          <ContactFormDialog
                            trigger={
                              <Button 
                                variant="catalog" 
                                size="sm" 
                                className="mt-3 font-mono text-xs"
                              >
                                Solicitar presupuesto
                              </Button>
                            }
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-border/30">
            <p className="font-mono text-sm text-muted-foreground mb-4">
              Solución personalizada según las necesidades de tu proyecto.
            </p>
            <ContactFormDialog
              trigger={
                <Button 
                  variant="catalog" 
                  size="sm" 
                  className="font-mono text-xs"
                >
                  Solicitar información
                </Button>
              }
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Productos = () => {
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
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

  const handlePackClick = (packId: string) => {
    setSelectedPack(selectedPack === packId ? null : packId);
    setSelectedSubPack(null);
  };

  const handleSubPackClick = (subPackId: string) => {
    setSelectedSubPack(selectedSubPack === subPackId ? null : subPackId);
  };

  const handleClose = () => {
    setSelectedPack(null);
    setSelectedSubPack(null);
  };

  const activePack = allPacksData.find(p => p.id === selectedPack);

  return (
    <section id="productos" className="relative py-16 lg:py-24 overflow-hidden">
      {/* Background Carousel */}
      <div className="absolute inset-0 z-0">
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

      {/* Main Content */}
      <div className="relative z-10 max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12"
        >
          <div className="section-tag mb-4">Catálogo</div>
          <h2 className="section-title mb-6">
            <span className="section-title-primary">Tu marca brillando</span>
            <br />
            <span className="section-title-secondary">donde más importa</span>
          </h2>
          <p className="section-description max-w-2xl">
            Packs diseñados para maximizar el impacto visual de tu negocio. 
            Cada solución incluye hardware, instalación y puesta en marcha.
          </p>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Left Column: Pack List */}
          <div className="space-y-3">
            {allPacksData.map((pack, index) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <PackListItem
                  pack={pack}
                  isSelected={selectedPack === pack.id}
                  onClick={() => handlePackClick(pack.id)}
                />
              </motion.div>
            ))}
          </div>

          {/* Right Column: Expanded Pack or Placeholder */}
          <div className="lg:sticky lg:top-24 min-h-[300px]">
            <AnimatePresence mode="wait">
              {activePack ? (
                <PackExpanded
                  key={activePack.id}
                  pack={activePack}
                  selectedSubPack={selectedSubPack}
                  onSubPackClick={handleSubPackClick}
                  onClose={handleClose}
                />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[300px] flex items-center justify-center rounded-lg border border-dashed border-border/30 bg-secondary/10"
                >
                  <p className="font-mono text-sm text-muted-foreground/50 text-center px-8">
                    Selecciona un pack para ver los detalles
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CTA to full catalog */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <Link to="/catalogo">
            <Button variant="catalog" size="lg" className="font-mono">
              Ver catálogo completo
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default Productos;
