import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClientProjectsTabProps {
  clientId: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  quote_subtotal: number | null;
  quote_total: number | null;
  invoice_subtotal: number | null;
  invoice_total: number | null;
  created_at: string;
}

const PROJECT_STATUSES = [
  { value: 'DRAFT', label: 'Borrador', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  { value: 'PLANNING', label: 'Planificación', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'IN_PROGRESS', label: 'En Progreso', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'ON_HOLD', label: 'En Pausa', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'COMPLETED', label: 'Completado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'CANCELLED', label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const getStatusInfo = (status: string) => {
  return PROJECT_STATUSES.find(s => s.value === status) || PROJECT_STATUSES[0];
};

const ClientProjectsTab = ({ clientId }: ClientProjectsTabProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch projects from database when projects table exists
    setLoading(false);
  }, [clientId]);

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-end">
        <Button className="bg-white text-black hover:bg-white/90">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* Projects Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/10 overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">Proyecto</TableHead>
              <TableHead className="text-white/60">Estado</TableHead>
              <TableHead className="text-white/60 text-right">Presupuesto</TableHead>
              <TableHead className="text-white/60 text-right">Factura</TableHead>
              <TableHead className="text-white/60">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={5} className="text-center py-12">
                  <FolderKanban className="h-12 w-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">No hay proyectos para este cliente</p>
                  <Button
                    variant="link"
                    className="text-white/60 hover:text-white mt-2"
                  >
                    Crear el primer proyecto
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => {
                const statusInfo = getStatusInfo(project.status);
                return (
                  <TableRow 
                    key={project.id} 
                    className="border-white/10 hover:bg-white/5 cursor-pointer"
                  >
                    <TableCell>
                      <p className="text-white font-medium">{project.name}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${statusInfo.color} border`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-white/60 text-sm">
                        <p>{formatCurrency(project.quote_subtotal)}</p>
                        <p className="text-white">{formatCurrency(project.quote_total)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-white/60 text-sm">
                        <p>{formatCurrency(project.invoice_subtotal)}</p>
                        <p className="text-white">{formatCurrency(project.invoice_total)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-white/60 text-sm">
                      {new Date(project.created_at).toLocaleDateString('es-ES')}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
};

export default ClientProjectsTab;
