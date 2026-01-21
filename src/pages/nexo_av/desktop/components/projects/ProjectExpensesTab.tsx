import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Receipt, Loader2, FileText, ExternalLink, CreditCard } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import CreateProjectExpenseDialog from "./CreateProjectExpenseDialog";
import RegisterPurchasePaymentDialog from "./RegisterPurchasePaymentDialog";
import { toast } from "sonner";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes: string | null;
}

interface PurchaseInvoice {
  id: string;
  invoice_number: string | null;
  supplier_invoice_number: string | null;
  internal_purchase_number: string | null;
  document_type: string;
  issue_date: string | null;
  total: number;
  pending_amount: number;
  status: string;
  is_locked: boolean;
  provider_name: string | null;
  provider_type: string | null;
  provider_tax_id: string | null;
  file_name: string | null;
  notes: string | null;
}

interface ProjectExpensesTabProps {
  projectId: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'MATERIAL', label: 'Material', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'LABOR', label: 'Mano de obra', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'TRANSPORT', label: 'Transporte', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'OTHER', label: 'Otros', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const getCategoryInfo = (category: string) => {
  return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[3];
};

const ProjectExpensesTab = ({ projectId }: ProjectExpensesTabProps) => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      
      // Obtener gastos de projects.expenses usando RPC
      const { data: expensesData, error: expensesError } = await supabase.rpc('list_project_expenses', {
        p_project_id: projectId
      } as any);

      if (expensesError) {
        console.error('Error fetching project expenses:', expensesError);
        // No lanzar error, solo loguear para no bloquear la carga de facturas de compra
        setExpenses([]);
      } else {
        setExpenses((expensesData || []) as Expense[]);
      }

      // Obtener facturas de compra y gastos asignadas al proyecto
      const { data: invoicesData, error: invoicesError } = await supabase.rpc('list_purchase_invoices', {
        p_project_id: projectId,
        p_document_type: null, // null para obtener todos los tipos
        p_status: null, // null para obtener todos los estados
        p_page: 1,
        p_page_size: 1000 // Obtener todas las facturas del proyecto
      } as any);

      if (invoicesError) {
        console.error('Error fetching purchase invoices:', invoicesError);
        // No lanzar error, solo loguear para no bloquear la carga de gastos
      } else {
        setPurchaseInvoices(invoicesData || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error("Error al cargar los gastos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [projectId]);

  const handleCreateExpense = () => {
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalPurchaseInvoices = purchaseInvoices.reduce((sum, pi) => sum + (parseFloat(pi.total?.toString() || '0') || 0), 0);
  const totalAll = totalExpenses + totalPurchaseInvoices;
  const hasAnyExpenses = expenses.length > 0 || purchaseInvoices.length > 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gastos del Proyecto</h1>
          {hasAnyExpenses && (
            <p className="text-muted-foreground/70 text-[10px] mt-1">
              Total: {formatCurrency(totalAll)}
            </p>
          )}
        </div>
        <Button
          onClick={handleCreateExpense}
          className="h-9 px-2 text-[10px]"
        >
          <Plus className="h-3 w-3 mr-1.5" />
          Añadir Gasto
          <span className="ml-2 text-[9px] px-1.5 py-0.5 opacity-70">N</span>
        </Button>
      </div>

      {!hasAnyExpenses ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border overflow-hidden shadow-md">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground/70 text-[10px] mb-4">No hay gastos registrados para este proyecto</p>
          <Button
            variant="link"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleCreateExpense}
          >
            Registrar el primer gasto
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Facturas de Compra y Gastos */}
          {purchaseInvoices.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Facturas de Compra y Gastos ({purchaseInvoices.length})
              </h4>
              <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                      <TableHead className="text-white/70 text-[10px] px-2">Tipo</TableHead>
                      <TableHead className="text-white/70 text-[10px] px-2">Número</TableHead>
                      <TableHead className="text-white/70 text-[10px] px-2">Proveedor/Técnico</TableHead>
                      <TableHead className="text-white/70 text-[10px] px-2 text-right">Importe</TableHead>
                      <TableHead className="text-white/70 text-[10px] px-2">Fecha</TableHead>
                      <TableHead className="text-white/70 text-[10px] px-2 text-center">Estado</TableHead>
                      <TableHead className="text-white/70 text-[10px] px-2 w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseInvoices.map((invoice) => {
                      const invoiceNumber = invoice.internal_purchase_number || 
                                          invoice.supplier_invoice_number || 
                                          invoice.invoice_number || 
                                          'Sin número';
                      const providerName = invoice.provider_name || 'Sin proveedor';
                      const documentTypeLabel = invoice.document_type === 'EXPENSE' ? 'Gasto' : 'Factura Compra';
                      
                      return (
                        <TableRow
                          key={invoice.id}
                          className="border-white/10 cursor-pointer hover:bg-white/"
                          onClick={() => {
                            const userId = window.location.pathname.split('/')[2];
                            const path = invoice.document_type === 'EXPENSE' 
                              ? `/nexo-av/${userId}/expenses/${invoice.id}`
                              : `/nexo-av/${userId}/purchase-invoices/${invoice.id}`;
                            navigate(path);
                          }}
                        >
                          <TableCell className="px-2">
                            <Badge variant="outline" className="border text-[9px] px-1.5 py-0.5">
                              {documentTypeLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-white font-medium text-[10px] px-2">
                            {invoiceNumber}
                          </TableCell>
                          <TableCell className="text-white font-medium text-[10px] px-2">
                            {providerName}
                          </TableCell>
                          <TableCell className="text-white font-medium text-[10px] px-2 text-right">
                            {formatCurrency(parseFloat(invoice.total?.toString() || '0'))}
                          </TableCell>
                          <TableCell className="text-white/60 text-[9px] px-2">
                            {invoice.issue_date 
                              ? new Date(invoice.issue_date).toLocaleDateString('es-ES')
                              : '-'}
                          </TableCell>
                          <TableCell className="px-2 text-center">
                            <Badge variant="outline" className="border text-[9px] px-1.5 py-0.5">
                              {invoice.status === 'PENDING' ? 'Pendiente' :
                               invoice.status === 'REGISTERED' ? 'Registrado' :
                               invoice.status === 'CONFIRMED' ? 'Confirmado' :
                               invoice.status === 'PAID' ? 'Pagado' :
                               invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const canRegisterPayment = ["CONFIRMED", "PARTIAL", "PAID"].includes(invoice.status) 
                                  && !invoice.is_locked 
                                  && invoice.pending_amount > 0;
                                
                                return canRegisterPayment ? (
                                  <RegisterPurchasePaymentDialog
                                    invoiceId={invoice.id}
                                    pendingAmount={invoice.pending_amount}
                                    onPaymentRegistered={fetchExpenses}
                                    trigger={
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <CreditCard className="h-3 w-3" />
                                      </Button>
                                    }
                                  />
                                ) : null;
                              })()}
                              <ExternalLink className="h-3 w-3 text-white/40" />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Gastos del Proyecto (projects.expenses) */}
          {expenses.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Gastos Directos ({expenses.length})
              </h4>
              <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                      <TableHead className="text-white/70 text-[10px] px-2">Descripción</TableHead>
                      <TableHead className="text-white/70 text-[10px] px-2 text-center">Categoría</TableHead>
                      <TableHead className="text-white/70 text-[10px] px-2 text-right">Importe</TableHead>
                      <TableHead className="text-white/70 text-[10px] px-2">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => {
                      const categoryInfo = getCategoryInfo(expense.category);
                      return (
                        <TableRow
                          key={expense.id}
                          className="border-white/10 hover:bg-white/"
                        >
                          <TableCell className="text-white font-medium text-[10px] px-2">
                            {expense.description}
                          </TableCell>
                          <TableCell className="px-2 text-center">
                            <Badge variant="outline" className="border text-[9px] px-1.5 py-0.5">
                              {categoryInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white font-medium text-[10px] px-2 text-right">
                            {formatCurrency(expense.amount || 0)}
                          </TableCell>
                          <TableCell className="text-white/60 text-[9px] px-2">
                            {new Date(expense.date).toLocaleDateString('es-ES')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}

      <CreateProjectExpenseDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={projectId}
        onSuccess={fetchExpenses}
      />
    </div>
  );
};

export default ProjectExpensesTab;