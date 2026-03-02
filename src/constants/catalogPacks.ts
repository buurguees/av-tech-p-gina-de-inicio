import catalogImage1 from '@/assets/catalog/pantalla-led-interior.png';
import catalogImage2 from '@/assets/catalog/mupys-led.png';
import catalogImage4 from '@/assets/catalog/lcd-techo.png';
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
import project5 from '@/assets/projects/project-5.png';
import project7 from '@/assets/projects/project-7.jpg';

export interface ProductCardData {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  basedOn?: string;
  sku?: string;
  positioning?: string;
  idealFor?: string[];
  includedLabel?: string;
  bullets: string[];
  highlights?: string[];
}

export interface ProductLine {
  id: string;
  badge?: string;
  title: string;
  subtitle: string;
  description: string;
  pricingNote?: string;
  tone: 'hb' | 'd60' | 'led';
  products: ProductCardData[];
}

export const hbProducts: ProductCardData[] = [
  {
    id: 'hb-43',
    title: '43" HB',
    description: 'Pantalla profesional de alto brillo con sistema integrado y montaje completo.',
    image: hb43,
    imageAlt: 'Pantalla instalada en escaparate moderno',
    includedLabel: 'Incluye',
    bullets: ['Monitor profesional Full HD / 4K', 'Mini PC integrado', 'Soporte profesional', 'Instalacion incluida', 'Configuracion inicial'],
  },
  {
    id: 'hb-49',
    title: '49" HB',
    description: 'Pantalla profesional de alto brillo con sistema integrado y montaje completo.',
    image: hb49,
    imageAlt: 'Pantalla instalada en retail premium',
    includedLabel: 'Incluye',
    bullets: ['Monitor profesional Full HD / 4K', 'Mini PC integrado', 'Soporte profesional', 'Instalacion incluida', 'Configuracion inicial'],
  },
  {
    id: 'hb-55',
    title: '55" HB',
    description: 'Pantalla profesional de alto brillo con sistema integrado y montaje completo.',
    image: hb55,
    imageAlt: 'Pantalla instalada en showroom iluminado',
    includedLabel: 'Incluye',
    bullets: ['Monitor profesional Full HD / 4K', 'Mini PC integrado', 'Soporte profesional', 'Instalacion incluida', 'Configuracion inicial'],
  },
  {
    id: 'hb-65',
    title: '65" HB',
    description: 'Pantalla profesional de alto brillo con sistema integrado y montaje completo.',
    image: hb65,
    imageAlt: 'Pantalla instalada en farmacia moderna',
    includedLabel: 'Incluye',
    bullets: ['Monitor profesional Full HD / 4K', 'Mini PC integrado', 'Soporte profesional', 'Instalacion incluida', 'Configuracion inicial'],
  },
  {
    id: 'hb-75',
    title: '75" HB',
    description: 'Pantalla profesional de alto brillo con sistema integrado y montaje completo.',
    image: hb75,
    imageAlt: 'Pantalla instalada en concesionario',
    includedLabel: 'Incluye',
    bullets: ['Monitor profesional Full HD / 4K', 'Mini PC integrado', 'Soporte profesional', 'Instalacion incluida', 'Configuracion inicial'],
  },
  {
    id: 'hb-86',
    title: '86" HB',
    description: 'Pantalla profesional de alto brillo con sistema integrado y montaje completo.',
    image: hb86,
    imageAlt: 'Pantalla instalada en espacio retail premium',
    includedLabel: 'Incluye',
    bullets: ['Monitor profesional Full HD / 4K', 'Mini PC integrado', 'Soporte profesional', 'Instalacion incluida', 'Configuracion inicial'],
  },
];

export const d60Products: ProductCardData[] = [
  {
    id: 'd60-43',
    title: '43" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: d6043,
    imageAlt: 'Pantalla instalada en restaurante moderno',
    includedLabel: 'Incluye',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
  {
    id: 'd60-50',
    title: '50" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: d6050,
    imageAlt: 'Pantalla instalada en oficina',
    includedLabel: 'Incluye',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
  {
    id: 'd60-55',
    title: '55" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: catalogImage2,
    imageAlt: 'Pantalla instalada en peluqueria',
    includedLabel: 'Incluye',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
  {
    id: 'd60-65',
    title: '65" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: catalogImage1,
    imageAlt: 'Pantalla instalada en tienda de barrio',
    includedLabel: 'Incluye',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
  {
    id: 'd60-75',
    title: '75" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: d6075,
    imageAlt: 'Pantalla instalada en recepcion corporativa',
    includedLabel: 'Incluye',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
  {
    id: 'd60-85',
    title: '85" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: d6085,
    imageAlt: 'Pantalla instalada en espacio comercial interior',
    includedLabel: 'Incluye',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
  {
    id: 'd60-96',
    title: '96" Digital Signage',
    description: 'Pantalla comercial con sistema integrado, ideal para uso interior.',
    image: d6096,
    imageAlt: 'Pantalla instalada en zona corporativa',
    includedLabel: 'Incluye',
    bullets: ['Panel digital profesional', 'Mini PC incluido', 'Soporte mural', 'Instalacion y configuracion', 'Lista para publicar contenido'],
  },
];

export const ledProducts: ProductCardData[] = [
  {
    id: 'led-pro-cob-15',
    title: 'LED PRO COB 1.5',
    description: 'Maxima definicion · Tecnologia avanzada · Resistencia superior.',
    basedOn: 'UNILUMIN COB 1.5',
    sku: 'UNI-UMINIP15-COB',
    positioning:
      'Pantalla LED de ultra alta definicion con tecnologia COB encapsulada, disenada para entornos corporativos y retail premium donde la calidad visual es critica.',
    image: project7,
    imageAlt: 'Pantalla LED premium en showroom corporativo',
    idealFor: ['Showrooms', 'Salas de juntas', 'Auditorios', 'Retail de lujo', 'Entornos corporativos de alto nivel'],
    includedLabel: 'Incluye por m²',
    bullets: [
      'Modulos LED COB 1.5 mm',
      'Cabinets de aluminio de alta precision',
      'Estructura metalica de fijacion',
      'Sistema de alimentacion y cableado',
      'Procesador de video profesional',
      'Instalacion completa',
      'Configuracion inicial',
      'Puesta en marcha',
    ],
    highlights: [
      'Imagen totalmente uniforme',
      'Mayor resistencia al impacto',
      'Mejor contraste real',
      'Mayor durabilidad',
      'Tecnologia premium',
    ],
  },
  {
    id: 'led-pro-smd-15',
    title: 'LED PRO SMD 1.5',
    description: 'Alta definicion profesional.',
    basedOn: 'BOE 1.5 SMD',
    sku: 'BOE-CABINET15-SMD',
    positioning:
      'Solucion LED profesional de alta resolucion para entornos interiores que requieren calidad visual elevada sin llegar a tecnologia COB.',
    image: project5,
    imageAlt: 'Pantalla LED interior profesional en entorno corporativo',
    idealFor: ['Oficinas', 'Clinicas', 'Retail medio-alto', 'Restauracion premium', 'Centros formativos'],
    includedLabel: 'Incluye por m²',
    bullets: [
      'Modulos LED SMD 1.5 mm',
      'Cabinets modulares',
      'Estructura de soporte',
      'Sistema electrico completo',
      'Procesador LED',
      'Instalacion profesional',
      'Ajuste y calibracion',
    ],
    highlights: [
      'Excelente definicion',
      'Gran angulo de vision',
      'Integracion limpia',
      'Equilibrio calidad-coste',
    ],
  },
  {
    id: 'led-pro-smd-18',
    title: 'LED PRO SMD 1.8',
    description: 'Solucion eficiente de alto impacto.',
    basedOn: 'UNILUMIN 1.8 SMD',
    sku: 'UNI-UDAII18-SMD',
    positioning:
      'Pantalla LED interior optimizada para impacto visual y presupuesto contenido.',
    image: catalogImage4,
    imageAlt: 'Pantalla LED interior de alto impacto en retail',
    idealFor: ['Restaurantes', 'Tiendas', 'Gimnasios', 'Centros educativos', 'Empresas que priorizan impacto visual con una inversion equilibrada'],
    includedLabel: 'Incluye por m²',
    bullets: [
      'Modulos LED SMD 1.8 mm',
      'Cabinets interiores',
      'Estructura metalica',
      'Sistema electrico',
      'Procesador',
      'Instalacion completa',
      'Ajuste inicial',
    ],
    highlights: [
      'Buena definicion para distancias medias',
      'Solucion eficiente',
      'Instalacion rapida',
      'Alto impacto visual',
    ],
  },
];

export const productLines: ProductLine[] = [
  {
    id: 'led',
    badge: 'Pantalla LED',
    title: 'Linea LED AV TECH',
    subtitle: 'Pantalla LED profesional para impacto visual, definicion y presencia arquitectonica.',
    description: 'Soluciones LED comerciales por m² para corporate, retail premium, showrooms y espacios interiores de alto valor visual.',
    pricingNote: 'Precio por m² · Solucion completa instalada · Sin costes ocultos.',
    tone: 'led',
    products: ledProducts,
  },
  {
    id: 'hb',
    title: 'Linea Profesional HB',
    subtitle: 'Maximo brillo, maxima resistencia, rendimiento continuo 24/7',
    description: 'Pensada para escaparates, exteriores protegidos y entornos de alta luminosidad.',
    pricingNote: 'Precio por pantalla · Solucion completa instalada · Sin costes ocultos.',
    tone: 'hb',
    products: hbProducts,
  },
  {
    id: 'd60',
    badge: 'Mas economica',
    title: 'Linea Comercial D60',
    subtitle: 'Solucion eficiente y accesible para comunicacion digital en interiores',
    description: 'Ideal para tiendas, oficinas, restaurantes y espacios comerciales.',
    pricingNote: 'Precio por pantalla · Solucion completa instalada · Sin costes ocultos.',
    tone: 'd60',
    products: d60Products,
  },
];

export const packCatalogSchema = {
  '@context': 'https://schema.org',
  '@type': 'OfferCatalog',
  name: 'Catalogo de packs Digital Signage AV TECH',
  description:
    'Linea LED AV TECH, Linea Profesional HB de alto brillo y Linea Comercial D60 para digital signage en retail, oficinas, restauracion y espacios corporativos.',
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
        sku: product.sku,
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
        })).concat(
          product.basedOn
            ? [{
                '@type': 'PropertyValue',
                name: 'Basado en',
                value: product.basedOn,
              }]
            : [],
          product.positioning
            ? [{
                '@type': 'PropertyValue',
                name: 'Posicionamiento',
                value: product.positioning,
              }]
            : [],
        ),
      },
    })),
  })),
};

export const catalogSeoFaqs = [
  {
    question: 'Que pack de digital signage es mejor para un escaparate con mucha luz?',
    answer:
      'La linea Profesional HB esta pensada para escaparates, zonas de paso y entornos con alta luminosidad. Su alto brillo y resistencia la hacen adecuada para visibilidad continua durante el dia.',
  },
  {
    question: 'Cuando conviene elegir una pantalla LED AV TECH frente a un monitor profesional?',
    answer:
      'La linea LED AV TECH encaja mejor cuando el proyecto necesita formato por m², mayor presencia arquitectonica, impacto visual premium o resoluciones LED para showrooms, corporate y retail de alto nivel.',
  },
  {
    question: 'Que diferencia hay entre la linea HB y la linea D60?',
    answer:
      'HB prioriza brillo, resistencia y uso intensivo en entornos exigentes. D60 esta orientada a comunicacion digital interior con una solucion mas eficiente para tiendas, oficinas, restauracion y espacios comerciales.',
  },
  {
    question: 'Que incluye una solucion de digital signage de AV TECH?',
    answer:
      'Segun la gama, la solucion puede incluir pantalla o modulos LED, estructura, sistema electrico, procesador, soporte, instalacion, configuracion inicial y puesta en marcha, para facilitar una implantacion profesional del proyecto.',
  },
] as const;

export const catalogFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: catalogSeoFaqs.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export const comparisonFeatures = {
  hb: [
    'Alto brillo',
    'Preparada para entornos luminosos',
    'Mayor resistencia',
    'Uso intensivo 24/7',
  ],
  d60: [
    'Excelente relacion calidad-precio',
    'Uso interior',
    'Ideal para comunicacion diaria',
    'Solucion versatil',
  ],
  led: [
    'Formatos LED por m²',
    'Mas impacto arquitectonico',
    'Alta definicion para interior premium',
    'Solucion avanzada para corporate y retail',
  ],
} as const;
