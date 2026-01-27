import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  Loader2,
  User,
  Receipt,
  CreditCard,
  FileText,
  Check,
  Clock,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useNexoAvTheme } from "../hooks/useNexoAvTheme";
import { useToast } from "@/hooks/use-toast";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import CreatePartnerPayrollDialog from "../components/rrhh/CreatePartnerPayrollDialog";
import RegisterPartnerPayrollPaymentDialog from "../components/rrhh/RegisterPartnerPayrollPaymentDialog";
import EditWorkerDialog from "../components/rrhh/EditWorkerDialog";

interface Partner {
  id: string;
  partner_number: string;
  full_name: string;
  tax_id: string | null;
  status: string;
  created_at: string;
}

interface PartnerPayroll {
  id: string;
  compensation_number: string;
  period_year: number;
  period_month: number;
  gross_amount: number;
  irpf_rate: number;
  irpf_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
  partner_name: string;
  partner_number: string;
}

// Datos extendidos del socio para el formulario de nómina
interface PartnerFullData {
  full_name: string;
  tax_id: string;
  address?: string;
  city?: string;
  postal_code?: string;
  province?: string;
  iban?: string;
  email?: string;
  irpf_rate: number;
  ss_regime: string;
}

function PartnerDetailPage() {
  const navigate = useNavigate();
  const { userId, partnerId } = useParams<{ userId: string; partnerId: string }>();
  const { toast } = useToast();
  useNexoAvTheme();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [payrolls, setPayrolls] = useState<PartnerPayroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("payrolls");
  const [showCreatePayrollDialog, setShowCreatePayrollDialog] = useState(false);
  const [selectedPayrollForPayment, setSelectedPayrollForPayment] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [linkedWorkerId, setLinkedWorkerId] = useState<string | null>(null);
  
  // Datos completos del socio para el formulario de nómina
  const [partnerFullData, setPartnerFullData] = useState<PartnerFullData>({
    full_name: "",
    tax_id: "",
    irpf_rate: 19,
    ss_regime: "RETA",
  });
  const fetchPartner = async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      // Get partner from list
      const { data, error } = await supabase.rpc("list_partners", {
        p_status: "ACTIVE",
      });

      if (error) throw error;
      const found = (data || []).find((p: any) => p.id === partnerId);
      if (found) {
        setPartner(found);
        
        // Fetch the full worker data (IRPF, address, etc.) from the linked authorized_user
        const { data: workersData } = await supabase.rpc("list_workers");
        const linkedUser = (workersData || []).find(
          (w: any) => w.linked_partner_id === partnerId
        );
        
        if (linkedUser) {
          setLinkedWorkerId(linkedUser.id);
          const { data: workerDetail } = await (supabase.rpc as any)("get_worker_detail", {
            p_user_id: linkedUser.id,
          });
          if (workerDetail?.[0]) {
            const wd = workerDetail[0];
            setPartnerFullData({
              full_name: found.full_name,
              tax_id: found.tax_id || wd.tax_id || "",
              address: wd.address,
              city: wd.city,
              postal_code: wd.postal_code,
              province: wd.province,
              iban: wd.iban,
              email: wd.email,
              irpf_rate: wd.irpf_rate || 19,
              ss_regime: wd.ss_regime || "RETA",
            });
          } else {
            // No linked worker, use partner data with default IRPF
            setPartnerFullData({
              full_name: found.full_name,
              tax_id: found.tax_id || "",
              irpf_rate: 19,
              ss_regime: "RETA",
            });
          }
        } else {
          setLinkedWorkerId(null);
          // No linked worker, use partner data with default IRPF
          setPartnerFullData({
            full_name: found.full_name,
            tax_id: found.tax_id || "",
            irpf_rate: 19,
            ss_regime: "RETA",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching partner:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrolls = async () => {
    if (!partnerId) return;
    try {
      const { data, error } = await supabase.rpc("list_partner_compensation_runs", {
        p_partner_id: partnerId,
      });

      if (error) throw error;
      setPayrolls(data || []);
    } catch (error) {
      console.error("Error fetching payrolls:", error);
    }
  };

  useEffect(() => {
    fetchPartner();
    fetchPayrolls();
  }, [partnerId]);

  const handleConfirmPayroll = async (payrollId: string) => {
    try {
      const { error } = await supabase.rpc("post_partner_compensation_run", {
        p_compensation_run_id: payrollId,
      });

      if (error) throw error;

      toast({
        title: "Nómina confirmada",
        description: "El asiento contable se ha generado correctamente",
      });

      fetchPayrolls();
    } catch (error: any) {
      console.error("Error confirming payroll:", error);
      toast({
        title: "Error",
        description: error.message || "Error al confirmar la nómina",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(val);
  };

  const getMonthName = (month: number) => {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return months[month - 1];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Borrador</Badge>;
      case "POSTED":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Lock className="w-3 h-3 mr-1" />Confirmada</Badge>;
      case "PARTIAL":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><AlertCircle className="w-3 h-3 mr-1" />Parcial</Badge>;
      case "PAID":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Lock className="w-3 h-3 mr-1" />Pagada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const ytdStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearPayrolls = payrolls.filter(p => p.period_year === currentYear && p.status !== "DRAFT");
    return {
      totalGross: yearPayrolls.reduce((acc, p) => acc + p.gross_amount, 0),
      totalIrpf: yearPayrolls.reduce((acc, p) => acc + p.irpf_amount, 0),
      totalNet: yearPayrolls.reduce((acc, p) => acc + p.net_amount, 0),
      count: yearPayrolls.length,
    };
  }, [payrolls]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Socio no encontrado</p>
        <Button variant="outline" onClick={() => navigate(`/nexo-av/${userId}/partners`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Navigation Bar */}
      <DetailNavigationBar
        pageTitle={partner.full_name}
        contextInfo={partner.partner_number}
        backPath={`/nexo-av/${userId}/partners`}
        tools={
          linkedWorkerId ? (
            <DetailActionButton
              actionType="edit"
              onClick={() => setShowEditDialog(true)}
            />
          ) : null
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Sidebar - Info del socio */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Datos del Socio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NIF</span>
                  <span className="font-medium">{partner.tax_id || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  {partner.status === "ACTIVE" ? (
                    <Badge className="bg-green-500/20 text-green-400">Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* YTD Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Resumen Anual ({new Date().getFullYear()})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nóminas</span>
                  <span className="text-xl font-bold">{ytdStats.count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Bruto Total</span>
                  <span className="font-medium">{formatCurrency(ytdStats.totalGross)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">IRPF Retenido</span>
                  <span className="font-medium text-orange-400">{formatCurrency(ytdStats.totalIrpf)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/50">
                  <span className="text-sm text-muted-foreground">Neto Total</span>
                  <span className="font-bold text-green-400">{formatCurrency(ytdStats.totalNet)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="payrolls" className="gap-2">
                    <FileText className="w-4 h-4" />
                    Nóminas
                  </TabsTrigger>
                </TabsList>

                {activeTab === "payrolls" && (
                  <Button onClick={() => setShowCreatePayrollDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Nómina
                  </Button>
                )}
              </div>

              <TabsContent value="payrolls" className="mt-0">
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Período</th>
                          <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Bruto</th>
                          <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase">IRPF</th>
                          <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Neto</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Estado</th>
                          <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrolls.map((payroll) => (
                          <tr key={payroll.id} className="border-b border-border/30 hover:bg-muted/30">
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium">{getMonthName(payroll.period_month)} {payroll.period_year}</p>
                                <p className="text-xs text-muted-foreground">{payroll.compensation_number}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-medium">{formatCurrency(payroll.gross_amount)}</td>
                            <td className="py-3 px-4 text-right text-orange-400">
                              -{formatCurrency(payroll.irpf_amount)}
                              <span className="text-xs text-muted-foreground ml-1">({payroll.irpf_rate}%)</span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-green-400">{formatCurrency(payroll.net_amount)}</td>
                            <td className="py-3 px-4 text-center">{getStatusBadge(payroll.status)}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {payroll.status === "DRAFT" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleConfirmPayroll(payroll.id)}
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Confirmar
                                  </Button>
                                )}
                                {(payroll.status === "POSTED" || payroll.status === "PARTIAL") && (
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedPayrollForPayment(payroll.id)}
                                  >
                                    <CreditCard className="w-3 h-3 mr-1" />
                                    Pagar
                                  </Button>
                                )}
                                {payroll.status === "PAID" && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    Bloqueada
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {payrolls.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-muted-foreground">
                              No hay nóminas registradas para este socio
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreatePartnerPayrollDialog
        open={showCreatePayrollDialog}
        onOpenChange={setShowCreatePayrollDialog}
        partnerId={partnerId!}
        partnerData={partnerFullData}
        onSuccess={fetchPayrolls}
      />

      {selectedPayrollForPayment && (
        <RegisterPartnerPayrollPaymentDialog
          open={!!selectedPayrollForPayment}
          onOpenChange={(open) => !open && setSelectedPayrollForPayment(null)}
          payrollId={selectedPayrollForPayment}
          onSuccess={fetchPayrolls}
        />
      )}

      {/* Edit Worker Dialog */}
      {linkedWorkerId && (
        <EditWorkerDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          workerId={linkedWorkerId}
          onSuccess={() => {
            fetchPartner();
          }}
        />
      )}
    </div>
  );
}

export default PartnerDetailPage;
