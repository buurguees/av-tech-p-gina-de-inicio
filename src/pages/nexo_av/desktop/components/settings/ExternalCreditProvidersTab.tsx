import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Pencil, Loader2, Landmark, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface CreditProvider {
  id: string;
  name: string;
  code: string;
  provider_type: string;
  creditor_account_code: string;
  expense_account_code: string;
  is_active: boolean;
  created_at: string;
}

export function ExternalCreditProvidersTab() {
  const [providers, setProviders] = useState<CreditProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProvider, setEditingProvider] = useState<CreditProvider | null>(null);

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCreditorAccount, setFormCreditorAccount] = useState("520000");
  const [formExpenseAccount, setFormExpenseAccount] = useState("669000");

  useEffect(() => { fetchProviders(); }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_external_credit_providers");
      if (error) throw error;
      setProviders((data as unknown as CreditProvider[]) || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Error al cargar proveedores de crédito");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormCode("");
    setFormCreditorAccount("520000");
    setFormExpenseAccount("669000");
    setEditingProvider(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: CreditProvider) => {
    setEditingProvider(p);
    setFormName(p.name);
    setFormCode(p.code);
    setFormCreditorAccount(p.creditor_account_code);
    setFormExpenseAccount(p.expense_account_code);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formCode.trim()) {
      toast.error("Nombre y código son obligatorios");
      return;
    }
    setSaving(true);
    try {
      if (editingProvider) {
        const { error } = await supabase.rpc("update_external_credit_provider", {
          p_id: editingProvider.id,
          p_name: formName.trim(),
          p_creditor_account_code: formCreditorAccount.trim(),
          p_expense_account_code: formExpenseAccount.trim(),
        });
        if (error) throw error;
        toast.success("Proveedor actualizado");
      } else {
        const { error } = await supabase.rpc("create_external_credit_provider", {
          p_name: formName.trim(),
          p_code: formCode.trim(),
          p_creditor_account_code: formCreditorAccount.trim(),
          p_expense_account_code: formExpenseAccount.trim(),
        });
        if (error) throw error;
        toast.success("Proveedor creado");
      }
      setDialogOpen(false);
      resetForm();
      fetchProviders();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (p: CreditProvider) => {
    try {
      const { error } = await supabase.rpc("update_external_credit_provider", {
        p_id: p.id,
        p_is_active: !p.is_active,
      });
      if (error) throw error;
      fetchProviders();
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar estado");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.rpc("delete_external_credit_provider", { p_id: id });
      if (error) throw error;
      toast.success("Proveedor eliminado");
      fetchProviders();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Proveedores de Financiación</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Entidades de crédito externo (Aplazame, BNPL) para pagos a proveedores
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Añadir Proveedor
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Landmark className="w-5 h-5 text-muted-foreground" />
            Proveedores Configurados
          </CardTitle>
          <CardDescription>
            Estos proveedores estarán disponibles como método de pago en facturas de compra
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <Landmark className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No hay proveedores configurados</p>
              <p className="text-muted-foreground text-xs mt-1">
                Añade un proveedor como Aplazame para financiar pagos a proveedores
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Cuenta Acreedor</TableHead>
                  <TableHead>Cuenta Gasto</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="text-right w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 bg-muted rounded text-xs font-mono">{p.code}</span>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{p.creditor_account_code}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{p.expense_account_code}</TableCell>
                    <TableCell>
                      <Switch checked={p.is_active} onCheckedChange={() => handleToggleActive(p)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará "{p.name}". Solo es posible si no tiene operaciones asociadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-destructive hover:bg-destructive/90">
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProvider ? "Editar Proveedor" : "Nuevo Proveedor de Financiación"}</DialogTitle>
            <DialogDescription>
              {editingProvider ? "Modifica los datos del proveedor" : "Configura un nuevo proveedor de crédito externo"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Aplazame" />
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="Ej: APLAZAME"
                  disabled={!!editingProvider} className={editingProvider ? "opacity-50" : ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cuenta Acreedor (PGC)</Label>
                <Input value={formCreditorAccount} onChange={(e) => setFormCreditorAccount(e.target.value)} placeholder="520000" />
                <p className="text-xs text-muted-foreground">Ej: 520000 (Deudas c/p con entidades de crédito)</p>
              </div>
              <div className="space-y-2">
                <Label>Cuenta Gasto Financiero (PGC)</Label>
                <Input value={formExpenseAccount} onChange={(e) => setFormExpenseAccount(e.target.value)} placeholder="669000" />
                <p className="text-xs text-muted-foreground">Ej: 669000 (Otros gastos financieros)</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              {editingProvider ? "Guardar Cambios" : "Crear Proveedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
