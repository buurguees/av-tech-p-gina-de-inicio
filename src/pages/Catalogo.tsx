import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// Tipos
interface SubPack {
  id: string;
  name: string;
  size: string;
  priceMin: number;
  priceMax: number;
  features: string[];
}

interface Pack {
  id: string;
  name: string;
  description: string;
  priceRange: { min: number; max: number };
  subPacks: SubPack[];
  gradient: string;
  accentColor: string;
}

// Datos de ejemplo (placeholder - se actualizarán con datos reales)
const packsData: Pack[] = [
  {
    id: 'pack-monitores',
    name: 'Pack Monitores',
    description: 'Soluciones de visualización profesional para espacios comerciales y corporativos',
    priceRange: { min: 1500, max: 4500 },
    gradient: 'from-blue-600/20 via-indigo-600/10 to-transparent',
    accentColor: 'hsl(220, 70%, 60%)',
    subPacks: [
      {
        id: 'monitor-49',
        name: 'Pack Monitor 49"',
        size: '49 pulgadas',
        priceMin: 1500,
        priceMax: 2200,
        features: [
          'Pantalla profesional 4K',
          'Soporte de pared incluido',
          'Reproductor multimedia integrado',
          'Instalación profesional',
        ],
      },
      {
        id: 'monitor-55',
        name: 'Pack Monitor 55"',
        size: '55 pulgadas',
        priceMin: 2200,
        priceMax: 3200,
        features: [
          'Pantalla comercial 4K HDR',
          'Soporte articulado premium',
          'Software de gestión remota',
          'Instalación y configuración',
          'Garantía extendida 3 años',
        ],
      },
      {
        id: 'monitor-65',
        name: 'Pack Monitor 65"',
        size: '65 pulgadas',
        priceMin: 3200,
        priceMax: 4500,
        features: [
          'Pantalla comercial 4K HDR Pro',
          'Estructura de suelo o pared',
          'Sistema de gestión de contenidos',
          'Instalación llave en mano',
          'Soporte técnico premium 24/7',
          'Mantenimiento primer año incluido',
        ],
      },
    ],
  },
  {
    id: 'pack-led',
    name: 'Pack LED',
    description: 'Pantallas LED de alto impacto para eventos, retail y espacios de gran formato',
    priceRange: { min: 5000, max: 25000 },
    gradient: 'from-emerald-600/20 via-teal-600/10 to-transparent',
    accentColor: 'hsl(160, 70%, 50%)',
    subPacks: [
      {
        id: 'led-interior-small',
        name: 'Pack LED Interior S',
        size: '2m² - 4m²',
        priceMin: 5000,
        priceMax: 9000,
        features: [
          'Pantalla LED P2.5 alta definición',
          'Estructura de montaje incluida',
          'Controlador de video',
          'Instalación profesional',
        ],
      },
      {
        id: 'led-interior-medium',
        name: 'Pack LED Interior M',
        size: '4m² - 8m²',
        priceMin: 9000,
        priceMax: 16000,
        features: [
          'Pantalla LED P2.5/P3 premium',
          'Estructura modular adaptable',
          'Sistema de control avanzado',
          'Software de gestión incluido',
          'Instalación y formación',
        ],
      },
      {
        id: 'led-interior-large',
        name: 'Pack LED Interior L',
        size: '8m² - 16m²',
        priceMin: 16000,
        priceMax: 25000,
        features: [
          'Pantalla LED P2.5 broadcast quality',
          'Estructura personalizada',
          'Procesador de video profesional',
          'Gestión de contenidos cloud',
          'Instalación llave en mano',
          'Mantenimiento anual incluido',
        ],
      },
    ],
  },
];

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const Catalogo = () => {
  const [expandedPack, setExpandedPack] = useState<string | null>(packsData[0].id);
  const [selectedSubPack, setSelectedSubPack] = useState<string | null>(null);

  const handlePackHover = (packId: string) => {
    if (expandedPack !== packId) {
      setExpandedPack(packId);
      setSelectedSubPack(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
      <main className="pt-24 pb-16">
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
              Cada solución incluye hardware, instalación y soporte.
            </p>
          </motion.div>

          {/* Packs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {packsData.map((pack, index) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.5, 
                  delay: 0.1 * index,
                  ease: [0.22, 1, 0.36, 1] 
                }}
                onMouseEnter={() => handlePackHover(pack.id)}
                className={`relative overflow-hidden rounded-lg border transition-all duration-500 cursor-pointer ${
                  expandedPack === pack.id 
                    ? 'border-foreground/30 bg-secondary/50' 
                    : 'border-border/50 bg-secondary/20 hover:border-border'
                }`}
              >
                {/* Gradient Background */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-br ${pack.gradient} opacity-50 transition-opacity duration-500 ${
                    expandedPack === pack.id ? 'opacity-100' : 'opacity-30'
                  }`}
                />

                {/* Content */}
                <div className="relative z-10 p-6 lg:p-8">
                  {/* Pack Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="font-mono text-xl lg:text-2xl font-medium text-foreground mb-2">
                        {pack.name}
                      </h2>
                      <p className="font-mono text-sm text-muted-foreground max-w-md">
                        {pack.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="font-mono text-xs text-muted-foreground mb-1">Desde</div>
                      <div className="font-mono text-lg lg:text-xl font-medium text-foreground">
                        {formatPrice(pack.priceRange.min)}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence mode="wait">
                    {expandedPack === pack.id && (
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
                                onClick={() => setSelectedSubPack(
                                  selectedSubPack === subPack.id ? null : subPack.id
                                )}
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
                                  <div className="font-mono text-sm text-foreground/80">
                                    {formatPrice(subPack.priceMin)} - {formatPrice(subPack.priceMax)}
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
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="mt-4 font-mono text-xs"
                                        >
                                          Solicitar presupuesto
                                        </Button>
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
                  {expandedPack !== pack.id && (
                    <div className="mt-4 pt-4 border-t border-border/20">
                      <div className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                        <span>Hover para ver opciones</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
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
