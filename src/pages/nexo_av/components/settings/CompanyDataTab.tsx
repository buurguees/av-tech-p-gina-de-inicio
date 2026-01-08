import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, Upload, Trash2, Loader2, Save, Globe, Mail, Phone, MapPin, 
  FileText, CheckCircle, AlertCircle, ImageIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompanySettings {
  id?: string;
  legal_name: string;
  tax_id: string;
  vat_number: string;
  commercial_name: string;
  company_type: 'freelance' | 'company';
  country: string;
  fiscal_address: string;
  fiscal_postal_code: string;
  fiscal_city: string;
  fiscal_province: string;
  billing_email: string;
  billing_phone: string;
  website: string;
  logo_url: string;
}

const INITIAL_SETTINGS: CompanySettings = {
  legal_name: '',
  tax_id: '',
  vat_number: '',
  commercial_name: '',
  company_type: 'company',
  country: 'España',
  fiscal_address: '',
  fiscal_postal_code: '',
  fiscal_city: '',
  fiscal_province: '',
  billing_email: '',
  billing_phone: '',
  website: '',
  logo_url: '',
};

const SPANISH_PROVINCES = [
  'A Coruña', 'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila',
  'Badajoz', 'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón',
  'Ciudad Real', 'Córdoba', 'Cuenca', 'Girona', 'Granada', 'Guadalajara', 'Guipúzcoa',
  'Huelva', 'Huesca', 'Illes Balears', 'Jaén', 'La Rioja', 'Las Palmas', 'León',
  'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Ourense', 'Palencia',
  'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria',
  'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza'
];

export function CompanyDataTab() {
  const [settings, setSettings] = useState<CompanySettings>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<CompanySettings>(INITIAL_SETTINGS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    // Check if there are unsaved changes
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_company_settings' as any);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const fetchedSettings: CompanySettings = {
          id: data[0].id,
          legal_name: data[0].legal_name || '',
          tax_id: data[0].tax_id || '',
          vat_number: data[0].vat_number || '',
          commercial_name: data[0].commercial_name || '',
          company_type: data[0].company_type || 'company',
          country: data[0].country || 'España',
          fiscal_address: data[0].fiscal_address || '',
          fiscal_postal_code: data[0].fiscal_postal_code || '',
          fiscal_city: data[0].fiscal_city || '',
          fiscal_province: data[0].fiscal_province || '',
          billing_email: data[0].billing_email || '',
          billing_phone: data[0].billing_phone || '',
          website: data[0].website || '',
          logo_url: data[0].logo_url || '',
        };
        setSettings(fetchedSettings);
        setOriginalSettings(fetchedSettings);
      }
    } catch (err) {
      console.error('Error fetching company settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!settings.legal_name.trim()) {
      toast.error('La razón social es obligatoria');
      return;
    }
    if (!settings.tax_id.trim()) {
      toast.error('El NIF/CIF es obligatorio');
      return;
    }
    if (!settings.fiscal_address.trim() || !settings.fiscal_postal_code.trim() || 
        !settings.fiscal_city.trim() || !settings.fiscal_province.trim()) {
      toast.error('La dirección fiscal completa es obligatoria');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('upsert_company_settings' as any, {
        p_legal_name: settings.legal_name,
        p_tax_id: settings.tax_id,
        p_vat_number: settings.vat_number || null,
        p_commercial_name: settings.commercial_name || null,
        p_company_type: settings.company_type,
        p_country: settings.country,
        p_fiscal_address: settings.fiscal_address,
        p_fiscal_postal_code: settings.fiscal_postal_code,
        p_fiscal_city: settings.fiscal_city,
        p_fiscal_province: settings.fiscal_province,
        p_billing_email: settings.billing_email || null,
        p_billing_phone: settings.billing_phone || null,
        p_website: settings.website || null,
        p_logo_url: settings.logo_url || null,
      });

      if (error) throw error;

      setOriginalSettings(settings);
      toast.success('Datos de la empresa guardados correctamente');
    } catch (err: any) {
      console.error('Error saving company settings:', err);
      toast.error(err.message || 'Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 5MB');
      return;
    }

    setUploadingLogo(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      setSettings(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast.success('Logo subido correctamente');
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      toast.error(err.message || 'Error al subir el logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!settings.logo_url) return;

    try {
      // Extract file path from URL
      const url = new URL(settings.logo_url);
      const pathParts = url.pathname.split('/company-assets/');
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        await supabase.storage.from('company-assets').remove([filePath]);
      }

      setSettings(prev => ({ ...prev, logo_url: '' }));
      toast.success('Logo eliminado');
    } catch (err: any) {
      console.error('Error removing logo:', err);
      // Still remove from state even if storage delete fails
      setSettings(prev => ({ ...prev, logo_url: '' }));
    }
  };

  const updateField = (field: keyof CompanySettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white/40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo Section */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Logo de la Empresa
          </CardTitle>
          <CardDescription className="text-white/60">
            Este logo aparecerá en los presupuestos y facturas generados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            {/* Logo Preview */}
            <div className="w-full max-w-md aspect-[3/1] bg-white rounded-lg flex items-center justify-center border-2 border-dashed border-white/20 overflow-hidden relative group">
              {settings.logo_url ? (
                <>
                  <img 
                    src={settings.logo_url} 
                    alt="Logo de la empresa" 
                    className="max-h-full max-w-full object-contain p-4"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white text-black hover:bg-white/90"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Cambiar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveLogo}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center p-6">
                  <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm mb-3">Sin logo configurado</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="bg-black text-white hover:bg-black/80 border-black"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Subir logo
                  </Button>
                </div>
              )}
            </div>
            <p className="text-white/40 text-xs text-center">
              Formatos aceptados: PNG, JPG, SVG. Tamaño máximo: 5MB. 
              Recomendado: fondo transparente.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Company Identification */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Datos de Identificación
          </CardTitle>
          <CardDescription className="text-white/60">
            Información legal de tu empresa para documentos fiscales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Type Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => updateField('company_type', 'freelance')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  settings.company_type === 'freelance'
                    ? 'bg-white text-black'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Autónomo
              </button>
              <button
                onClick={() => updateField('company_type', 'company')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  settings.company_type === 'company'
                    ? 'bg-white text-black'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Empresa
              </button>
            </div>
            
            <div className="flex-1">
              <Select value={settings.country} onValueChange={(v) => updateField('country', v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="País" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="España">🇪🇸 España</SelectItem>
                  <SelectItem value="Portugal">🇵🇹 Portugal</SelectItem>
                  <SelectItem value="Francia">🇫🇷 Francia</SelectItem>
                  <SelectItem value="Andorra">🇦🇩 Andorra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/80">
                NIF/CIF <span className="text-red-400">*</span>
              </Label>
              <Input
                value={settings.tax_id}
                onChange={(e) => updateField('tax_id', e.target.value)}
                placeholder="B75835728"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">
                NIF-IVA (Intracomunitario)
              </Label>
              <Input
                value={settings.vat_number}
                onChange={(e) => updateField('vat_number', e.target.value)}
                placeholder="ESB75835728"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">
                Razón Social <span className="text-red-400">*</span>
              </Label>
              <Input
                value={settings.legal_name}
                onChange={(e) => updateField('legal_name', e.target.value)}
                placeholder="AV TECH ESDEVENIMENTS S.L."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">
                Nombre Comercial
              </Label>
              <Input
                value={settings.commercial_name}
                onChange={(e) => updateField('commercial_name', e.target.value)}
                placeholder="AV TECH"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fiscal Address */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Dirección Fiscal
          </CardTitle>
          <CardDescription className="text-white/60">
            Dirección oficial para facturación y documentos legales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-white/80">
                Dirección <span className="text-red-400">*</span>
              </Label>
              <Input
                value={settings.fiscal_address}
                onChange={(e) => updateField('fiscal_address', e.target.value)}
                placeholder="C/ Francesc Hombravella Maristany, 13"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">
                Código Postal <span className="text-red-400">*</span>
              </Label>
              <Input
                value={settings.fiscal_postal_code}
                onChange={(e) => updateField('fiscal_postal_code', e.target.value)}
                placeholder="08320"
                maxLength={5}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">
                Población <span className="text-red-400">*</span>
              </Label>
              <Input
                value={settings.fiscal_city}
                onChange={(e) => updateField('fiscal_city', e.target.value)}
                placeholder="El Masnou"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">
                Provincia <span className="text-red-400">*</span>
              </Label>
              <Select value={settings.fiscal_province} onValueChange={(v) => updateField('fiscal_province', v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecciona provincia" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 max-h-60">
                  {SPANISH_PROVINCES.map(province => (
                    <SelectItem key={province} value={province}>{province}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Datos de Contacto
          </CardTitle>
          <CardDescription className="text-white/60">
            Información de contacto para facturación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/80 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email de Facturación
              </Label>
              <Input
                type="email"
                value={settings.billing_email}
                onChange={(e) => updateField('billing_email', e.target.value)}
                placeholder="facturacion@empresa.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Teléfono de Facturación
              </Label>
              <Input
                type="tel"
                value={settings.billing_phone}
                onChange={(e) => updateField('billing_phone', e.target.value)}
                placeholder="+34 600 000 000"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="text-white/80 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Página Web
              </Label>
              <Input
                type="url"
                value={settings.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://www.empresa.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
        <div className="flex items-center gap-2">
          {hasChanges ? (
            <>
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 text-sm">Tienes cambios sin guardar</span>
            </>
          ) : settings.id ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-sm">Datos guardados</span>
            </>
          ) : (
            <span className="text-white/40 text-sm">Completa los datos obligatorios</span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="bg-white text-black hover:bg-white/90"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
