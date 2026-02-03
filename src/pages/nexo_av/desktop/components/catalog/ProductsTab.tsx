import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, Search, Loader2, Upload, FileSpreadsheet, Eye, Power, Archive, Package } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import DataList, { DataListColumn, DataListAction } from '../common/DataList';
import { ProductImportDialog } from './ProductImportDialog';
import SupplierSearchInput from '../suppliers/SupplierSearchInput';

type ProductType = 'product' | 'service';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  product_type: 'PRODUCT' | 'SERVICE';
  category_id: string | null;
  category_name: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  unit: string;
  cost_price: number | null;
  sale_price: number;
  discount_percent: number;
  sale_price_effective: number;
  tax_rate: number;
  margin_percentage: number | null;
  track_stock: boolean;
  stock_quantity: number;
  min_stock_alert: number | null;
  is_active: boolean;
  has_low_stock_alert: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  domain: string;
  product_count: number;
}


interface ProductsTabProps {
  isAdmin: boolean;
  filterType: ProductType;
}

interface Tax {
  id: string;
  code: string;
  name: string;
  rate: number;
  is_active: boolean;
  is_default: boolean;
}

interface NewProductForm {
  categoryId: string;
  supplierId: string;
  sku: string;
  name: string;
  description: string;
  costPrice: string;
  salePrice: string;
  discountPercent: string;
  taxId: string;
  taxRate: string;
  stock: string;
  minStockAlert: string;
  trackStock: boolean;
}

const TYPE_OPTIONS = [
  { value: 'product', label: 'Producto', description: 'Tiene stock y coste fijo' },
  { value: 'service', label: 'Servicio', description: 'Sin stock, coste variable' },
];

const getInitialFormState = (filterType: ProductType, defaultTaxId?: string, defaultTaxRate?: number): NewProductForm => ({
  categoryId: '',
  supplierId: '',
  sku: '',
  name: '',
  description: '',
  costPrice: '0',
  salePrice: '0',
  discountPercent: '0',
  taxId: defaultTaxId || '',
  taxRate: String(defaultTaxRate ?? 21),
  stock: '0',
  minStockAlert: '',
  trackStock: filterType === 'product',
});

export default function ProductsTab({ isAdmin, filterType }: ProductsTabProps) {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [salesTaxes, setSalesTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [formData, setFormData] = useState<NewProductForm>(getInitialFormState(filterType));
  const [supplierSearchValue, setSupplierSearchValue] = useState('');
  const [saving, setSaving] = useState(false);

  const isProductTab = filterType === 'product';
  const itemLabel = isProductTab ? 'Producto' : 'Servicio';

  /* Prioridad 1-4 = siempre visible; 5+ = según ancho (DataList oculta sin priority en viewport < 2000px) */
  const catalogColumns: DataListColumn<Product>[] = [
    { key: 'sku', label: `Nº ${itemLabel}`, align: 'left' as const, width: '100px', priority: 1, render: (p) => <span className="text-foreground/80 font-mono text-[11px]">{p.sku}</span> },
    { key: 'name', label: 'Nombre', align: 'left' as const, width: 'minmax(180px, 2.5fr)', priority: 2, render: (p) => <span className="text-foreground font-medium truncate block">{p.name}</span> },
    { key: 'status', label: 'Estado', align: 'center' as const, width: '80px', priority: 3, render: (p) => <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 w-14 justify-center", p.is_active ? "status-success" : "status-error")}>{p.is_active ? 'Activo' : 'Inactivo'}</Badge> },
    { key: 'pvp', label: 'PVP (con IVA)', align: 'right' as const, width: 'minmax(95px, 0.9fr)', priority: 4, render: (p) => <span className="text-foreground tabular-nums font-medium">{(p.sale_price_effective * (1 + p.tax_rate / 100)).toFixed(2)} €</span> },
    { key: 'category_name', label: 'Categoría', align: 'left' as const, width: 'minmax(100px, 1fr)', priority: 5, render: (p) => <span className="text-muted-foreground">{p.category_name ?? '-'}</span> },
    ...(isProductTab ? [{ key: 'supplier_name', label: 'Proveedor', align: 'left' as const, width: 'minmax(110px, 1fr)', priority: 5, render: (p: Product) => <span className="text-muted-foreground">{p.supplier_name ?? '-'}</span> } as DataListColumn<Product>] : []),
    ...(isProductTab ? [{ key: 'stock_quantity', label: 'Stock', align: 'center' as const, width: '70px', priority: 5, render: (p: Product) => <span className="text-muted-foreground tabular-nums">{p.stock_quantity ?? 0}</span> } as DataListColumn<Product>] : []),
    { key: 'cost_price', label: isProductTab ? 'Coste' : 'Coste Ref.', align: 'right' as const, width: 'minmax(90px, 0.9fr)', priority: 6, render: (p) => <span className="text-muted-foreground tabular-nums">{(p.cost_price ?? 0).toFixed(2)} €</span> },
    { key: 'sale_price_effective', label: 'Precio Base', align: 'right' as const, width: 'minmax(90px, 0.9fr)', priority: 6, render: (p) => <span className="text-foreground tabular-nums">{p.sale_price_effective.toFixed(2)} €</span> },
    { key: 'tax_rate', label: 'IVA', align: 'center' as const, width: '70px', priority: 6, render: (p) => <Badge variant="outline" className="text-[10px] px-1.5 py-0 w-12 justify-center">{p.tax_rate}%</Badge> },
  ].flat();

  const catalogActions: DataListAction<Product>[] = [
    { label: 'Ver detalles', icon: <Eye className="w-4 h-4 mr-2" />, onClick: (p) => handleViewDetails(p.id) },
    ...(isAdmin ? [{ label: 'Desactivar', icon: <Power className="w-4 h-4 mr-2" />, onClick: (p) => handleToggleActive(p.id, p.is_active), condition: (p) => p.is_active } as DataListAction<Product>] : []),
    ...(isAdmin ? [{ label: 'Activar', icon: <Power className="w-4 h-4 mr-2" />, onClick: (p) => handleToggleActive(p.id, p.is_active), condition: (p) => !p.is_active } as DataListAction<Product>] : []),
    ...(isAdmin ? [{ label: 'Archivar', icon: <Archive className="w-4 h-4 mr-2" />, onClick: (p) => handleArchiveProduct(p.id), variant: 'destructive' as const } as DataListAction<Product>] : []),
  ].flat();

  useEffect(() => {
    loadData();
  }, [filterType]);

  useEffect(() => {
    loadProducts();
  }, [filterCategory, search]);

  const catalogDomain = filterType === 'product' ? 'PRODUCT' : 'SERVICE';

  const loadData = async () => {
    try {
      const [categoriesRes, taxesRes] = await Promise.all([
        (supabase.rpc as any)('list_catalog_categories', { p_domain: catalogDomain }),
        (supabase.rpc as any)('list_catalog_tax_rates')
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (taxesRes.error) throw taxesRes.error;

      setCategories(categoriesRes.data || []);
      setSalesTaxes((taxesRes.data || []).map((t: { id: string; name: string; rate: number; is_default: boolean; is_active: boolean }) => ({
        id: t.id,
        code: t.name,
        name: t.name,
        rate: t.rate,
        is_default: t.is_default,
        is_active: t.is_active
      })));

      await loadProducts();
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('list_catalog_products', {
        p_domain: catalogDomain,
        p_category_id: filterCategory !== 'all' ? filterCategory : null,
        p_search: search || null,
        p_include_inactive: true
      });

      if (error) throw error;
      setProducts((data || []) as Product[]);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error(`Error al cargar ${isProductTab ? 'productos' : 'servicios'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden añadir productos');
      return;
    }
    const defaultTax = salesTaxes.find(t => t.is_default) || salesTaxes[0];
    setFormData(getInitialFormState(filterType, defaultTax?.id, defaultTax?.rate));
    setSupplierSearchValue('');
    setShowAddDialog(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    const sku = formData.sku.trim() || (filterType === 'product' ? `PRD-${Date.now()}` : `SRV-${Date.now()}`);
    if (!formData.categoryId) {
      toast.error('Selecciona una categoría');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await (supabase.rpc as any)('create_catalog_product', {
        p_sku: sku,
        p_name: formData.name.trim().toUpperCase(),
        p_product_type: filterType === 'product' ? 'PRODUCT' : 'SERVICE',
        p_category_id: formData.categoryId || null,
        p_unit: filterType === 'product' ? 'ud' : 'hora',
        p_cost_price: parseFloat(formData.costPrice) || null,
        p_sale_price: parseFloat(formData.salePrice) || 0,
        p_discount_percent: parseFloat(formData.discountPercent) || 0,
        p_tax_rate_id: formData.taxId || null,
        p_description: formData.description.trim() || null,
        p_track_stock: formData.trackStock,
        p_min_stock_alert: formData.minStockAlert ? parseFloat(formData.minStockAlert) : null,
        p_supplier_id: formData.supplierId || null
      });

      if (error) throw error;

      toast.success(`${itemLabel} ${sku} creado`);
      setShowAddDialog(false);
      await loadProducts();
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Error al crear producto');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (productId: string, currentlyActive: boolean) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden modificar productos');
      return;
    }

    try {
      const { error } = await (supabase.rpc as any)('update_catalog_product', {
        p_id: productId,
        p_is_active: !currentlyActive
      });
      if (error) throw error;
      toast.success(currentlyActive ? 'Producto desactivado' : 'Producto activado');
      await loadProducts();
    } catch (error) {
      console.error('Error toggling product:', error);
      toast.error('Error al actualizar producto');
    }
  };

  const handleArchiveProduct = async (productId: string) => {
    // TODO: Implement archive functionality
    toast.info('Funcionalidad de archivar próximamente');
  };

  const handleViewDetails = (productId: string) => {
    if (!userId) return;
    navigate(`/nexo-av/${userId}/catalog/${productId}`);
  };


  const exportToExcel = async () => {
    // Import ExcelJS dynamically
    const ExcelJS = (await import('exceljs')).default;
    
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Catalogo Master');
    
    // Headers matching the master format + Stock column (R)
    const headers = [
      'Codigo',              // A: product_number
      'Categoria',           // B: category_code
      'Nombre Categoria',    // C: category_name
      'Subcategoria',        // D: subcategory_code (full: CAT-XX format)
      'Subcategoria (ES)',   // E: subcategory_name
      'Nombre',              // F: name
      'Descripcion',         // G: description
      'Tipo',                // H: type (product/service)
      'Unidad Medida',       // I: unit (empty for now)
      'Estado',              // J: status
      'Coste',               // K: cost_price
      'Proveedor',           // L: provider (empty for now)
      'Margen Aplicado',     // M: margin (calculated)
      'Precio Venta (sin IVA)', // N: base_price
      'IVA %',               // O: tax_rate
      'Precio Final (con IVA)', // P: price_with_tax
      'Impuesto',            // Q: tax_code (e.g. IVA21)
      'Stock',               // R: stock
    ];

    // Add header row
    worksheet.addRow(headers);
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1a1a2e' }
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows (catalog V2: sku, category_name, sale_price_effective, stock_quantity)
    products.forEach(p => {
      const cost = p.cost_price ?? 0;
      const margin = cost > 0 && p.margin_percentage != null
        ? `${p.margin_percentage.toFixed(2)}%`
        : '';
      const taxCode = `IVA${Math.round(p.tax_rate)}`;
      const priceWithTax = p.sale_price_effective * (1 + p.tax_rate / 100);

      worksheet.addRow([
        p.sku,                               // A
        p.category_name ?? '',                // B
        p.category_name ?? '',                // C
        '',                                  // D: Subcategoría (catalog no usa)
        '',                                  // E
        p.name,                              // F
        p.description || '',                 // G
        p.product_type === 'SERVICE' ? 'Service' : 'product', // H
        p.unit || '',                        // I
        p.is_active ? 'Activo' : 'Inactivo', // J
        cost > 0 ? `€ ${cost.toFixed(2)}` : '', // K
        '',                                  // L
        margin,                              // M
        `€ ${p.sale_price_effective.toFixed(2)}`, // N
        `${p.tax_rate}%`,                    // O
        `€ ${priceWithTax.toFixed(2)}`,       // P
        taxCode,                             // Q
        p.stock_quantity ?? 0,               // R
      ]);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Generate and download
    const filename = `Catalogo_${isProductTab ? 'Productos' : 'Servicios'}_Master_${new Date().toISOString().split('T')[0]}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Catálogo exportado correctamente');
  };

  const downloadTemplate = () => {
    // Catalog V2: categorías pueden tener parent_id; subcategorías = categorías hijas
    const categoryInfo = categories.map(c => {
      const subs = categories.filter(s => s.parent_id === c.id);
      const subInfo = subs.length > 0
        ? subs.map(s => `${s.slug} = ${s.name}`).join(', ')
        : 'Sin subcategorías';
      return `${c.slug} = ${c.name} (Subcats: ${subInfo})`;
    }).join('\n');

    const headers = ['Código Categoría', 'Código Subcategoría', 'Nombre', 'Descripción', 'Precio Coste', 'Precio Base', 'Impuesto %'];
    const exampleRow = ['SP', '01', 'NOMBRE DEL PRODUCTO', 'Descripción opcional', '50.00', '100.00', '21'];
    
    const content = [
      '# PLANTILLA DE IMPORTACIÓN DE PRODUCTOS',
      '# =====================================',
      '# Instrucciones:',
      '# - Rellena las filas debajo de las cabeceras',
      '# - El código de categoría debe coincidir con los existentes',
      '# - El código de subcategoría es opcional (dejar vacío si no aplica)',
      '# - Los precios usan punto como separador decimal',
      '# - Impuesto: 21 (IVA 21%), 10 (IVA 10%), 4 (IVA 4%), 0 (Exento)',
      '#',
      '# CATEGORÍAS DISPONIBLES:',
      ...categoryInfo.split('\n').map(line => `# ${line}`),
      '#',
      headers.join('\t'),
      exampleRow.join('\t')
    ].join('\n');

    const blob = new Blob(['\ufeff' + content], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_importacion_productos.xls';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Plantilla descargada');
  };

  const handleImportClick = () => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden importar productos');
      return;
    }
    setShowImportDialog(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => !line.startsWith('#') && line.trim());
      
      if (lines.length < 2) {
        toast.error('El archivo no contiene datos para importar');
        return;
      }

      const dataLines = lines.slice(1);
      let imported = 0;
      let errors = 0;

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const cols = line.split('\t');
        if (cols.length < 6) continue;

        const [catCode, _subCode, name, description, costPrice, basePrice, taxRate] = cols;
        const category = categories.find(c => c.slug === catCode.trim());
        if (!category) {
          console.error(`Categoría no encontrada: ${catCode}`);
          errors++;
          continue;
        }

        const sku = (filterType === 'product' ? 'PRD' : 'SRV') + '-' + String(i + 1).padStart(4, '0');
        try {
          const { error } = await (supabase.rpc as any)('create_catalog_product', {
            p_sku: sku,
            p_name: name?.trim() || 'IMPORTADO',
            p_product_type: filterType === 'product' ? 'PRODUCT' : 'SERVICE',
            p_category_id: category.id,
            p_unit: filterType === 'product' ? 'ud' : 'hora',
            p_cost_price: parseFloat(costPrice) || null,
            p_sale_price: parseFloat(basePrice) || 0,
            p_discount_percent: 0,
            p_tax_rate_id: null,
            p_description: description?.trim() || null,
            p_track_stock: filterType === 'product',
            p_min_stock_alert: null
          });

          if (error) throw error;
          imported++;
        } catch (err) {
          console.error('Error importing product:', err);
          errors++;
        }
      }

      toast.success(`Importación completada: ${imported} productos creados${errors > 0 ? `, ${errors} errores` : ''}`);
      await loadProducts();
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Error al leer el archivo');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx,.csv,.tsv,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-zinc-900/95 backdrop-blur-2xl border-white/10 text-white max-w-lg rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Nuevo {itemLabel}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Categoría *</Label>
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-white">
                        {c.slug} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Código (SKU)</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  placeholder={isProductTab ? "Ej: PRD-0001" : "Ej: SRV-0001"}
                  className="bg-white/5 border-white/10 text-white font-mono"
                />
              </div>
            </div>

            {isProductTab && (
              <div className="space-y-2">
                <Label className="text-white/70">Proveedor (a quien compramos el material)</Label>
                <SupplierSearchInput
                  entityType="SUPPLIER"
                  value={supplierSearchValue}
                  onChange={(v) => {
                    setSupplierSearchValue(v);
                    if (!v.trim()) setFormData(prev => ({ ...prev, supplierId: '' }));
                  }}
                  onSelectSupplier={(s) => {
                    setFormData(prev => ({ ...prev, supplierId: s.id }));
                    setSupplierSearchValue(s.company_name);
                  }}
                  placeholder="Escribe @ para buscar proveedor..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-white/70">Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                placeholder={isProductTab ? "Ej: PANTALLA LED 6MM" : "Ej: INSTALACIÓN TÉCNICA"}
                className="bg-white/5 border-white/10 text-white uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional..."
                rows={2}
                className="bg-white/5 border-white/10 text-white resize-none"
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">
                  {isProductTab ? 'Precio coste (€)' : 'Coste ref. (€)'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Precio venta (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Dto. %</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discountPercent}
                  onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Impuesto</Label>
                <Select 
                  value={formData.taxId} 
                  onValueChange={(v) => {
                    const selectedTax = salesTaxes.find(t => t.id === v);
                    setFormData({ 
                      ...formData, 
                      taxId: v,
                      taxRate: String(selectedTax?.rate ?? 21)
                    });
                  }}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar impuesto..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {salesTaxes.map(tax => (
                      <SelectItem key={tax.id} value={tax.id} className="text-white">
                        {tax.name} ({tax.rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isProductTab && (
                <div className="space-y-2">
                  <Label className="text-white/70">Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              )}
            </div>

            {formData.salePrice && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">Precio con IVA:</span>
                  <span className="text-green-400 font-semibold">
                    {(parseFloat(formData.salePrice) * (1 - parseFloat(formData.discountPercent || '0') / 100) * (1 + parseFloat(formData.taxRate) / 100)).toFixed(2)} €
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={saving || !formData.categoryId || !formData.name.trim()}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar {itemLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toolbar - Estilo alineado con Proyectos / Clientes */}
      <div className="flex flex-wrap gap-3 items-center justify-between flex-shrink-0">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isProductTab ? "Buscar productos..." : "Buscar servicios..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48 bg-muted/50 border-border text-foreground">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.slug} - {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button onClick={handleOpenAddDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Añadir {itemLabel}
              </Button>
              <Button
                onClick={handleImportClick}
                disabled={importing}
                variant="outline"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Importar
              </Button>
              <Button onClick={downloadTemplate} variant="outline">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Plantilla
              </Button>
            </>
          )}
          <Button onClick={exportToExcel} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Lista - DataList mismo estilo que Proyectos (compacto, colores del sistema) */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <DataList
          data={products}
          columns={catalogColumns}
          actions={catalogActions}
          onItemClick={(p) => handleViewDetails(p.id)}
          loading={loading}
          emptyMessage={isAdmin ? `No hay ${isProductTab ? 'productos' : 'servicios'}. Haz clic en "Añadir ${itemLabel}" para crear uno.` : `No hay ${isProductTab ? 'productos' : 'servicios'}.`}
          emptyIcon={<Package className="h-16 w-16 text-muted-foreground" />}
          getItemId={(p) => p.id}
        />
      </div>

      {isAdmin && (
        <p className="text-muted-foreground text-xs flex-shrink-0 mt-2">
          Haz clic en una fila o en "Ver detalles" para editar un {isProductTab ? 'producto' : 'servicio'}
        </p>
      )}

      {/* Product Import Dialog */}
      <ProductImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={loadProducts}
        existingProducts={products.map(p => ({ product_number: p.sku, id: p.id }))}
        categories={categories.map(c => ({ code: c.slug, id: c.id, name: c.name }))}
        subcategories={[]}
        taxes={salesTaxes.map(t => ({ id: t.id, code: t.code, rate: t.rate }))}
      />
    </div>
  );
}
