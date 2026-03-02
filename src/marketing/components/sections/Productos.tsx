import { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight, Check, Clock3, Monitor, Shield, Sun, Zap } from 'lucide-react';

import { ContactFormDialog } from '@/marketing/components/ContactFormDialog';
import { Button } from '@/components/ui/button';
import {
  catalogFaqSchema,
  catalogSeoFaqs,
  comparisonFeatures,
  packCatalogSchema,
  productLines,
  type ProductCardData,
  type ProductLine,
} from '@/constants/catalogPacks';

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
  led: {
    section: 'bg-white/[0.025] border-white/10',
    card: 'bg-white/[0.035] border-white/10 hover:bg-white/[0.05] hover:border-white/15',
    badgeDot: 'bg-foreground',
    badgeText: 'text-foreground/70',
    eyebrow: 'text-foreground/55',
  },
} as const;

const ProductCard = ({ product, tone }: { product: ProductCardData; tone: ProductLine['tone'] }) => {
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
        {product.basedOn || product.sku ? (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/45">
            {product.basedOn ? `Basado en ${product.basedOn}` : product.sku}
            {product.basedOn && product.sku ? ` · ${product.sku}` : null}
          </p>
        ) : null}
        <p className="mt-3 font-mono text-sm leading-relaxed text-muted-foreground" itemProp="description">
          {product.description}
        </p>
        {product.positioning ? (
          <p className="mt-3 font-mono text-xs sm:text-sm leading-relaxed text-foreground/68">
            {product.positioning}
          </p>
        ) : null}

        {product.idealFor?.length ? (
          <div className="mt-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/45">Ideal para</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.idealFor.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-foreground/70"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <ul className="mt-5 space-y-3 border-t border-white/8 pt-5">
          {product.includedLabel ? (
            <li className="pb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/45">
              {product.includedLabel}
            </li>
          ) : null}
          {product.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-3 font-mono text-xs sm:text-sm text-foreground/75">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/45" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        {product.highlights?.length ? (
          <div className="mt-5 border-t border-white/8 pt-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/45">Diferencial clave</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {product.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-3 font-mono text-xs sm:text-sm text-foreground/72">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/45" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogFaqSchema) }}
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
                  {line.pricingNote ? (
                    <p className="mt-4 font-mono text-xs sm:text-sm text-foreground/55">{line.pricingNote}</p>
                  ) : null}
                  <p className="mt-4 max-w-4xl font-mono text-xs sm:text-sm leading-relaxed text-foreground/55">
                    {line.title} para proyectos de digital signage en Barcelona y toda Espana, con soluciones para retail,
                    oficinas, restauracion, corporate y espacios comerciales segun la exigencia visual del entorno.
                  </p>
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

            <div className="mt-8 grid gap-5 sm:gap-6 lg:grid-cols-3">
              <ComparisonColumn title="Profesional HB" items={[
                { icon: Sun, text: comparisonFeatures.hb[0] },
                { icon: Sun, text: comparisonFeatures.hb[1] },
                { icon: Shield, text: comparisonFeatures.hb[2] },
                { icon: Clock3, text: comparisonFeatures.hb[3] },
              ]} />
              <ComparisonColumn title="Comercial D60" items={[
                { icon: Zap, text: comparisonFeatures.d60[0] },
                { icon: Monitor, text: comparisonFeatures.d60[1] },
                { icon: Check, text: comparisonFeatures.d60[2] },
                { icon: ArrowRight, text: comparisonFeatures.d60[3] },
              ]} />
              <ComparisonColumn title="LED AV TECH" items={[
                { icon: Monitor, text: comparisonFeatures.led[0] },
                { icon: Shield, text: comparisonFeatures.led[1] },
                { icon: Sun, text: comparisonFeatures.led[2] },
                { icon: ArrowRight, text: comparisonFeatures.led[3] },
              ]} />
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={fadeIn}
            className="rounded-[28px] border border-white/10 bg-white/[0.02] px-5 py-8 sm:px-8 sm:py-10 md:px-10"
          >
            <div className="text-center">
              <div className="section-tag mb-3">FAQ</div>
              <h3 className="font-mono text-2xl sm:text-3xl md:text-4xl text-foreground">
                <span className="section-title-primary">Preguntas frecuentes</span>
                <br />
                <span className="section-title-secondary">sobre digital signage</span>
              </h3>
              <p className="mx-auto mt-5 max-w-3xl font-mono text-sm sm:text-base leading-relaxed text-muted-foreground">
                Respuestas claras para ayudar a Google, Bing y al usuario a entender cuando conviene cada linea de packs.
              </p>
            </div>

            <div className="mt-8 grid gap-5 sm:gap-6 lg:grid-cols-2">
              {catalogSeoFaqs.map((item) => (
                <article key={item.question} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-6 sm:p-7">
                  <h4 className="font-mono text-lg sm:text-xl text-foreground">{item.question}</h4>
                  <p className="mt-4 font-mono text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                </article>
              ))}
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
