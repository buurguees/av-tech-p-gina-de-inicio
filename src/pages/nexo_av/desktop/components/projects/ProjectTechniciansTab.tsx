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
import { Plus, Users, Loader2, FileText, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Technician {
  technician_id: string;
  technician_number: string | null;
  technician_name: string;
  technician_type: string;
  technician_tax_id: string | null;
  total_invoiced: number;
  invoice_count: number;
  last_invoice_date: string | null;
  first_invoice_date: string | null;
}

interface ProjectTechniciansTabProps {
  projectId: string;
}

const TECHNICIAN_TYPES = [
  { value: 'EMPLOYEE', label: 'Plantilla', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'COMPANY', label: 'Empresa', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'FREELANCER', label: 'Autónomo', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
];

const getTypeInfo = (type: string) => {
  return TECHNICIAN_TYPES.find(t => t.value === type) || TECHNICIAN_TYPES[0];
};

const ProjectTechniciansTab = ({ projectId }: ProjectTechniciansTabProps) => {
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('list_project_technicians', {
        p_project_id: projectId
      } as any);

      if (error) throw error;
      setTechnicians((data || []) as Technician[]);
    } catch (error) {
      console.error('Error fetching project technicians:', error);
      toast.error("Error al cargar los técnicos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, [projectId]);

  const handleAddTechnician = () => {
    // TODO: Open add technician dialog
    console.log('Add technician to project:', projectId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="w-full">
      {/* Header - Estilo Holded */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Técnicos</h1>
            <Info className="h-3 w-3 text-muted-foreground" />
            {technicians.length > 0 && (
              <span className="text-muted-foreground text-xs">
                {technicians.length} técnico{technicians.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table - Siempre muestra cabeceras */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/30">
                <TableHead className="text-white/70 text-[10px] px-2 text-left">Nº</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-left">Técnico</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-center">Tipo</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-left">NIF/CIF</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-right">Facturas</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-right">Total Facturado</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-left">Última Factura</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {technicians.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground text-sm">No hay técnicos</p>
                      <p className="text-muted-foreground/70 text-[10px] mt-1">
                        Los técnicos aparecerán aquí cuando se asignen facturas de compra o gastos al proyecto
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                technicians.map((technician) => {
                  const typeInfo = getTypeInfo(technician.technician_type);
                  return (
                    <TableRow
                      key={technician.technician_id}
                      className="border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors duration-200"
                      onClick={() => {
                        const userId = window.location.pathname.split('/')[2];
                        navigate(`/nexo-av/${userId}/technicians/${technician.technician_id}`);
                      }}
                    >
                      <TableCell className="font-mono text-white/70 text-[13px] font-semibold px-2">
                        {technician.technician_number || '-'}
                      </TableCell>
                      <TableCell className="text-white font-medium text-[10px] px-2">
                        {technician.technician_name}
                      </TableCell>
                      <TableCell className="px-2 text-center">
                        <div className="flex justify-center">
                          <Badge variant="outline" className={cn(typeInfo.color, "border text-[9px] px-1.5 py-0.5")}>
                            {typeInfo.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-white/60 text-[9px] px-2">
                        {technician.technician_tax_id || '-'}
                      </TableCell>
                      <TableCell className="text-white/70 text-[10px] px-2 text-right">
                        {technician.invoice_count}
                      </TableCell>
                      <TableCell className="text-white font-medium text-[10px] px-2 text-right">
                        {formatCurrency(parseFloat(technician.total_invoiced?.toString() || '0'))}
                      </TableCell>
                      <TableCell className="text-white/60 text-[9px] px-2">
                        {technician.last_invoice_date 
                          ? new Date(technician.last_invoice_date).toLocaleDateString('es-ES')
                          : '-'}
                      </TableCell>
                      <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="h-3 w-3 text-white/40" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ProjectTechniciansTab;