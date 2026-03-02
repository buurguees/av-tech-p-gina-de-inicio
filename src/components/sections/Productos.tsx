import { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight, Check, Clock3, Monitor, Shield, Sun, Zap } from 'lucide-react';

import { ContactFormDialog } from '@/components/ContactFormDialog';
import { Button } from '@/components/ui/button';
import catalogImage1 from '@/assets/catalog/pantalla-led-interior.png';
import catalogImage2 from '@/assets/catalog/mupys-led.png';
import catalogImage4 from '@/assets/catalog/lcd-techo.png';
import project5 from '@/assets/projects/project-5.png';
import project7 from '@/assets/projects/project-7.jpg';
import hb43 from '@/assets/packs/HB-43.png';
import hb49 from '@/assets/packs/HB-49.png';
import hb55 from '@/assets/packs/HB-55.png';
import hb65 from '@/assets/packs/HB-65.png';
import hb75 from '@/assets/packs/HB-75.png';
import hb86 from '@/assets/packs/HB-86.jpeg';
import d6043 from '@/assets/packs/D60-43.png';
import d6050 from '@/assets/packs/D60-50.png';
import d6075 from '@/assets/packs/D60-75.png';
import d6085 from '@/assets/packs/D60-85.png';
import d6096 from '@/assets/packs/D60-96.png';

interface ProductCardData {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  bullets: string[];
}

interface ProductLine {
  id: string;
  badge?: string;
  title: string;
  subtitle: string;
  description: string;
  tone: 'hb' | 'd60';
  products: ProductCardData[];
}

const hbProducts: ProductCardData[] = [
  {
    id: 'hb-43',
    title: '43" HB',
    description: 'Pantalla profesional de alto brillo con sistema integrado y montaje completo.',
    image: hb43,
    imageAlt: 'Pantalla instalada en escaparate moderno',
    bullets: ['Monitor profesional Full HD / 4K', 'Mini PC integrado', 'Soporte profesional', 'Instalacion incluida', 'Configuracion inicial'],
  },
  {
    id: 'hb-49',
    title: '49" HB',
    description: 'Pantalla profesional de alto brillo con sistema integrado y montaje completo.',
    image: hb49,
    imageAlt: 'Pantalla instalada en retail premium',
    bullets: ['Monitor profesional Full HD / 4K', 'Mini PC integrado', 'Soporte profesional', 'Instalacion incluida', 'Configuracion inicial'],
  },
  {
    id: 'hb-55',
    title: '55" HB',
    description: 'Pantalla profesional de alto brillo con sistema integrado y montaje completo.',
    image: hb55,
    imageAlt: 'Pantalla instalada en showroom iluminado',
    bullets: ['Monitor profesional Full HD / 4K', 'Mini PC integrado', 'Soporte profesional', 'Instalacion incluida', 'Configuracion inicial'],
  },
  {
    id: 'hb-65',
    title: '65" HB',
    description: 'Pantalla profesional de alto brillo con sistema integrado y montaje completo.',
    image: hb65,
    imageAlt: 'Pantalla instalada en farmacia moderna',
    bullets: ['Monitor profesional Full HD / 4K', 'Mini PC integrado', 'Soporte profesional', 'Instalacion incluida', 'Configuracion inicial'],
  },
  {
    id: 'hb-75',
    title: '75" HB',
    description: 'Pantalla profesional de alto brillo con sistema integrado y montaje completo.',
    image: hb75,
    imageAlt: 'Pantalla instalada en concesionario',
    bullets: ['Monitor profesional Full HD / 4K', 'Mini PC integrado', 'Soporte profesional', 'Instalacion incluida', 'Configuracion inicial'],
  },
  {
    id: 'hb-86',
    title: '86" HB',
    description: 'Pantalla profesional de alto brillo con sistema integrado y montaje completo.',
    image: hb86,
    imageAlt: 'Pantalla instalada en espacio retail premium',
    bullets: ['Monitor profesional Full HD / 4K', 'Mini PC integrado', 'Soporte profesional', 'Instalacion incluida', 'Configuracion inicial'],
  },
];

const d60Products: ProductCardData[] = [
  {
    id: 'd60-43',
    title: '43" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: d6043,
    imageAlt: 'Pantalla instalada en restaurante moderno',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
  {
    id: 'd60-50',
    title: '50" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: d6050,
    imageAlt: 'Pantalla instalada en oficina',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
  {
    id: 'd60-55',
    title: '55" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: catalogImage2,
    imageAlt: 'Pantalla instalada en peluqueria',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
  {
    id: 'd60-65',
    title: '65" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: catalogImage1,
    imageAlt: 'Pantalla instalada en tienda de barrio',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
  {
    id: 'd60-75',
    title: '75" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: d6075,
    imageAlt: 'Pantalla instalada en recepcion corporativa',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
  {
    id: 'd60-85',
    title: '85" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: d6085,
    imageAlt: 'Pantalla instalada en espacio comercial interior',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
  {
    id: 'd60-96',
    title: '96" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: d6096,
    imageAlt: 'Pantalla instalada en zona corporativa',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
];

const productLines: ProductLine[] = [
  {
    id: 'hb',
    title: 'Linea Profesional HB',
    subtitle: 'Maximo brillo, maxima resistencia, rendimiento continuo 24/7',
    description: 'Pensada para escaparates, exteriores protegidos y entornos de alta luminosidad.',
    tone: 'hb',
    products: hbProducts,
  },
  {
    id: 'd60',
    badge: 'Mas economica',
    title: 'Linea Comercial D60',
    subtitle: 'Solucion eficiente y accesible para comunicacion digital en interiores',
    description: 'Ideal para tiendas, oficinas, restaurantes y espacios comerciales.',
    tone: 'd60',
    products: d60Products,
  },
];

const hbFeatures = [
  { icon: Sun, text: 'Alto brillo' },
  { icon: Sun, text: 'Preparada para entornos luminosos' },
  { icon: Shield, text: 'Mayor resistencia' },
  { icon: Clock3, text: 'Uso intensivo 24/7' },
];

const d60Features = [
  { icon: Zap, text: 'Excelente relacion calidad-precio' },
  { icon: Monitor, text: 'Uso interior' },
  { icon: Check, text: 'Ideal para comunicacion diaria' },
  { icon: ArrowRight, text: 'Solucion versatil' },
];

const packCatalogSchema = {
  '@context': 'https://schema.org',
  '@type': 'OfferCatalog',
  name: 'Catalogo de packs Digital Signage AV TECH',
  description:
    'Linea Profesional HB de alto brillo y Linea Comercial D60 para digital signage en retail, oficinas, restauracion y espacios corporativos.',
  url: 'https://avtechesdeveniments.com/#productos',
  itemListElement: productLines.map((line, lineIndex) => ({
    '@type': 'OfferCatalog',
    name: line.title,
    description: line.description,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: line.products.length,
    itemListElement: line.products.map((product, productIndex) => ({
      '@type': 'ListItem',
      position: lineIndex * 100 + productIndex + 1,
      item: {
        '@type': 'Product',
        name: `${product.title} AV TECH`,
        description: product.description,
        brand: {
          '@type': 'Brand',
          name: 'AV TECH ESDEVENIMENTS',
        },
        category: line.title,
        image: new URL(product.image, 'https://avtechesdeveniments.com').toString(),
        additionalProperty: product.bullets.map((bullet) => ({
          '@type': 'PropertyValue',
          name: 'Caracteristica',
          value: bullet,
        })),
      },
    })),
  })),
};

const fadeIn = {
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1] as const,
};

const lineTheme = {
  hb: {
    section: 'bg-transparent',
    card: 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-white/15',
    badgeDot: 'bg-foreground',
    badgeText: 'text-foreground/70',
    eyebrow: 'text-foreground/55',
  },
  d60: {
    section: 'bg-white/[0.02] border-white/8',
    card: 'bg-white/[0.02] border-white/8 hover:bg-white/[0.04] hover:border-white/12',
    badgeDot: 'bg-foreground/70',
    badgeText: 'text-foreground/65',
    eyebrow: 'text-foreground/50',
  },
} as const;

const ProductCard = ({ product, tone }: { product: ProductCardData; tone: 'hb' | 'd60' }) => {
  const theme = lineTheme[tone];

  return (
    <article
      className={`group h-full overflow-hidden rounded-[22px] border backdrop-blur-sm transition-all duration-300 ${theme.card}`}
      itemScope
      itemType="https://schema.org/Product"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={product.image}
          alt={`${product.title} de AV TECH ESDEVENIMENTS para digital signage, ${product.imageAlt.toLowerCase()}`}
          title={`${product.title} | AV TECH ESDEVENIMENTS`}
          loading="lazy"
          decoding="async"
          itemProp="image"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />
      </div>

      <div className="p-5 sm:p-6">
        <h3 className="font-mono text-xl sm:text-2xl text-foreground" itemProp="name">
          {product.title}
        </h3>
        <p className="mt-3 font-mono text-sm leading-relaxed text-muted-foreground" itemProp="description">
          {product.description}
        </p>

        <ul className="mt-5 space-y-3 border-t border-white/8 pt-5">
          {product.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-3 font-mono text-xs sm:text-sm text-foreground/75">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/45" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
};

const InfiniteProductCarousel = ({ line }: { line: ProductLine }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', loop: true, skipSnaps: false });

  const autoplay = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(autoplay, 3200);
    return () => clearInterval(interval);
  }, [autoplay, emblaApi]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between px-1">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-foreground/55">Desliza formatos</p>
        <p className="font-mono text-xs text-muted-foreground">{line.products.length} opciones</p>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4">
          {line.products.map((product) => (
            <div key={product.id} className="min-w-0 shrink-0 pl-4 basis-[84%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
              <ProductCard product={product} tone={line.tone} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ComparisonColumn = ({ title, items }: { title: string; items: { icon: typeof Sun; text: string }[] }) => (
  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-6 sm:p-7 backdrop-blur-sm">
    <h4 className="font-mono text-xl sm:text-2xl text-foreground">{title}</h4>
    <ul className="mt-6 space-y-4">
      {items.map((item) => (
        <li key={item.text} className="flex items-center gap-4 font-mono text-sm text-foreground/75">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <item.icon className="h-4 w-4 text-foreground/55" />
          </div>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  </div>
);

const Productos = () => {
  return (
    <section id="productos" className="relative overflow-hidden py-16 sm:py-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(packCatalogSchema) }}
      />
      <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16">
        <motion.header
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={fadeIn}
          className="text-center"
        >
          <div className="section-tag mb-4 sm:mb-6">Catalogo</div>
          <h2 className="section-title max-w-5xl mx-auto">
            <span className="section-title-primary">Soluciones Digital Signage</span>
            <br />
            <span className="section-title-secondary">listas para instalar</span>
          </h2>
          <p className="section-description max-w-3xl mx-auto mt-6">
            Packs profesionales disenados para transformar cualquier espacio comercial con instalacion llave en mano.
          </p>
        </motion.header>

        <div className="mt-12 sm:mt-16 space-y-12 sm:space-y-16">
          {productLines.map((line, lineIndex) => {
            const theme = lineTheme[line.tone];

            return (
              <motion.section
                key={line.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ ...fadeIn, delay: lineIndex * 0.08 }}
                className={`rounded-[28px] border border-white/10 px-5 py-8 sm:px-8 sm:py-10 md:px-10 ${theme.section}`}
              >
                <div className="mb-8 sm:mb-10">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2">
                      <span className="section-indicator" />
                      <span className={`font-mono text-xs uppercase tracking-[0.2em] ${theme.eyebrow}`}>{line.title}</span>
                    </div>
                    {line.badge ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/60">
                        {line.badge}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 font-mono text-2xl sm:text-3xl md:text-4xl text-foreground">{line.title}</h3>
                  <p className="mt-3 font-mono text-sm sm:text-base text-foreground/82">{line.subtitle}</p>
                  <p className="mt-4 max-w-3xl font-mono text-sm sm:text-base leading-relaxed text-muted-foreground">{line.description}</p>
                </div>

                <InfiniteProductCarousel line={line} />
              </motion.section>
            );
          })}

          <motion.section
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={fadeIn}
            className="rounded-[28px] border border-white/10 bg-white/[0.02] px-5 py-8 sm:px-8 sm:py-10 md:px-10"
          >
            <div className="text-center">
              <div className="section-tag mb-3">Comparativa</div>
              <h3 className="font-mono text-2xl sm:text-3xl md:text-4xl text-foreground">
                <span className="section-title-primary">Cual encaja mejor</span>
                <br />
                <span className="section-title-secondary">con tu espacio</span>
              </h3>
            </div>

            <div className="mt-8 grid gap-5 sm:gap-6 lg:grid-cols-2">
              <ComparisonColumn title="Profesional HB" items={hbFeatures} />
              <ComparisonColumn title="Comercial D60" items={d60Features} />
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={fadeIn}
            className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-8 sm:px-8 sm:py-10 md:px-10"
          >
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <div className="section-tag mb-3">Asesoramiento</div>
                <h3 className="font-mono text-2xl sm:text-3xl md:text-4xl text-foreground">
                  <span className="section-title-primary">No sabes que pack</span>
                  <br />
                  <span className="section-title-secondary">necesitas</span>
                </h3>
                <p className="mt-5 max-w-2xl font-mono text-sm sm:text-base leading-relaxed text-muted-foreground">
                  Te asesoramos segun tu espacio, distancia de vision y objetivos comerciales.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
                <ContactFormDialog
                  trigger={
                    <Button variant="catalog" size="lg" className="w-full sm:w-auto font-mono">
                      Hablar con un especialista
                    </Button>
                  }
                />
                <Button variant="outline" size="lg" className="w-full sm:w-auto font-mono">
                  Ver ejemplos reales
                </Button>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </section>
  );
};

export default Productos;
