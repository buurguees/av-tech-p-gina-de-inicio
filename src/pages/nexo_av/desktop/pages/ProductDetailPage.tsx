import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2, Package, Wrench, ShieldAlert, LayoutDashboard, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import DetailNavigationBar from '../components/navigation/DetailNavigationBar';
import TabNav, { TabItem } from '../components/navigation/TabNav';
import { DetailInfoBlock, DetailInfoHeader, DetailInfoSummary, MetricCard } from '../components/detail';
import SupplierSearchInput from '../components/suppliers/SupplierSearchInput';

type ProductType = 'product' | 'service';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  product_type: 'PRODUCT' | 'SERVICE';
  category_id: string | null;
  category_name: string | null;
  subcategory_name?: string | null; // Catalog V2: opcional; detalle no devuelve subcategoría
  unit: string;
  cost_price: number | null;
  sale_price: number;
  discount_percent: number;
  sale_price_effective: number;
  tax_rate_id: string | null;
  tax_rate: number;
  margin_percentage: number | null;
  margin_amount: number;
  track_stock: boolean;
  stock_quantity: number;
  min_stock_alert: number | null;
  is_active: boolean;
  has_low_stock_alert: boolean;
  created_at: string;
  updated_at: string;
}

interface UserInfo {
  user_id: string;
  email: string;
  full_name: string;
  roles: string[];
}

interface Tax {
  id: string;
  code: string;
  name: string;
  rate: number;
  is_active: boolean;
  is_default: boolean;
}

export default function ProductDetailPage() {
  const { userId, productId } = useParams<{ userId: string; productId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [salesTaxes, setSalesTaxes] = useState<Tax[]>([]);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [taxId, setTaxId] = useState('');
  const [taxRate, setTaxRate] = useState('21');
  const [stock, setStock] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierSearchValue, setSupplierSearchValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [activeTab, setActiveTab] = useState('resumen');

  const tabs: TabItem[] = [
    { value: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { value: 'por-asignar-1', label: 'Por asignar', icon: FileText },
    { value: 'por-asignar-2', label: 'Por asignar', icon: Calendar },
    { value: 'por-asignar-3', label: 'Por asignar', icon: Package },
  ];

  const isAdmin = userInfo?.roles?.includes('admin') || false;
  const isProductType = product?.product_type === 'PRODUCT';
  const itemLabel = isProductType ? 'Producto' : 'Servicio';

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/nexo-av');
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_current_user_info');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const user = data[0];
          
          if (user.user_id !== userId) {
            navigate('/nexo-av');
            return;
          }

          // Only admins can access product detail/edit page
          if (!user.roles?.includes('admin')) {
            setAccessDenied(true);
            setLoading(false);
            return;
          }
          
          setUserInfo(user);
          await loadTaxes();
          await loadProduct();
        } else {
          navigate('/nexo-av');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        navigate('/nexo-av');
      }
    };

    checkAuth();
  }, [navigate, userId, productId]);

  const loadTaxes = async () => {
    try {
      const { data, error } = await supabase.rpc('list_catalog_tax_rates');
      if (error) throw error;
      setSalesTaxes((data || []).map((t: { id: string; name: string; rate: number; is_default: boolean; is_active: boolean }) => ({
        id: t.id,
        code: t.name,
        name: t.name,
        rate: t.rate,
        is_default: t.is_default,
        is_active: t.is_active
      })));
    } catch (error) {
      console.error('Error loading taxes:', error);
    }
  };

  const loadProduct = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_catalog_product_detail', { p_product_id: productId });

      if (error) throw error;

      const found = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (found) {
        setProduct(found);
        setName(found.name);
        setDescription(found.description || '');
        setCostPrice(String(found.cost_price ?? ''));
        setBasePrice(String(found.sale_price_effective ?? found.sale_price));
        setTaxId(found.tax_rate_id || '');
        setTaxRate(String(found.tax_rate ?? 21));
        setStock(String(found.stock_quantity ?? 0));
        setIsActive(found.is_active);
      } else {
        toast.error('Producto no encontrado');
        navigate(`/nexo-av/${userId}/catalog`);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Error al cargar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isAdmin || !product) {
      toast.error('No tienes permisos para editar');
      return;
    }

    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_catalog_product', {
        p_id: product.id,
        p_name: name.trim().toUpperCase(),
        p_description: description.trim() || null,
        p_cost_price: costPrice ? parseFloat(costPrice) : null,
        p_sale_price: parseFloat(basePrice) || 0,
        p_tax_rate_id: taxId || null,
        p_supplier_id: supplierId || null,
        p_clear_supplier: !supplierId,
        p_is_active: isActive
      });

      if (error) throw error;

      toast.success(`${itemLabel} actualizado correctamente`);
      await loadProduct();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const priceWithTax = (parseFloat(basePrice) || 0) * (1 + (parseFloat(taxRate) || 0) / 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Acceso Denegado</h1>
          <p className="text-white/60">Solo los administradores pueden editar productos y servicios.</p>
          <Button 
            onClick={() => navigate(`/nexo-av/${userId}/catalog`)}
            className="bg-white text-black hover:bg-white/90"
          >
            Volver al catálogo
          </Button>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar
        pageTitle={`Detalle de ${itemLabel}`}
        contextInfo={
          <div className="flex items-center gap-2">
            <span className="text-orange-400 font-mono text-sm">{product.sku}</span>
            <span className="text-white/60 text-sm">
              {product.category_name}
              {product.subcategory_name && ` > ${product.subcategory_name}`}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${product.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {product.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        }
        backPath={userId ? `/nexo-av/${userId}/catalog` : undefined}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Columna izquierda - TabNav y contenido */}
        <div className="flex-1 flex flex-col min-w-0">
          <TabNav
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          
          <div className="flex-1 overflow-auto">
            {activeTab === 'resumen' && (
              <div className="w-full h-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6">
                {/* Product header */}
                <div className="flex items-center gap-4 mb-8">
            <div className={`p-3 rounded-lg ${isProductType ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
              {isProductType ? (
                <Package className={`w-8 h-8 ${isProductType ? 'text-blue-400' : 'text-purple-400'}`} />
              ) : (
                <Wrench className="w-8 h-8 text-purple-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{product.name}</h1>
            </div>
          </div>

        {/* Edit form */}
        <div className="grid gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Información básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Nombre *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    disabled={!isAdmin}
                    className="bg-white/5 border-white/10 text-white uppercase disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Estado</Label>
                  <Select 
                    value={isActive ? 'active' : 'inactive'} 
                    onValueChange={(v) => setIsActive(v === 'active')}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white disabled:opacity-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="active" className="text-white">Activo</SelectItem>
                      <SelectItem value="inactive" className="text-white">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Descripción</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isAdmin}
                  rows={3}
                  className="bg-white/5 border-white/10 text-white resize-none disabled:opacity-50"
                />
              </div>

              {isProductType && (
                <div className="space-y-2">
                  <Label className="text-white/70">Proveedor (a quien compramos el material)</Label>
                  <SupplierSearchInput
                    entityType="SUPPLIER"
                    value={supplierSearchValue}
                    onChange={(v) => {
                      setSupplierSearchValue(v);
                      if (!v.trim()) setSupplierId('');
                    }}
                    onSelectSupplier={(s) => {
                      setSupplierId(s.id);
                      setSupplierSearchValue(s.company_name);
                    }}
                    placeholder="Escribe @ para buscar proveedor..."
                    className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                    disabled={!isAdmin}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Precios e impuestos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">
                    {isProductType ? 'Precio coste (€)' : 'Coste referencia (€)'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    disabled={!isAdmin}
                    className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Precio base (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    disabled={!isAdmin}
                    className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Impuesto</Label>
                  <Select 
                    value={taxId} 
                    onValueChange={(v) => {
                      const selectedTax = salesTaxes.find(t => t.id === v);
                      setTaxId(v);
                      setTaxRate(String(selectedTax?.rate ?? 21));
                    }}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white disabled:opacity-50">
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

                <div className="space-y-2">
                  <Label className="text-white/70">PVP</Label>
                  <div className="h-10 flex items-center px-3 bg-white/5 border border-white/10 rounded-md">
                    <span className="text-green-400 font-semibold">{priceWithTax.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isProductType && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Inventario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Stock actual</Label>
                    <Input
                      type="number"
                      min="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      disabled={!isAdmin}
                      className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Información del sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-white/40">Número</p>
                  <p className="text-orange-400 font-mono">{product.sku}</p>
                </div>
                <div>
                  <p className="text-white/40">Tipo</p>
                  <p className="text-white">{isProductType ? 'Producto' : 'Servicio'}</p>
                </div>
                <div>
                  <p className="text-white/40">Creado</p>
                  <p className="text-white">{new Date(product.created_at).toLocaleDateString('es-ES')}</p>
                </div>
                <div>
                  <p className="text-white/40">Actualizado</p>
                  <p className="text-white">{new Date(product.updated_at).toLocaleDateString('es-ES')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          {isAdmin && (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(`/nexo-av/${userId}/catalog`)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <Save className="w-4 h-4 mr-2" />
                Guardar cambios
              </Button>
            </div>
          )}
        </div>
              </div>
            )}
            {activeTab === 'por-asignar-1' && (
              <div className="p-6">
                <p className="text-muted-foreground">Por asignar - Se trabajará más adelante</p>
              </div>
            )}
            {activeTab === 'por-asignar-2' && (
              <div className="p-6">
                <p className="text-muted-foreground">Por asignar - Se trabajará más adelante</p>
              </div>
            )}
            {activeTab === 'por-asignar-3' && (
              <div className="p-6">
                <p className="text-muted-foreground">Por asignar - Se trabajará más adelante</p>
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha - DetailInfoBlock */}
        <div className="w-[20rem] flex-shrink-0 border-l border-border h-full">
          <div className="h-full">
            <DetailInfoBlock
              header={
                <DetailInfoHeader
                  title={product ? product.name : "Cargando..."}
                  subtitle={product ? `${product.category_name}${product.subcategory_name ? ` > ${product.subcategory_name}` : ''}` : undefined}
                >
                  <div className="flex flex-col gap-2 mt-2">
                    {product?.product_number && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Nº Producto:</span>
                        <span className="font-medium font-mono">{product.sku}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="font-medium">{isProductType ? 'Producto' : 'Servicio'}</span>
                    </div>
                  </div>
                </DetailInfoHeader>
              }
              summary={
                <DetailInfoSummary
                  columns={2}
                  items={[
                    {
                      label: "Precio base",
                      value: `${parseFloat(basePrice || '0').toFixed(2)} €`,
                      icon: <FileText className="w-4 h-4" />,
                    },
                    {
                      label: "PVP",
                      value: `${priceWithTax.toFixed(2)} €`,
                      icon: <Calendar className="w-4 h-4" />,
                    },
                    ...(isProductType ? [
                      {
                        label: "Stock",
                        value: stock || '0',
                        icon: <Package className="w-4 h-4" />,
                      },
                    ] : []),
                  ]}
                />
              }
              content={
                <div className="flex flex-col gap-3">
                  <MetricCard
                    title="PVP"
                    value={`${priceWithTax.toFixed(2)} €`}
                    icon={Package}
                  />
                  <MetricCard
                    title="Precio base"
                    value={`${parseFloat(basePrice || '0').toFixed(2)} €`}
                    icon={FileText}
                  />
                  {isProductType && (
                    <MetricCard
                      title="Stock"
                      value={stock || '0'}
                      icon={Calendar}
                    />
                  )}
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
