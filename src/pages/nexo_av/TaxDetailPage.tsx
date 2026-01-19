import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  Receipt, 
  Loader2, 
  Save, 
  Trash2,
  Star,
  ShoppingCart,
  CreditCard,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

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

export default function TaxDetailPage() {
  const { userId, taxId } = useParams();
  const navigate = useNavigate();
  
  const [tax, setTax] = useState<Tax | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    rate: '',
    description: '',
    is_default: false,
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    if (taxId) {
      fetchTax();
    }
  }, [taxId]);

  const fetchTax = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_taxes');
      if (error) throw error;
      
      const foundTax = data?.find((t: Tax) => t.id === taxId);
      if (foundTax) {
        setTax(foundTax);
        setFormData({
          name: foundTax.name,
          code: foundTax.code,
          rate: foundTax.rate.toString(),
          description: foundTax.description || '',
          is_default: foundTax.is_default,
          is_active: foundTax.is_active,
          display_order: foundTax.display_order,
        });
      } else {
        toast.error('Impuesto no encontrado');
        navigate(`/nexo-av/${userId}/settings`);
      }
    } catch (error: any) {
      console.error('Error fetching tax:', error);
      toast.error('Error al cargar el impuesto');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!tax) return;
    
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Nombre y código son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_tax', {
        p_tax_id: tax.id,
        p_name: formData.name,
        p_code: formData.code,
        p_rate: parseFloat(formData.rate),
        p_description: formData.description || null,
        p_is_default: formData.is_default,
        p_is_active: formData.is_active,
        p_display_order: formData.display_order,
      });
      
      if (error) throw error;
      
      toast.success('Impuesto actualizado');
      setHasChanges(false);
      fetchTax();
    } catch (error: any) {
      console.error('Error updating tax:', error);
      toast.error(error.message || 'Error al actualizar el impuesto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tax) return;

    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_tax', {
        p_tax_id: tax.id,
      });
      
      if (error) throw error;
      
      toast.success('Impuesto eliminado');
      navigate(`/nexo-av/${userId}/settings`);
    } catch (error: any) {
      console.error('Error deleting tax:', error);
      toast.error(error.message || 'Error al eliminar el impuesto');
    } finally {
      setDeleting(false);
    }
  };

  const getTaxTypeInfo = (taxType: string) => {
    switch (taxType) {
      case 'sales':
        return { label: 'Ventas', icon: ShoppingCart, color: 'text-green-400' };
      case 'purchase':
        return { label: 'Compras', icon: CreditCard, color: 'text-blue-400' };
      case 'profit':
        return { label: 'Beneficios', icon: TrendingUp, color: 'text-purple-400' };
      default:
        return { label: taxType, icon: Receipt, color: 'text-white/60' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!tax) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-white/60">Impuesto no encontrado</p>
      </div>
    );
  }

  const taxTypeInfo = getTaxTypeInfo(tax.tax_type);
  const TypeIcon = taxTypeInfo.icon;

  return (
    <div className="w-full">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-3 md:py-6">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Receipt className="w-6 h-6 text-orange-500" />
              <h1 className="text-2xl font-bold text-white">{tax.name}</h1>
              <Badge variant="outline" className="border-white/20 text-white/60">
                {tax.code}
              </Badge>
              {tax.is_default && (
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <TypeIcon className={`w-4 h-4 ${taxTypeInfo.color}`} />
              <span className={`text-sm ${taxTypeInfo.color}`}>{taxTypeInfo.label}</span>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6">
          {/* Main Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Información del Impuesto</CardTitle>
                <CardDescription className="text-white/60">
                  Modifica los datos del impuesto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white/80">Nombre *</Label>
                    <Input
                      value={formData.name}
                      onChange={e => handleInputChange('name', e.target.value)}
                      placeholder="Ej: IVA 21%"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Código *</Label>
                    <Input
                      value={formData.code}
                      onChange={e => handleInputChange('code', e.target.value.toUpperCase())}
                      placeholder="Ej: IVA21"
                      className="bg-white/5 border-white/10 text-white uppercase"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white/80">Tasa (%) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.rate}
                      onChange={e => handleInputChange('rate', e.target.value)}
                      placeholder="21.00"
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <p className="text-xs text-white/40">
                      Usa valores negativos para retenciones (ej: -15 para IRPF)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Orden de visualización</Label>
                    <Input
                      type="number"
                      value={formData.display_order}
                      onChange={e => handleInputChange('display_order', parseInt(e.target.value) || 0)}
                      placeholder="1"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Descripción</Label>
                  <Input
                    value={formData.description}
                    onChange={e => handleInputChange('description', e.target.value)}
                    placeholder="Descripción opcional..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div className="flex flex-wrap gap-6 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                    />
                    <Label className="text-white/80">Activo</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={formData.is_default}
                      onCheckedChange={(checked) => handleInputChange('is_default', checked)}
                    />
                    <Label className="text-white/80">Predeterminado</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between"
          >
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Impuesto
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar impuesto?</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/60">
                    Esta acción eliminará el impuesto "{tax.name}" de forma permanente.
                    Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </motion.div>

          {/* Metadata */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-4">
                <div className="flex flex-wrap gap-6 text-sm text-white/40">
                  <div>
                    <span className="text-white/60">Creado:</span>{' '}
                    {new Date(tax.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div>
                    <span className="text-white/60">Actualizado:</span>{' '}
                    {new Date(tax.updated_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </div>
      </div>
    </div>
  );
}
