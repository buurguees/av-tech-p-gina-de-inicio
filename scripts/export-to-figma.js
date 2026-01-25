/**
 * Script para exportar páginas de NexoAV a Figma
 * 
 * Requisitos:
 * 1. Token de acceso de Figma (Personal Access Token)
 * 2. File Key del archivo de Figma donde exportar
 * 
 * Configuración:
 * - Crea un archivo .env en la raíz del proyecto con:
 *   FIGMA_ACCESS_TOKEN=tu_token_aqui
 *   FIGMA_FILE_KEY=tu_file_key_aqui
 */

const fs = require('fs');
const path = require('path');

// Lista de todas las páginas a exportar
const PAGES = [
  // Principales
  { name: 'Dashboard', file: 'Dashboard.tsx', category: 'Principales' },
  { name: 'Clients', file: 'ClientsPage.tsx', category: 'Principales' },
  { name: 'Quotes', file: 'QuotesPage.tsx', category: 'Principales' },
  { name: 'Catalog', file: 'CatalogPage.tsx', category: 'Principales' },
  { name: 'Invoices', file: 'InvoicesPage.tsx', category: 'Principales' },
  { name: 'Projects', file: 'ProjectsPage.tsx', category: 'Principales' },
  { name: 'Lead Map', file: 'LeadMapPage.tsx', category: 'Principales' },
  { name: 'Settings', file: 'SettingsPage.tsx', category: 'Principales' },
  
  // Detalle
  { name: 'Client Detail', file: 'ClientDetailPage.tsx', category: 'Detalle' },
  { name: 'Quote Detail', file: 'QuoteDetailPage.tsx', category: 'Detalle' },
  { name: 'Invoice Detail', file: 'InvoiceDetailPage.tsx', category: 'Detalle' },
  { name: 'Project Detail', file: 'ProjectDetailPage.tsx', category: 'Detalle' },
  { name: 'Product Detail', file: 'ProductDetailPage.tsx', category: 'Detalle' },
  { name: 'Technician Detail', file: 'TechnicianDetailPage.tsx', category: 'Detalle' },
  { name: 'Supplier Detail', file: 'SupplierDetailPage.tsx', category: 'Detalle' },
  { name: 'Audit Event Detail', file: 'AuditEventDetailPage.tsx', category: 'Detalle' },
  { name: 'Tax Detail', file: 'TaxDetailPage.tsx', category: 'Detalle' },
  
  // Creación/Edición
  { name: 'New Quote', file: 'NewQuotePage.tsx', category: 'Creación/Edición' },
  { name: 'Edit Quote', file: 'EditQuotePage.tsx', category: 'Creación/Edición' },
  { name: 'New Invoice', file: 'NewInvoicePage.tsx', category: 'Creación/Edición' },
  { name: 'Edit Invoice', file: 'EditInvoicePage.tsx', category: 'Creación/Edición' },
  { name: 'New Purchase Invoice', file: 'NewPurchaseInvoicePage.tsx', category: 'Creación/Edición' },
  { name: 'Purchase Invoice Detail', file: 'PurchaseInvoiceDetailPage.tsx', category: 'Creación/Edición' },
  
  // Gestión
  { name: 'Users', file: 'UsersPage.tsx', category: 'Gestión' },
  { name: 'Technicians', file: 'TechniciansPage.tsx', category: 'Gestión' },
  { name: 'Suppliers', file: 'SuppliersPage.tsx', category: 'Gestión' },
  { name: 'Purchase Invoices', file: 'PurchaseInvoicesPage.tsx', category: 'Gestión' },
  { name: 'Expenses', file: 'ExpensesPage.tsx', category: 'Gestión' },
  { name: 'Accounting', file: 'AccountingPage.tsx', category: 'Gestión' },
  { name: 'Reports', file: 'ReportsPage.tsx', category: 'Gestión' },
  { name: 'Audit', file: 'AuditPage.tsx', category: 'Gestión' },
  { name: 'Calculator', file: 'CalculatorPage.tsx', category: 'Gestión' },
  
  // Mapas
  { name: 'Client Map', file: 'ClientMapPage.tsx', category: 'Mapas' },
  { name: 'Project Map', file: 'ProjectMapPage.tsx', category: 'Mapas' },
  { name: 'Tech Map', file: 'TechMapPage.tsx', category: 'Mapas' },
  
  // Sistema
  { name: 'Login', file: 'Login.tsx', category: 'Sistema' },
  { name: 'Account Setup', file: 'AccountSetup.tsx', category: 'Sistema' },
  { name: 'Not Found', file: 'NotFound.tsx', category: 'Sistema' },
];

// Dimensiones estándar para cada frame
const FRAME_DIMENSIONS = {
  width: 1440,
  height: 1024,
};

/**
 * Crea un frame en Figma usando la API
 */
async function createFrameInFigma(accessToken, fileKey, pageName, category, parentNodeId = null) {
  const url = `https://api.figma.com/v1/files/${fileKey}/nodes`;
  
  const frameData = {
    name: pageName,
    type: 'FRAME',
    x: 0,
    y: 0,
    width: FRAME_DIMENSIONS.width,
    height: FRAME_DIMENSIONS.height,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }], // Fondo oscuro
    children: [],
  };

  try {
    // Nota: La API de Figma no permite crear nodos directamente de esta manera
    // Este es un ejemplo de la estructura que necesitarías
    // Para crear frames realmente, necesitarías usar el plugin API o la REST API con endpoints específicos
    
    console.log(`📄 Frame creado: ${pageName} (${category})`);
    return frameData;
  } catch (error) {
    console.error(`❌ Error creando frame ${pageName}:`, error);
    throw error;
  }
}

/**
 * Función principal
 */
async function exportToFigma() {
  // Cargar variables de entorno
  const envPath = path.join(__dirname, '..', '.env');
  let accessToken, fileKey;
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars = envContent.split('\n').reduce((acc, line) => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        acc[key.trim()] = valueParts.join('=').trim();
      }
      return acc;
    }, {});
    
    accessToken = envVars.FIGMA_ACCESS_TOKEN;
    fileKey = envVars.FIGMA_FILE_KEY;
  } else {
    // Intentar desde variables de entorno del sistema
    accessToken = process.env.FIGMA_ACCESS_TOKEN;
    fileKey = process.env.FIGMA_FILE_KEY;
  }

  if (!accessToken || !fileKey) {
    console.error('❌ Error: Se requieren FIGMA_ACCESS_TOKEN y FIGMA_FILE_KEY');
    console.log('\n📝 Crea un archivo .env en la raíz del proyecto con:');
    console.log('FIGMA_ACCESS_TOKEN=tu_token_aqui');
    console.log('FIGMA_FILE_KEY=tu_file_key_aqui');
    console.log('\n🔗 Obtén tu token en: https://www.figma.com/developers/api#access-tokens');
    process.exit(1);
  }

  console.log('🚀 Iniciando exportación a Figma...\n');
  console.log(`📊 Total de páginas: ${PAGES.length}\n`);

  // Agrupar páginas por categoría
  const pagesByCategory = PAGES.reduce((acc, page) => {
    if (!acc[page.category]) {
      acc[page.category] = [];
    }
    acc[page.category].push(page);
    return acc;
  }, {});

  // Mostrar resumen
  console.log('📋 Páginas por categoría:');
  Object.entries(pagesByCategory).forEach(([category, pages]) => {
    console.log(`  ${category}: ${pages.length} páginas`);
  });

  console.log('\n⚠️  NOTA: Este script es un template.');
  console.log('La API de Figma REST no permite crear frames directamente.');
  console.log('Opciones:');
  console.log('1. Usar el Plugin API de Figma (requiere plugin)');
  console.log('2. Usar herramientas como html.to.design');
  console.log('3. Exportar manualmente con screenshots');
  console.log('\n💡 Recomendación: Usa un plugin de Figma o exporta manualmente.');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  exportToFigma().catch(console.error);
}

module.exports = { exportToFigma, PAGES };
