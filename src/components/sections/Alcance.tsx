import { motion, useInView } from 'motion/react';
import { useRef, useEffect, useState } from 'react';
import Globe from 'globe.gl';

// Coordenadas geográficas reales de proyectos [latitud, longitud]
// La primera ciudad de cada país es la principal y se mostrará en el globo
const projects = [
  // España - Mercado principal (20 grandes ciudades)
  { name: 'Barcelona', lat: 41.3851, lng: 2.1734, isHQ: true, region: 'España', showOnGlobe: true },
  { name: 'Madrid', lat: 40.4168, lng: -3.7038, region: 'España' },
  { name: 'Valencia', lat: 39.4699, lng: -0.3763, region: 'España' },
  { name: 'Sevilla', lat: 37.3891, lng: -5.9845, region: 'España' },
  { name: 'Zaragoza', lat: 41.6488, lng: -0.8773, region: 'España' },
  { name: 'Málaga', lat: 36.7213, lng: -4.4214, region: 'España' },
  { name: 'Murcia', lat: 37.9922, lng: -1.1307, region: 'España' },
  { name: 'Palma de Mallorca', lat: 39.5696, lng: 2.6502, region: 'España' },
  { name: 'Las Palmas de Gran Canaria', lat: 28.1235, lng: -15.4363, region: 'España' },
  { name: 'Bilbao', lat: 43.2630, lng: -2.9253, region: 'España' },
  { name: 'Alicante', lat: 38.3452, lng: -0.4907, region: 'España' },
  { name: 'Córdoba', lat: 37.8882, lng: -4.7794, region: 'España' },
  { name: 'Valladolid', lat: 41.6528, lng: -4.7245, region: 'España' },
  { name: 'Vigo', lat: 42.2406, lng: -8.7207, region: 'España' },
  { name: 'Gijón', lat: 43.5322, lng: -5.6611, region: 'España' },
  { name: 'Hospitalet de Llobregat', lat: 41.3598, lng: 2.1001, region: 'España' },
  { name: 'Vitoria-Gasteiz', lat: 42.8467, lng: -2.6716, region: 'España' },
  { name: 'A Coruña', lat: 43.3623, lng: -8.4115, region: 'España' },
  { name: 'Granada', lat: 37.1773, lng: -3.5986, region: 'España' },
  { name: 'Elche', lat: 38.2622, lng: -0.6983, region: 'España' },
  
  // Europa Occidental
  { name: 'Lisboa', lat: 38.7223, lng: -9.1393, region: 'Portugal', showOnGlobe: true },
  { name: 'París', lat: 48.8566, lng: 2.3522, region: 'Francia', showOnGlobe: true },
  { name: 'Lyon', lat: 45.7640, lng: 4.8357, region: 'Francia' },
  { name: 'Londres', lat: 51.5074, lng: -0.1278, region: 'Reino Unido', showOnGlobe: true },
  { name: 'Birmingham', lat: 52.4862, lng: -1.8904, region: 'Reino Unido' },
  { name: 'Oxford', lat: 51.7520, lng: -1.2577, region: 'Reino Unido' },
  { name: 'Dublín', lat: 53.3498, lng: -6.2603, region: 'Irlanda', showOnGlobe: true },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, region: 'Países Bajos', showOnGlobe: true },
  { name: 'Rotterdam', lat: 51.9225, lng: 4.47917, region: 'Países Bajos' },
  { name: 'Liège', lat: 50.6326, lng: 5.5797, region: 'Bélgica', showOnGlobe: true },
  
  // Europa del Norte
  { name: 'Copenhague', lat: 55.6761, lng: 12.5683, region: 'Dinamarca', showOnGlobe: true },
  { name: 'Berlín', lat: 52.5200, lng: 13.4050, region: 'Alemania', showOnGlobe: true },
  { name: 'Regensburg', lat: 49.0134, lng: 12.1016, region: 'Alemania' },
  { name: 'Bremen', lat: 53.0793, lng: 8.8017, region: 'Alemania' },
  
  // Europa del Sur
  { name: 'Milán', lat: 45.4642, lng: 9.1900, region: 'Italia', showOnGlobe: true },
  { name: 'Roma', lat: 41.9028, lng: 12.4964, region: 'Italia' },
  { name: 'Nápoles', lat: 40.8518, lng: 14.2681, region: 'Italia' },
  { name: 'Malta', lat: 35.8989, lng: 14.5146, region: 'Malta', showOnGlobe: true },
  
  // Europa del Este y Mediterráneo
  { name: 'Atenas', lat: 37.9838, lng: 23.7275, region: 'Grecia', showOnGlobe: true },
  { name: 'Patras', lat: 38.2466, lng: 21.7346, region: 'Grecia' },
  { name: 'Volos', lat: 39.3636, lng: 22.9425, region: 'Grecia' },
  { name: 'Katerini', lat: 40.2733, lng: 22.5019, region: 'Grecia' },
  { name: 'Chipre', lat: 35.1264, lng: 33.4299, region: 'Chipre', showOnGlobe: true },
  { name: 'Estambul', lat: 41.0082, lng: 28.9784, region: 'Turquía', showOnGlobe: true },
  { name: 'Ankara', lat: 39.9334, lng: 32.8597, region: 'Turquía' },
  
  // Medio Oriente
  { name: 'Riad', lat: 24.7136, lng: 46.6753, region: 'Arabia Saudí', showOnGlobe: true },
  { name: 'Jeddah', lat: 21.4858, lng: 39.1925, region: 'Arabia Saudí' },
  { name: 'Doha', lat: 25.2854, lng: 51.5310, region: 'Qatar', showOnGlobe: true },
  
  // Asia Central
  { name: 'Almaty', lat: 43.2220, lng: 76.8512, region: 'Kazajistán', showOnGlobe: true },
  
  // América
  { name: 'Ciudad de México', lat: 19.4326, lng: -99.1332, region: 'México', showOnGlobe: true },
];

// Puntos de rotación para mostrar solo zonas con proyectos
const ROTATION_POINTS = [
  { lat: 50, lng: -10, duration: 4000 },  // 1. España/Portugal
  { lat: 50, lng: 5, duration: 4000 },    // 2. Europa Central
  { lat: 48, lng: 20, duration: 4000 },   // 3. Europa del Este
  { lat: 42, lng: 35, duration: 4000 },   // 4. Mediterráneo/Turquía
  { lat: 35, lng: 48, duration: 4000 },   // 5. Medio Oriente
  { lat: 43, lng: 70, duration: 4000 },   // 6. Asia Central (Kazajistán)
  { lat: 25, lng: -99, duration: 5000 },  // 7. México (salto rápido)
];

// Vista inicial del globo
const INITIAL_VIEW = {
  lat: 50,
  lng: -10,
  altitude: 1.8,
};

interface GlobeInstance {
  pointOfView: (view?: { lat?: number; lng?: number; altitude?: number }, duration?: number) => any;
  controls: () => any;
  scene: () => any;
  camera: () => any;
  _destructor?: () => void;
  width: (w: number) => GlobeInstance;
  height: (h: number) => GlobeInstance;
}

const Alcance = () => {
  const ref = useRef(null);
  const globeRef = useRef<HTMLDivElement>(null);
  const globeInstance = useRef<GlobeInstance | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [isMobile, setIsMobile] = useState(false);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const rotationIndexRef = useRef(0);
  const rotationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Barcelona (HQ) coordinates
  const barcelona = projects.find(c => c.isHQ)!;

  // Filtrar solo proyectos que se mostrarán en el globo (ciudades principales de cada país)
  const projectsToShowOnGlobe = projects.filter(project => project.showOnGlobe || project.isHQ);

  // Crear arcos desde Barcelona hacia las ciudades principales
  const arcsData = projectsToShowOnGlobe
    .filter(project => !project.isHQ)
    .map(project => ({
      startLat: barcelona.lat,
      startLng: barcelona.lng,
      endLat: project.lat,
      endLng: project.lng,
      color: ['#ffffff', '#ffffff'],
      name: project.name,
    }));

  // Puntos solo de las ciudades principales
  const pointsData = projectsToShowOnGlobe.map(project => ({
    lat: project.lat,
    lng: project.lng,
    size: project.isHQ ? 0.4 : 0.2,
    color: '#ffffff',
    name: project.name,
    isHQ: project.isHQ,
  }));

  // Función de rotación continua por puntos de interés
  const startRotationSequence = (globe: GlobeInstance) => {
    if (!globe) return;

    const rotateToNextPoint = () => {
      const currentPoint = ROTATION_POINTS[rotationIndexRef.current];
      
      try {
        globe.pointOfView(
          {
            lat: currentPoint.lat,
            lng: currentPoint.lng,
            altitude: 1.8,
          },
          currentPoint.duration
        );

        rotationTimeoutRef.current = setTimeout(() => {
          rotationIndexRef.current = (rotationIndexRef.current + 1) % ROTATION_POINTS.length;
          rotateToNextPoint();
        }, currentPoint.duration);
      } catch (error) {
        console.error('Error rotating globe:', error);
      }
    };

    rotateToNextPoint();
  };

  useEffect(() => {
    if (!globeRef.current || globeInstance.current) return;
    if (!isInView) return;

    try {
      const globe = new Globe(globeRef.current)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('#ffffff')
        .atmosphereAltitude(0.15)
        
        .width(globeRef.current.offsetWidth)
        .height(isMobile ? 300 : 400)
        
        .pointOfView(INITIAL_VIEW)
        
        .arcsData(arcsData)
        .arcColor('color')
        .arcStroke(0.15)
        .arcDashLength(0.4)
        .arcDashGap(0.3)
        .arcDashAnimateTime(3000)
        .arcAltitude(0.25)
        .arcAltitudeAutoScale(0.6)
        .arcDashInitialGap(() => Math.random())
        
        .pointsData(pointsData)
        .pointColor('color')
        .pointAltitude(0.001)
        .pointRadius('size')
        .pointsMerge(false)
        
        .labelsData([])
        .labelLat('lat')
        .labelLng('lng')
        .labelText('')
        .labelSize(0)
        .labelColor('#ffffff')
        .labelDotRadius(0)
        .labelAltitude(0)
        .labelResolution(0) as GlobeInstance;

      if (globe.controls) {
        const controls = globe.controls();
        controls.autoRotate = false;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableRotate = false;
        controls.enabled = false;
      }

      setTimeout(() => {
        try {
          const camera = globe.camera();
          if (camera) {
            camera.rotation.x = -0.35;
          }

          const scene = globe.scene();
          if (scene && scene.children) {
            const globeObj = scene.children.find((obj: any) => obj.type === 'Mesh');
            if (globeObj && (globeObj as any).material) {
              const material = (globeObj as any).material;
              material.emissive = { r: 0.06, g: 0.06, b: 0.06 };
              material.emissiveIntensity = 0.2;
              material.shininess = 15;
              material.opacity = 1;
            }
          }
          
          setIsGlobeReady(true);
        } catch (error) {
          console.error('Error customizing globe:', error);
          setIsGlobeReady(true);
        }
      }, 500);

      globeInstance.current = globe;

      if (isInView) {
        setTimeout(() => {
          startRotationSequence(globe);
        }, 500);
      }
    } catch (error) {
      console.error('Error initializing globe:', error);
      setIsGlobeReady(true);
    }

    return () => {
      if (rotationTimeoutRef.current) {
        clearTimeout(rotationTimeoutRef.current);
      }
      
      if (globeInstance.current && globeInstance.current._destructor) {
        try {
          globeInstance.current._destructor();
        } catch (error) {
          console.error('Error destroying globe:', error);
        }
        globeInstance.current = null;
      }
    };
  }, [isInView, isMobile]);

  useEffect(() => {
    const handleResize = () => {
      if (globeInstance.current && globeRef.current) {
        try {
          globeInstance.current.width(globeRef.current.offsetWidth);
          globeInstance.current.height(isMobile ? 300 : 400);
        } catch (error) {
          console.error('Error resizing globe:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Agrupar proyectos por región
  const projectsByRegion = projects.reduce((acc, project) => {
    if (!acc[project.region]) {
      acc[project.region] = [];
    }
    acc[project.region].push(project);
    return acc;
  }, {} as Record<string, typeof projects>);

  const [showAllRegions, setShowAllRegions] = useState(false);

  const initialRegions = ['España', 'Reino Unido'];
  const visibleRegions = isMobile && !showAllRegions 
    ? Object.fromEntries(Object.entries(projectsByRegion).filter(([region]) => initialRegions.includes(region)))
    : projectsByRegion;

  return (
    <section ref={sectionRef} id="alcance" className="relative py-16 sm:py-32 overflow-hidden">
      <div ref={ref} className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16">
        {/* Globe and Title side by side */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          {/* Globe Container - Left side */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1.0, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative lg:flex-1 flex justify-center lg:justify-start order-2 lg:order-1 mt-[10px]"
          >
            {!isGlobeReady && (
              <div className="absolute inset-0 flex items-center justify-center z-30 bg-background">
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 border-2 border-muted border-t-foreground rounded-full"
                  />
                  <span className="font-mono text-sm text-muted-foreground">Cargando proyectos...</span>
                </div>
              </div>
            )}

            <div 
              ref={globeRef} 
              className="relative z-0 pointer-events-none"
              style={{ 
                width: isMobile ? '100%' : '400px',
                height: isMobile ? '300px' : '400px',
                minHeight: isMobile ? '300px' : '400px',
              }}
            />

            {/* Gradients for seamless integration */}
            <div 
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background: 'radial-gradient(ellipse 60% 65% at center, transparent 25%, rgba(0, 0, 0, 0.2) 50%, rgba(0, 0, 0, 0.7) 75%, hsl(var(--background)) 100%)',
              }}
            />

            <div 
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                boxShadow: 'inset 0 0 120px 60px rgba(0, 0, 0, 0.8)',
              }}
            />
          </motion.div>

          {/* Section header - Right side */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="lg:flex-1 text-right order-1 lg:order-2"
          >
            <div className="section-tag">
              Presencia global
            </div>
            <h2 className="section-title max-w-xl ml-auto">
              <span className="section-title-primary">De Barcelona</span>
              <br />
              <span className="section-title-secondary">al mundo</span>
            </h2>
            <p className="section-description mt-4 ml-auto">
              Desde Barcelona hasta el mundo.
              <br />
              Proyectos audiovisuales de alto impacto en Europa, Medio Oriente, Asia y América.
            </p>
          </motion.div>
        </div>

        {/* Lista de proyectos por región */}
        <div className="mt-[32px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView && isGlobeReady ? { opacity: 1, y: 0 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
              {Object.entries(visibleRegions).map(([region, regionProjects], regionIndex) => (
                <motion.div
                  key={region}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView && isGlobeReady ? { opacity: 1, y: 0 } : { opacity: 0 }}
                  transition={{ 
                    delay: 0.4 + regionIndex * 0.03,
                    duration: 0.3,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="space-y-2"
                >
                  <div className="font-mono text-xs text-muted-foreground tracking-wider uppercase font-medium">{region}</div>
                  <div className="font-mono text-sm text-foreground/60 leading-relaxed">
                    {regionProjects.map(p => p.name).join(', ')}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Botón "Ver más" solo visible en móvil */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView && isGlobeReady ? { opacity: 1, y: 0 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 2.8, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 flex justify-center"
            >
              <button
                onClick={() => setShowAllRegions(!showAllRegions)}
                className="font-mono px-8 py-4 border border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground transition-all duration-500 text-sm tracking-wide uppercase"
              >
                {showAllRegions ? 'Ver menos' : 'Ver más países'}
              </button>
            </motion.div>
          )}


          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 md:gap-8 mt-12 md:mt-16 pt-10 md:pt-12 border-t border-border"
          >
            {[
              { value: '50', label: 'Ciudades' },
              { value: '3', label: 'Continentes' },
              { value: '18', label: 'Países' },
              { value: 'Global', label: 'Presencia' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ 
                  delay: 0.7 + index * 0.05,
                  duration: 0.4,
                  ease: [0.16, 1, 0.3, 1]
                }}
                whileHover={isMobile ? {} : { scale: 1.05 }}
                className="text-center sm:text-left"
              >
                <div className="font-display text-2xl sm:text-3xl md:text-4xl mb-2 tracking-tight">
                  {stat.value}
                </div>
                <div className="font-mono text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Alcance;
