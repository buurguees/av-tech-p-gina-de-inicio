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
  pack_number: string;
  name: string;
  description: string | null;
  base_price: number;
  discount_percent: number;
  final_price: number;
  price_with_tax: number;
  tax_rate: number;
  product_count: number;
  is_active: boolean;
}

interface PackItem {
  id: string;
  product_id: string;
  product_number: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Product {
  id: string;
  product_number: string;
  name: string;
  base_price: number;
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
      const { data, error } = await supabase.rpc('list_product_packs', {
        p_search: search || null
      });

      if (error) throw error;
      setPacks(data || []);
    } catch (error) {
      console.error('Error loading packs:', error);
      toast.error('Error al cargar packs');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase.rpc('list_products');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadPackItems = async (packId: string) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase.rpc('get_pack_items', { p_pack_id: packId });
      if (error) throw error;
      setPackItems(data || []);
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
      const { data, error } = await supabase.rpc('create_product_pack', {
        p_name: 'NUEVO PACK'
      });

      if (error) throw error;

      toast.success(`Pack ${data?.[0]?.pack_number} creado`);
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
      const { error } = await supabase.rpc('add_pack_item', {
        p_pack_id: selectedPack.id,
        p_product_id: selectedProductId,
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

  const handleRemovePackItem = async (itemId: string) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden modificar packs');
      return;
    }

    if (!selectedPack) return;

    try {
      const { error } = await supabase.rpc('remove_pack_item', { p_item_id: itemId });
      if (error) throw error;

      toast.success('Producto eliminado del pack');
      await Promise.all([loadPackItems(selectedPack.id), loadPacks()]);
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const handleUpdateItemQuantity = async (itemId: string, quantity: number) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden modificar packs');
      return;
    }

    if (!selectedPack || quantity < 1) return;

    try {
      const { error } = await supabase.rpc('update_pack_item', {
        p_item_id: itemId,
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
      p.pack_number,
      p.name,
      p.description || '',
      p.base_price,
      p.discount_percent,
      p.final_price,
      p.tax_rate,
      p.price_with_tax,
      p.product_count
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
          className="h-7 bg-white/10 border-orange-500 text-white text-xs"
        />
      );
    }

    return (
      <div
        onClick={() => isAdmin && startEditing(pack.id, field, value ?? '')}
        className={`px-2 py-1 rounded-lg min-h-[28px] flex items-center transition-colors ${isAdmin ? 'cursor-pointer hover:bg-white/10' : 'cursor-default'}`}
      >
        {isNumeric && value !== null ? Number(value).toFixed(2) + suffix : (value || '-')}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar packs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64 bg-white/5 border-white/10 text-white"
          />
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <Button
              onClick={handleAddPack}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir Pack
            </Button>
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

      {/* Packs Table */}
      <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02] backdrop-blur-sm shadow-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60 w-28">Nº Pack</TableHead>
              <TableHead className="text-white/60">Nombre</TableHead>
              <TableHead className="text-white/60 w-40">Descripción</TableHead>
              <TableHead className="text-white/60 w-24 text-right">P. Base</TableHead>
              <TableHead className="text-white/60 w-24 text-right">Dto. %</TableHead>
              <TableHead className="text-white/60 w-24 text-right">P. Final</TableHead>
              <TableHead className="text-white/60 w-28">Impuesto</TableHead>
              <TableHead className="text-white/60 w-24 text-right">P. con IVA</TableHead>
              <TableHead className="text-white/60 w-20 text-center">Prods.</TableHead>
              {isAdmin && <TableHead className="text-white/60 w-20"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-white/40" />
                </TableCell>
              </TableRow>
            ) : packs.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-8 text-white/40">
                  No hay packs creados.
                </TableCell>
              </TableRow>
            ) : (
              packs.map(pack => (
                <TableRow key={pack.id} className="border-white/10 hover:bg-white/[0.06] transition-colors duration-200">
                  <TableCell className="text-orange-400 font-mono text-xs">{pack.pack_number}</TableCell>
                  <TableCell className="text-white text-sm">
                    {renderEditableCell(pack, 'name', pack.name)}
                  </TableCell>
                  <TableCell className="text-white/60 text-xs">
                    {renderEditableCell(pack, 'description', pack.description)}
                  </TableCell>
                  <TableCell className="text-right text-white/60 text-sm">
                    {pack.base_price.toFixed(2)} €
                  </TableCell>
                  <TableCell className="text-right">
                    {renderEditableCell(pack, 'discount_percent', pack.discount_percent, true, ' %')}
                  </TableCell>
                  <TableCell className="text-right text-white font-medium text-sm">
                    {pack.final_price.toFixed(2)} €
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Select
                        value={String(pack.tax_rate)}
                        onValueChange={(v) => handleTaxChange(pack.id, v)}
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
                      <span className="text-white/60 text-xs">{pack.tax_rate}%</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-green-400 font-medium text-sm">
                    {pack.price_with_tax.toFixed(2)} €
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openPackDetail(pack)}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Package className="w-4 h-4 mr-1" />
                      {pack.product_count}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePack(pack.id)}
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

      {/* Pack Detail Dialog */}
      <Dialog open={!!selectedPack} onOpenChange={() => closePackDetail()}>
        <DialogContent className="bg-zinc-900/95 backdrop-blur-2xl border-white/10 text-white max-w-3xl rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-400" />
              {selectedPack?.pack_number} - {selectedPack?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add product to pack - only for admins */}
            {isAdmin && (
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar producto para añadir..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 max-h-60">
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-white">
                        {p.product_number} - {p.name} ({p.base_price.toFixed(2)} €)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddProductToPack}
                  disabled={!selectedProductId}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir
                </Button>
              </div>
            )}

            {/* Pack items table */}
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/60">Nº Producto</TableHead>
                    <TableHead className="text-white/60">Nombre</TableHead>
                    <TableHead className="text-white/60 w-24 text-center">Cantidad</TableHead>
                    <TableHead className="text-white/60 w-24 text-right">P. Unidad</TableHead>
                    <TableHead className="text-white/60 w-24 text-right">Subtotal</TableHead>
                    {isAdmin && <TableHead className="text-white/60 w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingItems ? (
                    <TableRow className="border-white/10">
                      <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-white/40" />
                      </TableCell>
                    </TableRow>
                  ) : packItems.length === 0 ? (
                    <TableRow className="border-white/10">
                      <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-4 text-white/40">
                        Este pack no tiene productos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    packItems.map(item => (
                      <TableRow key={item.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-orange-400 font-mono text-xs">{item.product_number}</TableCell>
                        <TableCell className="text-white text-sm">{item.product_name}</TableCell>
                        <TableCell className="text-center">
                          {isAdmin ? (
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleUpdateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="h-7 w-16 mx-auto bg-white/5 border-white/10 text-white text-center text-xs"
                            />
                          ) : (
                            <span className="text-white">{item.quantity}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-white/60 text-sm">
                          {item.unit_price.toFixed(2)} €
                        </TableCell>
                        <TableCell className="text-right text-white font-medium text-sm">
                          {item.subtotal.toFixed(2)} €
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePackItem(item.id)}
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

            {/* Pack summary */}
            {selectedPack && (
              <div className="flex justify-end gap-6 text-sm pt-2 border-t border-white/10">
                <div className="text-white/60">
                  Total Base: <span className="text-white font-medium">{selectedPack.base_price.toFixed(2)} €</span>
                </div>
                <div className="text-white/60">
                  Descuento: <span className="text-orange-400 font-medium">{selectedPack.discount_percent}%</span>
                </div>
                <div className="text-white/60">
                  Precio Final: <span className="text-green-400 font-bold">{selectedPack.price_with_tax.toFixed(2)} €</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
