import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2, Package, Wrench, ShieldAlert, LayoutDashboard, FileText, Calendar, ImageIcon, Upload, Trash2, X } from 'lucide-react';
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

  const [productImages, setProductImages] = useState<{ id: string; key: string; original_name: string; mime_type: string; size_bytes: number | null; created_at: string; thumbUrl?: string }[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgUploadProgress, setImgUploadProgress] = useState(0);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const tabs: TabItem[] = [
    { value: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { value: 'imagenes', label: 'Imágenes', icon: ImageIcon },
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
      const { data, error } = await (supabase.rpc as any)('get_catalog_product_detail', { p_product_id: productId });

      if (error) throw error;

      const found = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (found) {
        setProduct(found as Product);
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

  /* ---- Image Gallery helpers ---- */

  const loadProductImages = useCallback(async () => {
    if (!productId) return;
    setImagesLoading(true);
    try {
      const { data } = await supabase
        .from('minio_files')
        .select('id, key, original_name, mime_type, size_bytes, created_at')
        .eq('source_table', 'catalog.products')
        .eq('source_id', productId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      const images = (data ?? []) as typeof productImages;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/minio-proxy`;
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '' };
        const thumbPromises = images.map(async (img) => {
          try {
            const res = await fetch(proxyUrl, { method: 'POST', headers, body: JSON.stringify({ action: 'get_presigned_url_by_key', storage_key: img.key }) });
            const r = await res.json();
            return { ...img, thumbUrl: res.ok && r.ok ? r.url : undefined };
          } catch { return img; }
        });
        setProductImages(await Promise.all(thumbPromises));
      } else {
        setProductImages(images);
      }
    } catch (err) {
      console.error('Error loading product images:', err);
    } finally { setImagesLoading(false); }
  }, [productId]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !productId) return;
    setImgUploading(true);
    setImgUploadProgress(0);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/minio-proxy`;
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '' };

      const upRes = await fetch(proxyUrl, {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'upload_to_catalog_product', product_id: productId, filename: file.name, mime_type: file.type || 'application/octet-stream', size_bytes: file.size }),
      });
      const upData = await upRes.json();
      if (!upRes.ok || !upData.ok) throw new Error(upData.error || 'Error de subida');

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setImgUploadProgress(Math.round((ev.loaded / ev.total) * 100)); };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Error de red'));
        xhr.open('PUT', upData.url);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

      await fetch(proxyUrl, { method: 'POST', headers, body: JSON.stringify({ action: 'confirm_custom_upload', file_id: upData.file_id }) });
      toast.success('Imagen subida correctamente');
      loadProductImages();
    } catch (err) {
      console.error('Image upload error:', err);
      toast.error('Error al subir imagen');
    } finally {
      setImgUploading(false);
      setImgUploadProgress(0);
      if (imgInputRef.current) imgInputRef.current.value = '';
    }
  }, [productId, loadProductImages]);

  const handleDeleteImage = useCallback(async (imageId: string) => {
    setDeletingImageId(imageId);
    try {
      const { error } = await supabase
        .from('minio_files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', imageId);
      if (error) throw error;
      toast.success('Imagen eliminada');
      loadProductImages();
    } catch (err) {
      console.error('Delete image error:', err);
      toast.error('Error al eliminar imagen');
    } finally { setDeletingImageId(null); }
  }, [loadProductImages]);

  useEffect(() => {
    if (productId && activeTab === 'imagenes') loadProductImages();
  }, [productId, activeTab, loadProductImages]);

  const priceWithTax = (parseFloat(basePrice) || 0) * (1 + (parseFloat(taxRate) || 0) / 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Acceso Denegado</h1>
          <p className="text-muted-foreground">Solo los administradores pueden editar productos y servicios.</p>
          <Button 
            onClick={() => navigate(`/nexo-av/${userId}/catalog`)}
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
            <span className="text-foreground/70 font-mono text-sm">{product.sku}</span>
            <span className="text-muted-foreground text-sm">
              {product.category_name}
              {product.subcategory_name && ` > ${product.subcategory_name}`}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
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
              <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
            </div>
          </div>

        {/* Edit form */}
        <div className="grid gap-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">Información básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Nombre *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    disabled={!isAdmin}
                    className="h-9 bg-muted/50 border-border uppercase text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Estado</Label>
                  <Select 
                    value={isActive ? 'active' : 'inactive'} 
                    onValueChange={(v) => setIsActive(v === 'active')}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="h-9 bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Descripción</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isAdmin}
                  rows={3}
                  className="bg-muted/50 border-border resize-none text-sm"
                />
              </div>

              {isProductType && (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Proveedor (a quien compramos el material)</Label>
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
                    className="bg-muted/50 border-border"
                    disabled={!isAdmin}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">Precios e impuestos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    {isProductType ? 'Precio coste (€)' : 'Coste referencia (€)'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    disabled={!isAdmin}
                    className="h-9 bg-muted/50 border-border text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Precio base (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    disabled={!isAdmin}
                    className="h-9 bg-muted/50 border-border text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Impuesto</Label>
                  <Select 
                    value={taxId} 
                    onValueChange={(v) => {
                      const selectedTax = salesTaxes.find(t => t.id === v);
                      setTaxId(v);
                      setTaxRate(String(selectedTax?.rate ?? 21));
                    }}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="h-9 bg-muted/50 border-border">
                      <SelectValue placeholder="Seleccionar impuesto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {salesTaxes.map(tax => (
                        <SelectItem key={tax.id} value={tax.id}>
                          {tax.name} ({tax.rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">PVP</Label>
                  <div className="h-9 flex items-center px-3 bg-muted/50 border border-border rounded-md">
                    <span className="text-foreground font-semibold tabular-nums">{priceWithTax.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isProductType && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-foreground text-lg">Inventario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">Stock actual</Label>
                    <Input
                      type="number"
                      min="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      disabled={!isAdmin}
                      className="h-9 bg-muted/50 border-border text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">Información del sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Número</p>
                  <p className="text-foreground/70 font-mono">{product.sku}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tipo</p>
                  <p className="text-foreground">{isProductType ? 'Producto' : 'Servicio'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Creado</p>
                  <p className="text-foreground">{new Date(product.created_at).toLocaleDateString('es-ES')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Actualizado</p>
                  <p className="text-foreground">{new Date(product.updated_at).toLocaleDateString('es-ES')}</p>
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
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !name.trim()}
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
            {activeTab === 'imagenes' && (
              <div className="p-6 space-y-4">
                <input ref={imgInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleImageUpload} />
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    Imágenes del producto
                    <span className="text-sm font-normal text-muted-foreground">({productImages.length})</span>
                  </h2>
                  {isAdmin && (
                    <Button
                      size="sm"
                      onClick={() => imgInputRef.current?.click()}
                      disabled={imgUploading}
                      className="gap-1.5"
                    >
                      {imgUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {imgUploading ? `${imgUploadProgress}%` : 'Subir imagen'}
                    </Button>
                  )}
                </div>

                {imgUploading && (
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-200" style={{ width: `${imgUploadProgress}%` }} />
                  </div>
                )}

                {imagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : productImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                    <ImageIcon className="w-12 h-12 opacity-30" />
                    <p className="text-sm">Sin imágenes — sube fotos del producto para documentación y presupuestos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {productImages.map(img => (
                      <div key={img.id} className="group relative rounded-lg overflow-hidden border border-border bg-muted/30 aspect-square">
                        {img.thumbUrl && img.mime_type.startsWith('image/') ? (
                          <img src={img.thumbUrl} alt={img.original_name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
                            <FileText className="w-8 h-8" />
                            <span className="text-xs px-2 text-center truncate max-w-full">{img.original_name}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate" title={img.original_name}>{img.original_name}</p>
                            <p className="text-[10px] text-white/60">{img.size_bytes ? `${(img.size_bytes / 1024).toFixed(0)} KB` : ''}</p>
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20 flex-shrink-0"
                              onClick={(ev) => { ev.stopPropagation(); handleDeleteImage(img.id); }}
                              disabled={deletingImageId === img.id}
                              title="Eliminar imagen"
                            >
                              {deletingImageId === img.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                        </div>
                        {img.thumbUrl && (
                          <a href={img.thumbUrl} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-6 w-6 bg-black/50 hover:bg-black/70 text-white">
                              <ArrowLeft className="w-3 h-3 rotate-[135deg]" />
                            </Button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                    {product?.sku && (
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
