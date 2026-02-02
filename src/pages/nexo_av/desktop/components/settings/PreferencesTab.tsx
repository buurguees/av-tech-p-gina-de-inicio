import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, Loader2, CreditCard, Calendar, Clock, Plus, Trash2, Eye, Pencil, Check, AlertCircle, Lock } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface BankAccount {
  id: string;
  holder: string;
  bank: string;
  iban: string;
  notes: string;
  isLocked?: boolean;
}

interface CompanyPreferences {
  quote_validity_days: number;
  invoice_payment_days: number;
  default_currency: string;
  bank_accounts: BankAccount[];
}

const IBAN_REGEX = /^[A-Z]{2}\d{22}$/;

const validateIBAN = (iban: string): boolean => {
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  return IBAN_REGEX.test(cleanIBAN);
};

const formatIBAN = (iban: string): string => {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
};

export function PreferencesTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<CompanyPreferences>({
    quote_validity_days: 15,
    invoice_payment_days: 30,
    default_currency: 'EUR',
    bank_accounts: []
  });
  const [ibanErrors, setIbanErrors] = useState<Record<string, string>>({});
  const [editingAccounts, setEditingAccounts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase.rpc('get_company_preferences');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const prefs = data[0];
        let bankAccounts: BankAccount[] = [];
        if (prefs.bank_accounts && Array.isArray(prefs.bank_accounts)) {
          bankAccounts = (prefs.bank_accounts as unknown as BankAccount[])
            .filter((acc): acc is BankAccount => 
              typeof acc === 'object' && acc !== null && 'id' in acc
            )
            .map(acc => ({
              ...acc,
              isLocked: acc.iban ? validateIBAN(acc.iban.replace(/\s/g, '')) : false
            }));
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
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    preferences.bank_accounts.forEach((account) => {
      if (account.iban) {
        const cleanIBAN = account.iban.replace(/\s/g, '').toUpperCase();
        if (!validateIBAN(cleanIBAN)) {
          newErrors[account.id] = 'Formato inválido. Debe ser 2 letras + 22 números';
          hasErrors = true;
        }
      }
    });

    setIbanErrors(newErrors);

    if (hasErrors) {
      toast.error('Hay errores en el formato de IBAN.');
      return;
    }

    setSaving(true);
    try {
      const cleanBankAccounts = preferences.bank_accounts.map(acc => ({
        id: acc.id,
        holder: acc.holder || '',
        bank: acc.bank || '',
        iban: acc.iban?.replace(/\s/g, '').toUpperCase() || '',
        notes: acc.notes || ''
      }));

      const { error } = await supabase.rpc('upsert_company_preferences', {
        p_quote_validity_days: preferences.quote_validity_days,
        p_invoice_payment_days: preferences.invoice_payment_days,
        p_default_currency: preferences.default_currency,
        p_bank_accounts: cleanBankAccounts as unknown as Json
      });

      if (error) throw error;
      
      setPreferences(prev => ({
        ...prev,
        bank_accounts: prev.bank_accounts.map(acc => ({
          ...acc,
          isLocked: acc.iban ? validateIBAN(acc.iban.replace(/\s/g, '')) : false
        }))
      }));
      
      setEditingAccounts(new Set());
      toast.success('Preferencias guardadas correctamente');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Error al guardar las preferencias');
    } finally {
      setSaving(false);
    }
  };

  const addBankAccount = () => {
    const newId = crypto.randomUUID();
    setPreferences(prev => ({
      ...prev,
      bank_accounts: [
        ...prev.bank_accounts,
        { id: newId, holder: '', bank: '', iban: '', notes: '', isLocked: false }
      ]
    }));
    setEditingAccounts(prev => new Set(prev).add(newId));
  };

  const removeBankAccount = (id: string) => {
    setPreferences(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.filter(acc => acc.id !== id)
    }));
    setIbanErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
    setEditingAccounts(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const updateBankAccount = (id: string, field: keyof BankAccount, value: string) => {
    setPreferences(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.map(acc =>
        acc.id === id ? { ...acc, [field]: value } : acc
      )
    }));
    
    if (field === 'iban' && ibanErrors[id]) {
      setIbanErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const toggleEditAccount = (id: string) => {
    setEditingAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
    
    setPreferences(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.map(acc =>
        acc.id === id ? { ...acc, isLocked: false } : acc
      )
    }));
  };

  const isAccountEditing = (account: BankAccount): boolean => {
    return editingAccounts.has(account.id) || !account.isLocked;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Preferencias Generales</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configuración que se aplicará automáticamente a nuevos documentos
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plazos comerciales */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              Plazos Comerciales
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configura los plazos por defecto para presupuestos y facturas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
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
                  className="w-24 bg-background border-input text-foreground text-center"
                />
                <span className="text-muted-foreground">días desde la fecha de emisión</span>
              </div>
              <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded text-xs">
                <Eye className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Ej: Presupuesto emitido hoy → Válido hasta {new Date(Date.now() + preferences.quote_validity_days * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
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
                  className="w-24 bg-background border-input text-foreground text-center"
                />
                <span className="text-muted-foreground">días desde la fecha de emisión</span>
              </div>
              <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded text-xs">
                <Eye className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Ej: Factura emitida hoy → Vence el {new Date(Date.now() + preferences.invoice_payment_days * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximamente */}
        <Card className="bg-card border-border border-dashed opacity-60">
          <CardHeader>
            <CardTitle className="text-muted-foreground flex items-center gap-2">
              Próximamente
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Más opciones de configuración estarán disponibles aquí
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Textos legales estándar</li>
              <li>• Condiciones de servicio por defecto</li>
              <li>• Notas automáticas en documentos</li>
              <li>• Configuración de moneda</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Datos bancarios */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                Datos Bancarios para Cobros
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Información de pago que aparecerá en las facturas
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addBankAccount}>
              <Plus className="w-4 h-4 mr-2" />
              Añadir Cuenta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {preferences.bank_accounts.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                No hay cuentas bancarias configuradas
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Añade al menos una cuenta para que aparezca en las facturas
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {preferences.bank_accounts.map((account, index) => {
                const isEditing = isAccountEditing(account);
                const hasError = ibanErrors[account.id];
                
                return (
                  <div
                    key={account.id}
                    className={`p-4 rounded-lg border space-y-4 transition-all ${
                      account.isLocked && !editingAccounts.has(account.id)
                        ? 'bg-green-500/5 border-green-500/20'
                        : hasError
                        ? 'bg-destructive/5 border-destructive/30'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {account.isLocked && !editingAccounts.has(account.id) ? (
                          <Lock className="w-4 h-4 text-green-500" />
                        ) : null}
                        <span className="text-sm font-medium text-foreground">
                          Cuenta {index + 1}
                          {account.isLocked && !editingAccounts.has(account.id) && (
                            <span className="ml-2 text-xs text-green-500">(Guardada)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.isLocked && !editingAccounts.has(account.id) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEditAccount(account.id)}
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Editar datos
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBankAccount(account.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {account.isLocked && !editingAccounts.has(account.id) ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Titular</Label>
                          <p className="text-foreground text-sm">{account.holder || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Entidad bancaria</Label>
                          <p className="text-foreground text-sm">{account.bank || '-'}</p>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-muted-foreground text-xs">IBAN</Label>
                          <p className="text-foreground text-sm font-mono flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            {formatIBAN(account.iban)}
                          </p>
                        </div>
                        {account.notes && (
                          <div className="space-y-1 md:col-span-2">
                            <Label className="text-muted-foreground text-xs">Notas de pago</Label>
                            <p className="text-muted-foreground text-sm italic">{account.notes}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-foreground text-sm">Titular de la cuenta</Label>
                          <Input
                            value={account.holder}
                            onChange={(e) => updateBankAccount(account.id, 'holder', e.target.value)}
                            placeholder="Nombre del titular"
                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-foreground text-sm">Entidad bancaria</Label>
                          <Input
                            value={account.bank}
                            onChange={(e) => updateBankAccount(account.id, 'bank', e.target.value)}
                            placeholder="Nombre del banco"
                            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-foreground text-sm flex items-center gap-2">
                            IBAN
                            {hasError && (
                              <span className="text-destructive text-xs flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {hasError}
                              </span>
                            )}
                          </Label>
                          <Input
                            value={account.iban}
                            onChange={(e) => updateBankAccount(account.id, 'iban', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                            placeholder="ES1234567890123456789012"
                            maxLength={24}
                            className={`bg-background text-foreground placeholder:text-muted-foreground font-mono ${
                              hasError ? 'border-destructive focus-visible:ring-destructive/30' : 'border-input'
                            }`}
                          />
                          <p className="text-xs text-muted-foreground">
                            Formato: 2 letras + 22 números (ejemplo: ES1234567890123456789012)
                          </p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-foreground text-sm">Notas de pago (opcional)</Label>
                          <Textarea
                            value={account.notes}
                            onChange={(e) => updateBankAccount(account.id, 'notes', e.target.value)}
                            placeholder="Ej: Indicar número de factura en el concepto"
                            className="bg-background border-input text-foreground placeholder:text-muted-foreground min-h-[60px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Vista previa */}
          {preferences.bank_accounts.length > 0 && preferences.bank_accounts[0].iban && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Vista previa en factura (IBAN predeterminado: primera cuenta)</span>
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
                    <p className="font-mono">
                      <span className="font-medium font-sans">IBAN:</span> {formatIBAN(preferences.bank_accounts[0].iban)}
                    </p>
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
    </div>
  );
}
