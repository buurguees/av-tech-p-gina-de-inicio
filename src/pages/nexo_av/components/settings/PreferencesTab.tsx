import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, Loader2, CreditCard, Calendar, Clock, Plus, Trash2, Eye } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface BankAccount {
  id: string;
  holder: string;
  bank: string;
  iban: string;
  notes: string;
}

interface CompanyPreferences {
  quote_validity_days: number;
  invoice_payment_days: number;
  default_currency: string;
  bank_accounts: BankAccount[];
}

export function PreferencesTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<CompanyPreferences>({
    quote_validity_days: 15,
    invoice_payment_days: 30,
    default_currency: 'EUR',
    bank_accounts: []
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase.rpc('get_company_preferences');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const prefs = data[0];
        // Parse bank_accounts safely
        let bankAccounts: BankAccount[] = [];
        if (prefs.bank_accounts && Array.isArray(prefs.bank_accounts)) {
          bankAccounts = (prefs.bank_accounts as unknown as BankAccount[]).filter(
            (acc): acc is BankAccount => 
              typeof acc === 'object' && acc !== null && 'id' in acc
          );
        }
        setPreferences({
          quote_validity_days: prefs.quote_validity_days || 15,
          invoice_payment_days: prefs.invoice_payment_days || 30,
          default_currency: prefs.default_currency || 'EUR',
          bank_accounts: bankAccounts
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Error al cargar las preferencias');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convertir bank_accounts a un formato limpio para JSONB
      const cleanBankAccounts = preferences.bank_accounts.map(acc => ({
        id: acc.id,
        holder: acc.holder || '',
        bank: acc.bank || '',
        iban: acc.iban || '',
        notes: acc.notes || ''
      }));

      console.log('Saving preferences with bank_accounts:', cleanBankAccounts);

      const { data, error } = await supabase.rpc('upsert_company_preferences', {
        p_quote_validity_days: preferences.quote_validity_days,
        p_invoice_payment_days: preferences.invoice_payment_days,
        p_default_currency: preferences.default_currency,
        p_bank_accounts: cleanBankAccounts as unknown as Json
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      console.log('Save result:', data);
      toast.success('Preferencias guardadas correctamente');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Error al guardar las preferencias');
    } finally {
      setSaving(false);
    }
  };

  const addBankAccount = () => {
    setPreferences(prev => ({
      ...prev,
      bank_accounts: [
        ...prev.bank_accounts,
        {
          id: crypto.randomUUID(),
          holder: '',
          bank: '',
          iban: '',
          notes: ''
        }
      ]
    }));
  };

  const removeBankAccount = (id: string) => {
    setPreferences(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.filter(acc => acc.id !== id)
    }));
  };

  const updateBankAccount = (id: string, field: keyof BankAccount, value: string) => {
    setPreferences(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.map(acc =>
        acc.id === id ? { ...acc, [field]: value } : acc
      )
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón guardar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Preferencias Generales</h2>
          <p className="text-sm text-white/60 mt-1">
            Configuración que se aplicará automáticamente a nuevos documentos
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plazos y condiciones */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-white/60" />
              Plazos Comerciales
            </CardTitle>
            <CardDescription className="text-white/60">
              Configura los plazos por defecto para presupuestos y facturas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Validez de presupuestos */}
            <div className="space-y-2">
              <Label className="text-white/80 flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/40" />
                Validez de Presupuestos
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={preferences.quote_validity_days}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    quote_validity_days: parseInt(e.target.value) || 15
                  }))}
                  className="w-24 bg-white/5 border-white/10 text-white text-center"
                />
                <span className="text-white/60">días desde la fecha de emisión</span>
              </div>
              <p className="text-xs text-white/40">
                Este valor se usará para calcular automáticamente la fecha de validez en los presupuestos
              </p>
              {/* Mini preview */}
              <div className="flex items-center gap-2 mt-2 p-2 bg-white/5 rounded text-xs">
                <Eye className="w-3 h-3 text-white/40" />
                <span className="text-white/50">Ej: Presupuesto emitido hoy → Válido hasta {new Date(Date.now() + preferences.quote_validity_days * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')}</span>
              </div>
            </div>

            {/* Plazo de pago de facturas */}
            <div className="space-y-2">
              <Label className="text-white/80 flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/40" />
                Plazo de Pago de Facturas
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={preferences.invoice_payment_days}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    invoice_payment_days: parseInt(e.target.value) || 30
                  }))}
                  className="w-24 bg-white/5 border-white/10 text-white text-center"
                />
                <span className="text-white/60">días desde la fecha de emisión</span>
              </div>
              <p className="text-xs text-white/40">
                Este valor determinará la fecha de vencimiento en las facturas emitidas
              </p>
              {/* Mini preview */}
              <div className="flex items-center gap-2 mt-2 p-2 bg-white/5 rounded text-xs">
                <Eye className="w-3 h-3 text-white/40" />
                <span className="text-white/50">Ej: Factura emitida hoy → Vence el {new Date(Date.now() + preferences.invoice_payment_days * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información para futuras extensiones */}
        <Card className="bg-white/5 border-white/10 border-dashed opacity-60">
          <CardHeader>
            <CardTitle className="text-white/60 flex items-center gap-2">
              Próximamente
            </CardTitle>
            <CardDescription className="text-white/40">
              Más opciones de configuración estarán disponibles aquí
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-white/40">
              <li>• Textos legales estándar</li>
              <li>• Condiciones de servicio por defecto</li>
              <li>• Notas automáticas en documentos</li>
              <li>• Configuración de moneda</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Datos bancarios */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-white/60" />
                Datos Bancarios para Cobros
              </CardTitle>
              <CardDescription className="text-white/60 mt-1">
                Información de pago que aparecerá en las facturas para que los clientes realicen el abono
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addBankAccount}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir Cuenta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {preferences.bank_accounts.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
              <CreditCard className="w-10 h-10 mx-auto text-white/20 mb-3" />
              <p className="text-white/40 text-sm">
                No hay cuentas bancarias configuradas
              </p>
              <p className="text-white/30 text-xs mt-1">
                Añade al menos una cuenta para que aparezca en las facturas
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {preferences.bank_accounts.map((account, index) => (
                <div
                  key={account.id}
                  className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/80">
                      Cuenta {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBankAccount(account.id)}
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-white/60 text-sm">Titular de la cuenta</Label>
                      <Input
                        value={account.holder}
                        onChange={(e) => updateBankAccount(account.id, 'holder', e.target.value)}
                        placeholder="Nombre del titular"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/60 text-sm">Entidad bancaria</Label>
                      <Input
                        value={account.bank}
                        onChange={(e) => updateBankAccount(account.id, 'bank', e.target.value)}
                        placeholder="Nombre del banco"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-white/60 text-sm">IBAN</Label>
                      <Input
                        value={account.iban}
                        onChange={(e) => updateBankAccount(account.id, 'iban', e.target.value.toUpperCase())}
                        placeholder="ES00 0000 0000 0000 0000 0000"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-white/60 text-sm">Notas de pago (opcional)</Label>
                      <Textarea
                        value={account.notes}
                        onChange={(e) => updateBankAccount(account.id, 'notes', e.target.value)}
                        placeholder="Ej: Indicar número de factura en el concepto"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[60px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vista previa de cómo se mostrará en la factura */}
          {preferences.bank_accounts.length > 0 && preferences.bank_accounts[0].iban && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-white/40" />
                <span className="text-sm text-white/60">Vista previa en factura</span>
              </div>
              <div className="bg-white rounded-lg p-4 max-w-md">
                <div className="border-t-2 border-gray-200 pt-3">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Datos de Pago
                  </p>
                  <div className="space-y-1 text-[9px] text-gray-700">
                    {preferences.bank_accounts[0].holder && (
                      <p><span className="font-medium">Titular:</span> {preferences.bank_accounts[0].holder}</p>
                    )}
                    {preferences.bank_accounts[0].bank && (
                      <p><span className="font-medium">Banco:</span> {preferences.bank_accounts[0].bank}</p>
                    )}
                    <p className="font-mono"><span className="font-medium font-sans">IBAN:</span> {preferences.bank_accounts[0].iban}</p>
                    {preferences.bank_accounts[0].notes && (
                      <p className="text-gray-500 italic mt-1">{preferences.bank_accounts[0].notes}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botón guardar fijo al final */}
      <div className="flex justify-end pt-4 border-t border-white/10">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="bg-white text-black hover:bg-white/90"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar Preferencias
        </Button>
      </div>
    </div>
  );
}
