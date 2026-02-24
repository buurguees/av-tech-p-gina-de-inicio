import { useState, useEffect } from "react";
import { parseDecimalInput } from "@/pages/nexo_av/utils/parseDecimalInput";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, CreditCard, Loader2, Coins, ArrowRight, Ban, CheckCircle2, Landmark, Pencil, ArrowDownCircle, User, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_METHODS } from "@/constants/financeStatuses";

interface BankAccount {
  id: string;
  holder: string;
  bank: string;
  iban: string;
  notes: string;
}

interface Partner {
  id: string;
  full_name: string;
  partner_number: string;
  account_code: string | null;
}

interface CreditProvider {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface RegisterPurchasePaymentDialogProps {
  invoiceId: string;
  pendingAmount: number;
  totalAmount?: number;
  onPaymentRegistered: () => void;
  trigger?: React.ReactNode;
  payment?: {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    bank_reference: string | null;
    notes: string | null;
    company_bank_account_id?: string;
  };
}

// Filter out special methods from the regular selector
const STANDARD_PAYMENT_METHODS = PAYMENT_METHODS.filter(
  (m) => !["PERSONAL", "EXTERNAL_CREDIT"].includes(m.value)
);

const RegisterPurchasePaymentDialog = ({
  invoiceId,
  pendingAmount,
  totalAmount,
  onPaymentRegistered,
  trigger,
  payment,
}: RegisterPurchasePaymentDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date>(
    payment ? new Date(payment.payment_date) : new Date()
  );

  const isNegativeInvoice = (totalAmount !== undefined ? totalAmount : pendingAmount) < 0;

  const [amount, setAmount] = useState(
    payment ? Math.abs(payment.amount).toString() : Math.abs(pendingAmount).toString()
  );
  const [paymentMethod, setPaymentMethod] = useState(
    payment ? payment.payment_method : "TRANSFER"
  );
  const [bankReference, setBankReference] = useState(payment?.bank_reference || "");
  const [notes, setNotes] = useState(payment?.notes || "");
  const [bankAccountId, setBankAccountId] = useState<string>(
    payment?.company_bank_account_id || "NONE"
  );
  const [availableBankAccounts, setAvailableBankAccounts] = useState<BankAccount[]>([]);

  // Personal payment state
  const [paymentMode, setPaymentMode] = useState<"STANDARD" | "PERSONAL" | "APLAZAME">("STANDARD");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [creditProviders, setCreditProviders] = useState<CreditProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [numInstallments, setNumInstallments] = useState("1");
  const [feeAmount, setFeeAmount] = useState("0");

  const isEditing = !!payment;

  useEffect(() => {
    if (open) {
      fetchBankAccounts();
      fetchPartners();
      fetchCreditProviders();
      if (!isEditing) {
        setAmount(Math.abs(pendingAmount).toString());
        setPaymentDate(new Date());
        setPaymentMode("STANDARD");
        setSelectedPartnerId("");
        setSelectedProviderId("");
        setNumInstallments("1");
        setFeeAmount("0");
      }
    }
  }, [open, pendingAmount]);

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase.rpc("get_company_preferences");
      if (error) throw error;
      if (data && data.length > 0 && data[0].bank_accounts) {
        setAvailableBankAccounts(data[0].bank_accounts as unknown as BankAccount[]);
      }
    } catch (err) {
      console.error("Error fetching bank accounts:", err);
    }
  };

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase.rpc("list_partners_for_selector");
      if (error) throw error;
      setPartners((data as unknown as Partner[]) || []);
    } catch (err) {
      console.error("Error fetching partners:", err);
    }
  };

  const fetchCreditProviders = async () => {
    try {
      const { data, error } = await supabase.rpc("list_external_credit_providers");
      if (error) throw error;
      setCreditProviders(((data as unknown as CreditProvider[]) || []).filter((p) => p.is_active));
    } catch (err) {
      console.error("Error fetching credit providers:", err);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/,/g, ".");
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  const currentAmount = parseDecimalInput(amount);
  const absPendingAmount = Math.abs(pendingAmount);
  const absPaymentAmount = payment ? Math.abs(payment.amount) : 0;
  const maxAllowed = isEditing ? absPendingAmount + absPaymentAmount : absPendingAmount;
  const remainingAfterPayment = Math.max(0, maxAllowed - currentAmount);

  const handleSubmit = async () => {
    const numAmount = parseDecimalInput(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ variant: "destructive", title: "Error", description: "El importe debe ser mayor a 0" });
      return;
    }

    if (numAmount > maxAllowed + 0.01) {
      const confirmResult = window.confirm(
        `El importe (${formatCurrency(numAmount)}) supera el pendiente (${formatCurrency(maxAllowed)}). ¿Deseas registrarlo de todos modos?`
      );
      if (!confirmResult) return;
    }

    const finalAmount = isNegativeInvoice ? -numAmount : numAmount;

    setLoading(true);
    try {
      if (paymentMode === "PERSONAL") {
        // Personal payment by partner
        if (!selectedPartnerId) {
          toast({ variant: "destructive", title: "Error", description: "Selecciona el socio que realizó el pago" });
          setLoading(false);
          return;
        }

        const { error } = await supabase.rpc("register_personal_purchase_payment", {
          p_purchase_invoice_id: invoiceId,
          p_amount: finalAmount,
          p_payer_person_id: selectedPartnerId,
          p_payment_date: format(paymentDate, "yyyy-MM-dd"),
          p_notes: notes || null,
        });
        if (error) throw error;
        toast({ title: "Pago personal registrado", description: `Registrado como deuda con socio. Pendiente de reembolso.` });

      } else if (paymentMode === "APLAZAME") {
        // Aplazame / external credit
        if (!selectedProviderId) {
          toast({ variant: "destructive", title: "Error", description: "Selecciona el proveedor de financiación" });
          setLoading(false);
          return;
        }

        const fee = parseDecimalInput(feeAmount) || 0;
        const installments = parseInt(numInstallments) || 1;

        const { error } = await supabase.rpc("create_credit_operation", {
          p_purchase_invoice_id: invoiceId,
          p_provider_id: selectedProviderId,
          p_gross_amount: numAmount,
          p_fee_amount: fee,
          p_num_installments: installments,
          p_settlement_bank_account_id: bankAccountId === "NONE" ? null : bankAccountId,
        });
        if (error) throw error;
        toast({ title: "Financiación confirmada", description: `Deuda reclasificada a acreedor financiero. ${installments} cuota(s) generada(s).` });

      } else {
        // Standard payment
        if (isEditing) {
          toast({ variant: "destructive", title: "Error", description: "La edición de pagos aún no está implementada" });
          setLoading(false);
          return;
        }

        const { error } = await supabase.rpc("register_purchase_payment", {
          p_invoice_id: invoiceId,
          p_amount: finalAmount,
          p_payment_date: format(paymentDate, "yyyy-MM-dd"),
          p_payment_method: paymentMethod,
          p_bank_reference: bankReference || null,
          p_notes: notes || null,
          p_company_bank_account_id: bankAccountId === "NONE" ? null : bankAccountId,
        });
        if (error) throw error;
        toast({
          title: isNegativeInvoice ? "Reembolso registrado" : "Pago registrado",
          description: isNegativeInvoice
            ? `Se ha registrado un reembolso recibido de ${formatCurrency(numAmount)}`
            : `Se ha registrado un pago de ${formatCurrency(numAmount)}`,
        });
      }

      setOpen(false);
      onPaymentRegistered();
    } catch (error: any) {
      console.error("Error saving payment:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo procesar el pago" });
    } finally {
      setLoading(false);
    }
  };

  const getModeColor = () => {
    if (paymentMode === "PERSONAL") return "amber";
    if (paymentMode === "APLAZAME") return "blue";
    if (isNegativeInvoice) return "emerald";
    return "red";
  };

  const color = getModeColor();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className={cn(
            "text-white rounded-2xl shadow-lg gap-2 transition-all hover:scale-105 active:scale-95",
            isNegativeInvoice
              ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
              : "bg-red-500 hover:bg-red-600 shadow-red-500/20"
          )}>
            {isNegativeInvoice ? <ArrowDownCircle className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
            {isNegativeInvoice ? "Registrar Reembolso" : "Registrar Pago"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card/95 backdrop-blur-3xl border-border text-foreground max-w-lg rounded-[2.5rem] shadow-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className={cn(
          "absolute inset-0 pointer-events-none",
          `bg-gradient-to-br from-${color}-500/10 via-transparent to-blue-500/5`
        )} />

        <div className="p-6 md:p-8 space-y-5">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-2xl shadow-inner", {
                "bg-amber-500/10 border border-amber-500/20": isEditing || paymentMode === "PERSONAL",
                "bg-blue-500/10 border border-blue-500/20": paymentMode === "APLAZAME",
                "bg-emerald-500/10 border border-emerald-500/20": isNegativeInvoice && paymentMode === "STANDARD",
                "bg-red-500/10 border border-red-500/20": !isNegativeInvoice && paymentMode === "STANDARD" && !isEditing,
              })}>
                {paymentMode === "PERSONAL" ? <User className="h-5 w-5 text-amber-400" /> :
                 paymentMode === "APLAZAME" ? <HandCoins className="h-5 w-5 text-blue-400" /> :
                 isEditing ? <Pencil className="h-5 w-5 text-amber-400" /> :
                 isNegativeInvoice ? <ArrowDownCircle className="h-5 w-5 text-emerald-400" /> :
                 <Coins className="h-5 w-5 text-red-400" />}
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {paymentMode === "PERSONAL" ? "Pago Personal (Socio)" :
                 paymentMode === "APLAZAME" ? "Financiación Externa" :
                 isEditing ? "Editar Pago" :
                 isNegativeInvoice ? "Registrar Reembolso Recibido" : "Registrar Pago"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-sm">
              {paymentMode === "PERSONAL" ? "El socio pagó con medios personales. Se registrará como deuda pendiente de reembolso." :
               paymentMode === "APLAZAME" ? "La deuda se reclasifica del proveedor al acreedor financiero." :
               isEditing ? `Modificando registro #${payment?.id.slice(0, 8)}` :
               "Introduce los detalles del pago realizado"}
            </DialogDescription>
          </DialogHeader>

          {/* Payment mode selector */}
          {!isEditing && !isNegativeInvoice && (
            <div className="flex gap-2">
              <Button
                variant={paymentMode === "STANDARD" ? "default" : "outline"}
                size="sm"
                onClick={() => setPaymentMode("STANDARD")}
                className={cn("flex-1 text-xs", paymentMode === "STANDARD" ? "bg-red-500 hover:bg-red-600 text-white" : "border-border text-muted-foreground hover:text-foreground")}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Empresa
              </Button>
              <Button
                variant={paymentMode === "PERSONAL" ? "default" : "outline"}
                size="sm"
                onClick={() => setPaymentMode("PERSONAL")}
                className={cn("flex-1 text-xs", paymentMode === "PERSONAL" ? "bg-amber-500 hover:bg-amber-600 text-white" : "border-border text-muted-foreground hover:text-foreground")}
              >
                <User className="h-3.5 w-3.5 mr-1.5" />
                Socio Personal
              </Button>
              {creditProviders.length > 0 && (
                <Button
                  variant={paymentMode === "APLAZAME" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentMode("APLAZAME")}
                  className={cn("flex-1 text-xs", paymentMode === "APLAZAME" ? "bg-blue-500 hover:bg-blue-600 text-white" : "border-border text-muted-foreground hover:text-foreground")}
                >
                  <HandCoins className="h-3.5 w-3.5 mr-1.5" />
                  Financiación
                </Button>
              )}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 border border-border rounded-3xl p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                {isEditing ? "Total Editable" : isNegativeInvoice ? "Reembolso Pendiente" : "Saldo Pendiente"}
              </span>
              <p className={cn("text-lg font-bold leading-none", isNegativeInvoice ? "text-emerald-500" : "text-foreground")}>
                {formatCurrency(maxAllowed)}
              </p>
            </div>
            <div className="bg-muted/30 border border-border rounded-3xl p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                {isNegativeInvoice ? "Restante por recibir" : "Restante tras pago"}
              </span>
              <p className={`text-lg font-bold leading-none ${remainingAfterPayment < 0 ? "text-destructive" : "text-emerald-500"}`}>
                {formatCurrency(Math.max(0, remainingAfterPayment))}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Date */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-semibold ml-1 uppercase tracking-wide">Fecha del Movimiento</Label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(
                    "w-full h-12 justify-start text-left font-medium bg-background/80 border-border text-foreground rounded-2xl hover:bg-muted/50 transition-all",
                    !paymentDate && "text-muted-foreground"
                  )}>
                    <CalendarIcon className="mr-3 h-4 w-4 text-red-400" />
                    {paymentDate ? format(paymentDate, "d 'de' MMMM, yyyy", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover/95 backdrop-blur-3xl border-border rounded-2xl shadow-2xl z-[10002]" align="start">
                  <Calendar mode="single" selected={paymentDate} onSelect={(date) => date && setPaymentDate(date)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Amount + Method */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Importe (€)</Label>
                <Input type="text" inputMode="decimal" value={amount} onChange={handleAmountChange} className="font-mono text-lg" placeholder="0.00" />
              </div>
              {paymentMode === "STANDARD" && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Método</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue placeholder="Método" /></SelectTrigger>
                    <SelectContent>
                      {STANDARD_PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {paymentMode === "APLAZAME" && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cuotas</Label>
                  <Input type="text" inputMode="numeric" value={numInstallments} onChange={(e) => setNumInstallments(e.target.value)} placeholder="1" />
                </div>
              )}
            </div>

            {/* Personal: Partner selector */}
            {paymentMode === "PERSONAL" && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Socio que realizó el pago</Label>
                <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar socio" /></SelectTrigger>
                  <SelectContent>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {p.full_name} ({p.partner_number})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Aplazame: Provider + fee + bank */}
            {paymentMode === "APLAZAME" && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proveedor de financiación</Label>
                  <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                    <SelectContent>
                      {creditProviders.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <HandCoins className="h-3 w-3" />
                            {p.name} ({p.code})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comisión financiación (€)</Label>
                  <Input type="text" inputMode="decimal" value={feeAmount} onChange={(e) => {
                    let v = e.target.value.replace(/,/g, ".");
                    if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setFeeAmount(v);
                  }} placeholder="0.00" />
                </div>
              </>
            )}

            {/* Bank account (standard + aplazame) */}
            {paymentMode !== "PERSONAL" && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {paymentMode === "APLAZAME" ? "Cuenta bancaria de liquidación" : isNegativeInvoice ? "Recibido en (Cuenta Banco)" : "Pagado desde (Cuenta Banco)"}
                </Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona cuenta bancaria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Ninguna cuenta específica</SelectItem>
                    {availableBankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-medium">{acc.bank}</span>
                          <span className="text-xs text-muted-foreground">{acc.iban}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reference + notes (standard only) */}
            {paymentMode === "STANDARD" && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Referencia (Opcional)</Label>
                <Input value={bankReference} onChange={(e) => setBankReference(e.target.value)} placeholder="Nº transferencia, ticket, etc." />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas internas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalles sobre este pago..." />
            </div>
          </div>
        </div>

        <DialogFooter className="bg-muted/20 border-t border-border p-6 md:p-8 flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1 h-12 text-muted-foreground hover:text-foreground hover:bg-accent rounded-2xl transition-all">
            <Ban className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className={cn(
            "flex-[1.5] h-12 text-white font-bold rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
            paymentMode === "PERSONAL" ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30" :
            paymentMode === "APLAZAME" ? "bg-blue-500 hover:bg-blue-600 shadow-blue-500/30" :
            isEditing ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30" :
            isNegativeInvoice ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30" :
            "bg-red-500 hover:bg-red-600 shadow-red-500/30"
          )}>
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registrando...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" />
                {paymentMode === "PERSONAL" ? "Registrar Pago Personal" :
                 paymentMode === "APLAZAME" ? "Confirmar Financiación" :
                 isEditing ? "Guardar Cambios" :
                 isNegativeInvoice ? "Registrar Reembolso" : "Registrar Pago"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterPurchasePaymentDialog;
