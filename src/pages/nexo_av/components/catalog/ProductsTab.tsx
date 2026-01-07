import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Download, Search, Trash2, Loader2, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  product_number: string;
  category_id: string;
  category_name: string;
  category_code: string;
  subcategory_id: string | null;
  subcategory_name: string | null;
  subcategory_code: string | null;
  name: string;
  description: string | null;
  cost_price: number;
  base_price: number;
  price_with_tax: number;
  tax_rate: number;
  is_active: boolean;
}

interface Category {
  id: string;
  code: string;
  name: string;
}

interface Subcategory {
  id: string;
  category_id: string;
  code: string;
  name: string;
}

interface EditingCell {
  productId: string;
  field: string;
}

interface ProductsTabProps {
  isAdmin: boolean;
}

const TAX_OPTIONS = [
  { value: '21', label: 'IVA 21%' },
  { value: '10', label: 'IVA 10%' },
  { value: '4', label: 'IVA 4%' },
  { value: '0', label: 'Exento' },
];

export default function ProductsTab({ isAdmin }: ProductsTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('all');
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [filterCategory, filterSubcategory, search]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const loadData = async () => {
    try {
      const [categoriesRes, subcategoriesRes] = await Promise.all([
        supabase.rpc('list_product_categories'),
        supabase.rpc('list_product_subcategories')
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (subcategoriesRes.error) throw subcategoriesRes.error;

      setCategories(categoriesRes.data || []);
      setSubcategories(subcategoriesRes.data || []);
      await loadProducts();
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_products', {
        p_category_id: filterCategory !== 'all' ? filterCategory : null,
        p_subcategory_id: filterSubcategory !== 'all' ? filterSubcategory : null,
        p_search: search || null
      });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden añadir productos');
      return;
    }

    if (filterCategory === 'all') {
      toast.error('Selecciona una categoría para añadir un producto');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_product', {
        p_category_id: filterCategory,
        p_subcategory_id: filterSubcategory !== 'all' ? filterSubcategory : null,
        p_name: 'NUEVO PRODUCTO'
      });

      if (error) throw error;

      toast.success(`Producto ${data?.[0]?.product_number} creado`);
      await loadProducts();
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Error al crear producto');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden eliminar productos');
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_product', { p_product_id: productId });
      if (error) throw error;
      toast.success('Producto eliminado');
      await loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const startEditing = (productId: string, field: string, currentValue: string | number) => {
    if (!isAdmin) return;
    setEditingCell({ productId, field });
    setEditValue(String(currentValue ?? ''));
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingCell || !isAdmin) return;

    const { productId, field } = editingCell;
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const updateData: { p_product_id: string; p_name?: string; p_description?: string | null; p_cost_price?: number; p_base_price?: number } = { p_product_id: productId };
    
    switch (field) {
      case 'name':
        if (editValue.trim() === product.name) {
          cancelEditing();
          return;
        }
        updateData.p_name = editValue.trim();
        break;
      case 'description':
        if (editValue === (product.description || '')) {
          cancelEditing();
          return;
        }
        updateData.p_description = editValue || null;
        break;
      case 'cost_price':
        const costPrice = parseFloat(editValue) || 0;
        if (costPrice === product.cost_price) {
          cancelEditing();
          return;
        }
        updateData.p_cost_price = costPrice;
        break;
      case 'base_price':
        const basePrice = parseFloat(editValue) || 0;
        if (basePrice === product.base_price) {
          cancelEditing();
          return;
        }
        updateData.p_base_price = basePrice;
        break;
    }

    try {
      const { error } = await supabase.rpc('update_product', updateData);
      if (error) throw error;
      await loadProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Error al actualizar');
    }

    cancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleTaxChange = async (productId: string, taxRate: string) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden modificar productos');
      return;
    }

    try {
      const { error } = await supabase.rpc('update_product', {
        p_product_id: productId,
        p_tax_rate: parseFloat(taxRate)
      });
      if (error) throw error;
      await loadProducts();
    } catch (error) {
      console.error('Error updating tax:', error);
      toast.error('Error al actualizar impuesto');
    }
  };

  const exportToExcel = () => {
    const headers = ['Nº Producto', 'Categoría', 'Subcategoría', 'Nombre', 'Descripción', 'Coste', 'Precio Base', 'Impuesto %', 'Precio con IVA'];
    const rows = products.map(p => [
      p.product_number,
      p.category_name,
      p.subcategory_name || '',
      p.name,
      p.description || '',
      p.cost_price,
      p.base_price,
      p.tax_rate,
      p.price_with_tax
    ]);

    const csvContent = [
      headers.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogo_productos_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Catálogo exportado');
  };

  const downloadTemplate = () => {
    // Build template with categories and subcategories info
    const categoryInfo = categories.map(c => {
      const subs = subcategories.filter(s => s.category_id === c.id);
      const subInfo = subs.length > 0 
        ? subs.map(s => `${s.code} = ${s.name}`).join(', ')
        : 'Sin subcategorías';
      return `${c.code} = ${c.name} (Subcats: ${subInfo})`;
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
    fileInputRef.current?.click();
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

      // Skip header row
      const dataLines = lines.slice(1);
      let imported = 0;
      let errors = 0;

      for (const line of dataLines) {
        const cols = line.split('\t');
        if (cols.length < 6) continue;

        const [catCode, subCode, name, description, costPrice, basePrice, taxRate] = cols;
        
        // Find category
        const category = categories.find(c => c.code === catCode.trim());
        if (!category) {
          console.error(`Categoría no encontrada: ${catCode}`);
          errors++;
          continue;
        }

        // Find subcategory (optional)
        let subcategoryId = null;
        if (subCode?.trim()) {
          const subcategory = subcategories.find(
            s => s.category_id === category.id && s.code === subCode.trim()
          );
          if (subcategory) {
            subcategoryId = subcategory.id;
          }
        }

        try {
          const { error } = await supabase.rpc('create_product', {
            p_category_id: category.id,
            p_subcategory_id: subcategoryId,
            p_name: name?.trim() || 'PRODUCTO IMPORTADO',
            p_description: description?.trim() || null,
            p_cost_price: parseFloat(costPrice) || 0,
            p_base_price: parseFloat(basePrice) || 0,
            p_tax_rate: parseFloat(taxRate) || 21
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

  const filteredSubcategories = subcategories.filter(s => 
    filterCategory === 'all' || s.category_id === filterCategory
  );

  const renderEditableCell = (product: Product, field: string, value: string | number | null, isNumeric = false) => {
    const isEditing = editingCell?.productId === product.id && editingCell?.field === field;

    if (isEditing && isAdmin) {
      return (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          type={isNumeric ? 'number' : 'text'}
          step={isNumeric ? '0.01' : undefined}
          className="h-7 bg-white/10 border-orange-500 text-white text-xs"
        />
      );
    }

    return (
      <div
        onClick={() => isAdmin && startEditing(product.id, field, value ?? '')}
        className={`px-2 py-1 rounded min-h-[28px] flex items-center ${isAdmin ? 'cursor-pointer hover:bg-white/10' : 'cursor-default'}`}
      >
        {isNumeric && value !== null ? Number(value).toFixed(2) + ' €' : (value || '-')}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx,.csv,.tsv,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64 bg-white/5 border-white/10 text-white"
            />
          </div>

          <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setFilterSubcategory('all'); }}>
            <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="all" className="text-white">Todas las categorías</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-white">{c.code} - {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSubcategory} onValueChange={setFilterSubcategory} disabled={filterCategory === 'all'}>
            <SelectTrigger className="w-56 bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Subcategoría" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="all" className="text-white">Todas las subcategorías</SelectItem>
              {filteredSubcategories.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-white">{s.code} - {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button
                onClick={handleAddProduct}
                disabled={filterCategory === 'all'}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir Producto
              </Button>
              <Button
                onClick={handleImportClick}
                disabled={importing}
                variant="outline"
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Importar
              </Button>
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Plantilla
              </Button>
            </>
          )}
          <Button
            onClick={exportToExcel}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60 w-32">Nº Producto</TableHead>
              <TableHead className="text-white/60 w-24">Categoría</TableHead>
              <TableHead className="text-white/60 w-24">Subcat.</TableHead>
              <TableHead className="text-white/60">Nombre</TableHead>
              <TableHead className="text-white/60 w-40">Descripción</TableHead>
              <TableHead className="text-white/60 w-24 text-right">Coste</TableHead>
              <TableHead className="text-white/60 w-24 text-right">P. Base</TableHead>
              <TableHead className="text-white/60 w-28">Impuesto</TableHead>
              <TableHead className="text-white/60 w-24 text-right">P. con IVA</TableHead>
              {isAdmin && <TableHead className="text-white/60 w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-white/40" />
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-8 text-white/40">
                  {filterCategory === 'all' 
                    ? 'Selecciona una categoría para ver productos'
                    : 'No hay productos en esta categoría'}
                </TableCell>
              </TableRow>
            ) : (
              products.map(product => (
                <TableRow key={product.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-orange-400 font-mono text-xs">{product.product_number}</TableCell>
                  <TableCell className="text-white/60 text-xs">{product.category_code}</TableCell>
                  <TableCell className="text-white/60 text-xs">{product.subcategory_code || '-'}</TableCell>
                  <TableCell className="text-white text-sm">
                    {renderEditableCell(product, 'name', product.name)}
                  </TableCell>
                  <TableCell className="text-white/60 text-xs">
                    {renderEditableCell(product, 'description', product.description)}
                  </TableCell>
                  <TableCell className="text-right">
                    {renderEditableCell(product, 'cost_price', product.cost_price, true)}
                  </TableCell>
                  <TableCell className="text-right">
                    {renderEditableCell(product, 'base_price', product.base_price, true)}
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Select
                        value={String(product.tax_rate)}
                        onValueChange={(v) => handleTaxChange(product.id, v)}
                      >
                        <SelectTrigger className="h-7 bg-white/5 border-white/10 text-white text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10">
                          {TAX_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-white text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-white/60 text-xs">{product.tax_rate}%</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-green-400 font-medium text-sm">
                    {product.price_with_tax.toFixed(2)} €
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-white/40 text-xs">
        {isAdmin 
          ? 'Haz clic en cualquier celda para editarla • Pulsa Enter para guardar o Escape para cancelar'
          : 'Modo lectura • Solo los administradores pueden modificar el catálogo'}
      </p>
    </div>
  );
}
