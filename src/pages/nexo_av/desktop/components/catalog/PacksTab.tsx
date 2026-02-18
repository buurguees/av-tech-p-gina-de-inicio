import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Download, Search, Trash2, Loader2, Package, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Pack {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  sale_price: number;
  discount_percent: number;
  sale_price_effective: number;
  tax_rate: number;
  component_count: number;
  is_active: boolean;
}

interface PackItem {
  component_product_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  subtotal?: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  sale_price_effective: number;
}

interface EditingCell {
  packId: string;
  field: string;
}

interface PacksTabProps {
  isAdmin: boolean;
}

const TAX_OPTIONS = [
  { value: '21', label: 'IVA 21%' },
  { value: '10', label: 'IVA 10%' },
  { value: '4', label: 'IVA 4%' },
  { value: '0', label: 'Exento' },
];

export default function PacksTab({ isAdmin }: PacksTabProps) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Pack detail dialog
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [packItems, setPackItems] = useState<PackItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  useEffect(() => {
    loadPacks();
    loadProducts();
  }, []);

  useEffect(() => {
    loadPacks();
  }, [search]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const loadPacks = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('list_catalog_bundles', {
        p_search: search || null
      });

      if (error) throw error;
      setPacks((data || []).map((p: any) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        sale_price: p.sale_price,
        discount_percent: p.discount_percent ?? 0,
        sale_price_effective: p.sale_price_effective,
        tax_rate: p.tax_rate,
        component_count: p.component_count ?? 0,
        is_active: p.is_active,
      })));
    } catch (error) {
      console.error('Error loading packs:', error);
      toast.error('Error al cargar packs');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await (supabase.rpc as any)('list_catalog_products', {
        p_domain: 'PRODUCT',
        p_include_inactive: false
      });
      if (error) throw error;
      setProducts((data || []).map((p: any) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        sale_price_effective: p.sale_price_effective,
      })));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadPackItems = async (packId: string) => {
    setLoadingItems(true);
    try {
      const { data, error } = await (supabase.rpc as any)('list_catalog_bundle_components', {
        p_bundle_product_id: packId
      });
      if (error) throw error;
      setPackItems((data || []).map((item: any) => ({
        component_product_id: item.component_product_id,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price ?? item.sale_price_effective ?? 0,
        subtotal: item.subtotal ?? (item.quantity * (item.unit_price ?? item.sale_price_effective ?? 0)),
      })));
    } catch (error) {
      console.error('Error loading pack items:', error);
      toast.error('Error al cargar productos del pack');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleAddPack = async () => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden crear packs');
      return;
    }

    try {
      const sku = 'PACK-' + Date.now();
      const { data, error } = await (supabase.rpc as any)('create_catalog_product', {
        p_sku: sku,
        p_name: 'NUEVO PACK',
        p_product_type: 'BUNDLE',
        p_category_id: null,
        p_unit: 'ud',
        p_sale_price: 0,
        p_discount_percent: 0,
        p_description: null,
        p_track_stock: false
      });

      if (error) throw error;

      toast.success(`Pack ${sku} creado`);
      await loadPacks();
    } catch (error) {
      console.error('Error creating pack:', error);
      toast.error('Error al crear pack');
    }
  };

  const handleDeletePack = async (packId: string) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden eliminar packs');
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_product_pack', { p_pack_id: packId });
      if (error) throw error;
      toast.success('Pack eliminado');
      await loadPacks();
    } catch (error) {
      console.error('Error deleting pack:', error);
      toast.error('Error al eliminar pack');
    }
  };

  const openPackDetail = async (pack: Pack) => {
    setSelectedPack(pack);
    await loadPackItems(pack.id);
  };

  const closePackDetail = () => {
    setSelectedPack(null);
    setPackItems([]);
    setSelectedProductId('');
  };

  const handleAddProductToPack = async () => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden modificar packs');
      return;
    }

    if (!selectedPack || !selectedProductId) return;

    try {
      const { error } = await (supabase.rpc as any)('add_catalog_bundle_component', {
        p_bundle_product_id: selectedPack.id,
        p_component_product_id: selectedProductId,
        p_quantity: 1
      });

      if (error) throw error;

      toast.success('Producto añadido al pack');
      await Promise.all([loadPackItems(selectedPack.id), loadPacks()]);
      setSelectedProductId('');
    } catch (error) {
      console.error('Error adding product to pack:', error);
      toast.error('Error al añadir producto');
    }
  };

  const handleRemovePackItem = async (componentProductId: string) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden modificar packs');
      return;
    }

    if (!selectedPack) return;

    try {
      const { error } = await (supabase.rpc as any)('remove_catalog_bundle_component', {
        p_bundle_product_id: selectedPack.id,
        p_component_product_id: componentProductId
      });
      if (error) throw error;

      toast.success('Producto eliminado del pack');
      await Promise.all([loadPackItems(selectedPack.id), loadPacks()]);
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const handleUpdateItemQuantity = async (componentProductId: string, quantity: number) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden modificar packs');
      return;
    }

    if (!selectedPack || quantity < 1) return;

    try {
      const { error } = await (supabase.rpc as any)('add_catalog_bundle_component', {
        p_bundle_product_id: selectedPack.id,
        p_component_product_id: componentProductId,
        p_quantity: quantity
      });

      if (error) throw error;
      await Promise.all([loadPackItems(selectedPack.id), loadPacks()]);
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Error al actualizar cantidad');
    }
  };

  const startEditing = (packId: string, field: string, currentValue: string | number) => {
    if (!isAdmin) return;
    setEditingCell({ packId, field });
    setEditValue(String(currentValue ?? ''));
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingCell || !isAdmin) return;

    const { packId, field } = editingCell;
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;

    const updateData: { p_pack_id: string; p_name?: string; p_description?: string | null; p_discount_percent?: number } = { p_pack_id: packId };
    
    switch (field) {
      case 'name':
        if (editValue.trim() === pack.name) {
          cancelEditing();
          return;
        }
        updateData.p_name = editValue.trim();
        break;
      case 'description':
        if (editValue === (pack.description || '')) {
          cancelEditing();
          return;
        }
        updateData.p_description = editValue || null;
        break;
      case 'discount_percent':
        const discount = parseFloat(editValue) || 0;
        if (discount === pack.discount_percent) {
          cancelEditing();
          return;
        }
        updateData.p_discount_percent = discount;
        break;
    }

    try {
      const { error } = await supabase.rpc('update_product_pack', updateData);
      if (error) throw error;
      await loadPacks();
    } catch (error) {
      console.error('Error updating pack:', error);
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

  const handleTaxChange = async (packId: string, taxRate: string) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden modificar packs');
      return;
    }

    try {
      const { error } = await supabase.rpc('update_product_pack', {
        p_pack_id: packId,
        p_tax_rate: parseFloat(taxRate)
      });
      if (error) throw error;
      await loadPacks();
    } catch (error) {
      console.error('Error updating tax:', error);
      toast.error('Error al actualizar impuesto');
    }
  };

  const exportToExcel = () => {
    const headers = ['Nº Pack', 'Nombre', 'Descripción', 'Precio Base', 'Descuento %', 'Precio Final', 'Impuesto %', 'Precio con IVA', 'Nº Productos'];
    const rows = packs.map(p => [
      p.sku,
      p.name,
      p.description || '',
      p.sale_price_effective,
      p.discount_percent,
      p.sale_price_effective,
      p.tax_rate,
      (p.sale_price_effective * (1 + p.tax_rate / 100)).toFixed(2),
      p.component_count
    ]);

    const csvContent = [
      headers.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogo_packs_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Packs exportados');
  };

  const renderEditableCell = (pack: Pack, field: string, value: string | number | null, isNumeric = false, suffix = '') => {
    const isEditing = editingCell?.packId === pack.id && editingCell?.field === field;

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
          className="h-7 bg-muted/50 border-primary text-foreground text-xs"
        />
      );
    }

    return (
      <div
        onClick={() => isAdmin && startEditing(pack.id, field, value ?? '')}
        className={`px-2 py-1 rounded-lg min-h-[28px] flex items-center transition-colors ${isAdmin ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'}`}
      >
        {isNumeric && value !== null ? Number(value).toFixed(2) + suffix : (value || '-')}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between flex-shrink-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar packs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-56 lg:w-64 h-9 bg-muted/50 border-border text-sm"
          />
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {isAdmin && (
            <Button size="sm" onClick={handleAddPack} className="h-9">
              <Plus className="w-4 h-4 mr-1.5" />
              Añadir Pack
            </Button>
          )}
          <Button size="sm" onClick={exportToExcel} variant="outline" className="h-9">
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline ml-1.5">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Packs Table */}
      <div className="flex-1 min-h-0 overflow-auto border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs w-28">Nº Pack</TableHead>
              <TableHead className="text-muted-foreground text-xs">Nombre</TableHead>
              <TableHead className="text-muted-foreground text-xs w-40">Descripción</TableHead>
              <TableHead className="text-muted-foreground text-xs w-24 text-right">P. Base</TableHead>
              <TableHead className="text-muted-foreground text-xs w-24 text-right">Dto. %</TableHead>
              <TableHead className="text-muted-foreground text-xs w-24 text-right">P. Final</TableHead>
              <TableHead className="text-muted-foreground text-xs w-28">Impuesto</TableHead>
              <TableHead className="text-muted-foreground text-xs w-24 text-right">P. con IVA</TableHead>
              <TableHead className="text-muted-foreground text-xs w-20 text-center">Prods.</TableHead>
              {isAdmin && <TableHead className="text-muted-foreground text-xs w-20"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-border">
                <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : packs.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-8 text-muted-foreground">
                  No hay packs creados.
                </TableCell>
              </TableRow>
            ) : (
              packs.map(pack => (
                <TableRow key={pack.id} className="border-border hover:bg-muted/50 transition-colors">
                  <TableCell className="text-foreground/70 font-mono text-xs">{pack.sku}</TableCell>
                  <TableCell className="text-foreground text-sm">
                    {renderEditableCell(pack, 'name', pack.name)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {renderEditableCell(pack, 'description', pack.description)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm tabular-nums">
                    {pack.sale_price.toFixed(2)} €
                  </TableCell>
                  <TableCell className="text-right">
                    {renderEditableCell(pack, 'discount_percent', pack.discount_percent, true, ' %')}
                  </TableCell>
                  <TableCell className="text-right text-foreground font-medium text-sm tabular-nums">
                    {pack.sale_price_effective.toFixed(2)} €
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Select
                        value={String(pack.tax_rate)}
                        onValueChange={(v) => handleTaxChange(pack.id, v)}
                      >
                        <SelectTrigger className="h-7 bg-muted/50 border-border text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TAX_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground text-xs">{pack.tax_rate}%</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-foreground font-medium text-sm tabular-nums">
                    {(pack.sale_price_effective * (1 + pack.tax_rate / 100)).toFixed(2)} €
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openPackDetail(pack)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Package className="w-4 h-4 mr-1" />
                      {pack.component_count}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePack(pack.id)}
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
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

      {/* Pack Detail Dialog */}
      <Dialog open={!!selectedPack} onOpenChange={() => closePackDetail()}>
        <DialogContent className="bg-background border-border max-w-3xl rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {selectedPack?.sku} - {selectedPack?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add product to pack */}
            {isAdmin && (
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1 bg-muted/50 border-border">
                    <SelectValue placeholder="Seleccionar producto para añadir..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.sku} - {p.name} ({p.sale_price_effective.toFixed(2)} €)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddProductToPack}
                  disabled={!selectedProductId}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Añadir
                </Button>
              </div>
            )}

            {/* Pack items table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs">Nº Producto</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Nombre</TableHead>
                    <TableHead className="text-muted-foreground text-xs w-24 text-center">Cantidad</TableHead>
                    <TableHead className="text-muted-foreground text-xs w-24 text-right">P. Unidad</TableHead>
                    <TableHead className="text-muted-foreground text-xs w-24 text-right">Subtotal</TableHead>
                    {isAdmin && <TableHead className="text-muted-foreground text-xs w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingItems ? (
                    <TableRow className="border-border">
                      <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : packItems.length === 0 ? (
                    <TableRow className="border-border">
                      <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-4 text-muted-foreground">
                        Este pack no tiene productos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    packItems.map(item => (
                      <TableRow key={item.component_product_id} className="border-border hover:bg-muted/50">
                        <TableCell className="text-foreground/70 font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="text-foreground text-sm">{item.name}</TableCell>
                        <TableCell className="text-center">
                          {isAdmin ? (
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleUpdateItemQuantity(item.component_product_id, parseFloat(e.target.value) || 1)}
                              className="h-7 w-16 mx-auto bg-muted/50 border-border text-center text-xs"
                            />
                          ) : (
                            <span className="text-foreground">{item.quantity}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm tabular-nums">
                          {(item.unit_price ?? 0).toFixed(2)} €
                        </TableCell>
                        <TableCell className="text-right text-foreground font-medium text-sm tabular-nums">
                          {(item.subtotal ?? 0).toFixed(2)} €
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePackItem(item.component_product_id)}
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
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

            {/* Pack summary */}
            {selectedPack && (
              <div className="flex justify-end gap-6 text-sm pt-2 border-t border-border">
                <div className="text-muted-foreground">
                  Total Base: <span className="text-foreground font-medium tabular-nums">{selectedPack.sale_price.toFixed(2)} €</span>
                </div>
                <div className="text-muted-foreground">
                  Descuento: <span className="text-foreground font-medium">{selectedPack.discount_percent}%</span>
                </div>
                <div className="text-muted-foreground">
                  Precio Final: <span className="text-foreground font-bold tabular-nums">{(selectedPack.sale_price_effective * (1 + selectedPack.tax_rate / 100)).toFixed(2)} €</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
