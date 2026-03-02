# AV TECH - Soluciones Audiovisuales Profesionales

## Sobre el Proyecto

Sitio web corporativo de **AV TECH**, empresa líder en soluciones audiovisuales profesionales. Especialistas en pantallas LED, cartelería digital, sistemas de sonido y gestión de contenidos para negocios.

**URL**: [https://avtechesdeveniments.com/](https://avtechesdeveniments.com/)

## Servicios

- 🖥️ **Pantallas LED** - Interior y exterior
- 📺 **Cartelería Digital** - Señalización digital interactiva
- 🔊 **Sistemas de Sonido** - Audio profesional
- 📱 **Gestión de Contenidos** - Plataforma centralizada
- 🛠️ **Instalación y Soporte** - Técnicos especializados
- 📦 **Alquiler de Equipos** - Soluciones flexibles

## Tecnologías Utilizadas

Este proyecto está construido con tecnologías modernas:

- **Vite** - Build tool ultrarrápido
- **React 18** - Framework de interfaz de usuario
- **TypeScript** - Tipado estático para JavaScript
- **Tailwind CSS** - Framework CSS utility-first
- **shadcn/ui** - Componentes UI accesibles y personalizables
- **Supabase** - Backend as a Service
- **React Router** - Navegación
- **Framer Motion** - Animaciones fluidas

## Instalación y Desarrollo

### Requisitos Previos

- Node.js 18+ y npm instalados - [instalar con nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Pasos de Instalación

```sh
# Paso 1: Clonar el repositorio
git clone <YOUR_GIT_URL>

# Paso 2: Navegar al directorio del proyecto
cd av-tech-p-gina-de-inicio

# Paso 3: Instalar dependencias
npm install

# Paso 4: Iniciar el servidor de desarrollo
npm run dev
```

El sitio estará disponible en `http://localhost:8080`

## Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run build:dev` - Construye en modo desarrollo
- `npm run preview` - Preview de la build de producción
- `npm run lint` - Ejecuta el linter

## Estructura del Proyecto

```
├── public/                # Archivos estáticos públicos
├── src/
│   ├── app/
│   │   └── routes/        # Router modular por dominios
│   ├── marketing/         # Web pública one-page y legales
│   │   ├── components/
│   │   └── pages/
│   ├── components/
│   │   └── ui/            # UI compartida y base shadcn
│   ├── pages/
│   │   ├── nexo_av/       # Plataforma NEXO AV (desktop/mobile/shared)
│   │   └── presentations/ # Presentaciones públicas específicas
│   ├── hooks/             # Hooks compartidos
│   ├── integrations/      # Integraciones (Supabase, etc.)
│   ├── lib/               # Utilidades
│   └── assets/            # Recursos visuales
├── scripts/               # Scripts operativos
├── docs/                  # Documentación funcional/técnica
├── audits/                # Auditorías y reportes internos
├── supabase/              # Migraciones, funciones y config
└── index.html             # Punto de entrada HTML
```

### Criterio de organización

- `marketing/` agrupa todo lo relativo a la web corporativa pública.
- `pages/nexo_av/` concentra la plataforma interna NEXO AV.
- `app/routes/` separa el enrutado por producto para evitar un `App.tsx` monolítico.
- `components/ui/` queda reservado para piezas de UI reutilizables entre dominios.

Esta estructura está preparada para una siguiente fase donde nuevos productos de la empresa puedan entrar sin mezclar su código con la landing o con NEXO AV.

## Despliegue

### Opción 1: Vercel
```sh
npm install -g vercel
vercel
```

### Opción 2: Netlify
```sh
npm run build
# Arrastra la carpeta dist/ a Netlify
```

## Optimización SEO

El sitio incluye:
- Meta tags optimizados para buscadores
- Open Graph para redes sociales
- Sitemap XML
- robots.txt configurado
- URLs canónicas
- Schema.org markup
- Rendimiento optimizado (Lighthouse 90+)

## Palabras Clave Objetivo

- Soluciones audiovisuales
- Pantallas LED
- Cartelería digital
- Publicidad digital
- Señalización digital
- Sistemas de sonido
- Instaladores audiovisuales
- Gestión de contenidos
- Digital signage
- Pantallas publicitarias

## Contacto

**AV TECH ESDEVENIMENTS SL**
- Web: https://avtechesdeveniments.com/
- Email: info@avtechesdeveniments.com

## Licencia

© 2025 AV TECH ESDEVENIMENTS SL. Todos los derechos reservados.
