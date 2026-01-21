import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Receipt, 
  Plus, 
  Loader2, 
  RefreshCw,
  ShoppingCart,
  CreditCard,
  Star,
  TrendingUp,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';


interface Tax {
  id: string;
  name: string;
  code: string;
  rate: number;
  tax_type: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface TaxFormData {
  name: string;
  code: string;
  rate: string;
  tax_type: string;
  description: string;
  is_default: boolean;
}

export function TaxesTab() {
  const navigate = useNavigate();
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'sales' | 'purchase' | 'profit'>('sales');

  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [formData, setFormData] = useState<TaxFormData>({
    name: '',
    code: '',
    rate: '0',
    tax_type: 'sales',
    description: '',
    is_default: false,
  });

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_taxes');
      if (error) throw error;
      setTaxes(data || []);
    } catch (error: any) {
      console.error('Error fetching taxes:', error);
      toast.error('Error al cargar los impuestos');
    } finally {
      setLoading(false);
    }
  };

  const openCreateTax = (taxType: 'sales' | 'purchase' | 'profit') => {
    setFormData({
      name: '',
      code: '',
      rate: taxType === 'profit' ? '25' : '21',
      tax_type: taxType,
      description: '',
      is_default: false,
    });
    setShowTaxDialog(true);
  };

  const handleSaveTax = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Nombre y código son obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('create_tax', {
        p_name: formData.name,
        p_code: formData.code,
        p_rate: parseFloat(formData.rate),
        p_tax_type: formData.tax_type,
        p_description: formData.description || null,
        p_is_default: formData.is_default,
      });
      if (error) throw error;
      toast.success('Impuesto creado');
      setShowTaxDialog(false);
      fetchTaxes();
    } catch (error: any) {
      console.error('Error saving tax:', error);
      toast.error(error.message || 'Error al guardar el impuesto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTaxStatus = async (tax: Tax) => {
    try {
      const { error } = await supabase.rpc('update_tax', {
        p_tax_id: tax.id,
        p_is_active: !tax.is_active,
      });
      if (error) throw error;
      toast.success(tax.is_active ? 'Impuesto desactivado' : 'Impuesto activado');
      fetchTaxes();
    } catch (error: any) {
      console.error('Error toggling tax status:', error);
      toast.error('Error al cambiar el estado');
    }
  };

  const handleSetDefault = async (tax: Tax) => {
    try {
      const { error } = await supabase.rpc('update_tax', {
        p_tax_id: tax.id,
        p_is_default: true,
      });
      if (error) throw error;
      toast.success(`${tax.name} establecido como predeterminado`);
      fetchTaxes();
    } catch (error: any) {
      console.error('Error setting default tax:', error);
      toast.error('Error al establecer como predeterminado');
    }
  };

  const salesTaxes = taxes.filter(t => t.tax_type === 'sales');
  const purchaseTaxes = taxes.filter(t => t.tax_type === 'purchase');
  const profitTaxes = taxes.filter(t => t.tax_type === 'profit');

  const renderTaxTable = (taxList: Tax[], taxType: 'sales' | 'purchase' | 'profit') => (
    <Table>
      <TableHeader>
        <TableRow className="border-white/10 hover:bg-transparent">
          <TableHead className="text-white/60">Código</TableHead>
          <TableHead className="text-white/60">Nombre</TableHead>
          <TableHead className="text-white/60 text-right">Tasa</TableHead>
          <TableHead className="text-white/60">Descripción</TableHead>
          <TableHead className="text-white/60 text-center">Predeterminado</TableHead>
          <TableHead className="text-white/60 text-center">Estado</TableHead>
          <TableHead className="text-white/60 text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {taxList.map((tax, index) => (
          <TableRow
            key={tax.id}
            className="border-white/10 hover:bg-white/5"
          >
            <TableCell>
              <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold border-white/20 text-white/60">
                {tax.code}
              </span>
            </TableCell>
            <TableCell className={tax.is_active ? 'text-white font-medium' : 'text-white/40'}>
              {tax.name}
            </TableCell>
            <TableCell className={`text-right font-mono ${tax.rate < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {tax.rate > 0 ? '+' : ''}{tax.rate.toFixed(2)}%
            </TableCell>
            <TableCell className="text-white/60 text-sm">
              {tax.description || '-'}
            </TableCell>
            <TableCell className="text-center">
              {tax.is_default ? (
                <Star className="w-4 h-4 text-yellow-400 mx-auto fill-yellow-400" />
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSetDefault(tax)}
                  className="text-white/30 hover:text-yellow-400 hover:bg-yellow-400/10"
                  title="Establecer como predeterminado"
                >
                  <Star className="w-4 h-4" />
                </Button>
              )}
            </TableCell>
            <TableCell className="text-center">
              <Switch
                checked={tax.is_active}
                onCheckedChange={() => handleToggleTaxStatus(tax)}
              />
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/nexo-av/${window.location.pathname.split('/')[2]}/settings/taxes/${tax.id}`)}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver detalles
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Impuestos
            </CardTitle>
            <CardDescription className="text-white/60">
              Gestiona los impuestos aplicables a ventas y compras.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTaxes}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sales' | 'purchase' | 'profit')}>
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-white/5 border border-white/10">
                <TabsTrigger 
                  value="sales" 
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/60"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Ventas
                </TabsTrigger>
                <TabsTrigger 
                  value="purchase"
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/60"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Compras
                </TabsTrigger>
                <TabsTrigger 
                  value="profit"
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-white/60"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Beneficios
                </TabsTrigger>
              </TabsList>
              <Button
                onClick={() => openCreateTax(activeTab)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Impuesto
              </Button>
            </div>

            <TabsContent value="sales" className="mt-0">
              {salesTaxes.length === 0 ? (
                <div className="text-white/40 text-center py-12">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay impuestos de ventas configurados</p>
                </div>
              ) : (
                renderTaxTable(salesTaxes, 'sales')
              )}
            </TabsContent>

            <TabsContent value="purchase" className="mt-0">
              {purchaseTaxes.length === 0 ? (
                <div className="text-white/40 text-center py-12">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay impuestos de compras configurados</p>
                </div>
              ) : (
                renderTaxTable(purchaseTaxes, 'purchase')
              )}
            </TabsContent>

            <TabsContent value="profit" className="mt-0">
              {profitTaxes.length === 0 ? (
                <div className="text-white/40 text-center py-12">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay impuestos sobre beneficios configurados</p>
                </div>
              ) : (
                renderTaxTable(profitTaxes, 'profit')
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Tax Dialog */}
      <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Nuevo Impuesto</DialogTitle>
            <DialogDescription className="text-white/60">
              {`Crea un nuevo impuesto para ${formData.tax_type === 'sales' ? 'ventas' : formData.tax_type === 'purchase' ? 'compras' : 'beneficios'}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: IVA 21%"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Código *</Label>
                <Input
                  value={formData.code}
                  onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="Ej: IVA21"
                  className="bg-white/5 border-white/10 text-white uppercase"
                  maxLength={10}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Tasa (%) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.rate}
                  onChange={e => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                  placeholder="21.00"
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-white/40">
                  Usa valores negativos para retenciones (ej: -15 para IRPF)
                </p>
              </div>
              <div className="space-y-2 flex items-end">
                <div className="flex items-center gap-3 pb-2">
                  <Switch
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                  />
                  <Label className="text-white/80">Predeterminado</Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Descripción</Label>
              <Input
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción opcional..."
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTaxDialog(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveTax}
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
