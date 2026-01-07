import { useState, useEffect } from "react";
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
import { Plus, Users, Loader2 } from "lucide-react";

interface Technician {
  id: string;
  name: string;
  role: string;
  hours_worked: number;
  hourly_rate: number;
  status: string;
}

interface ProjectTechniciansTabProps {
  projectId: string;
}

const TECHNICIAN_ROLES = [
  { value: 'INSTALLER', label: 'Instalador', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'ELECTRICIAN', label: 'Electricista', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'PROGRAMMER', label: 'Programador', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'SUPERVISOR', label: 'Supervisor', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'OTHER', label: 'Otro', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const getRoleInfo = (role: string) => {
  return TECHNICIAN_ROLES.find(r => r.value === role) || TECHNICIAN_ROLES[4];
};

const ProjectTechniciansTab = ({ projectId }: ProjectTechniciansTabProps) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch technicians from database when table is created
    setLoading(false);
    setTechnicians([]);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Técnicos del Proyecto</h3>
        <Button
          onClick={handleAddTechnician}
          className="bg-white text-black hover:bg-white/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir Técnico
        </Button>
      </div>

      {technicians.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <Users className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 mb-4">No hay técnicos asignados a este proyecto</p>
          <Button
            variant="link"
            className="text-white/60 hover:text-white"
            onClick={handleAddTechnician}
          >
            Asignar el primer técnico
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">Nombre</TableHead>
                <TableHead className="text-white/60">Rol</TableHead>
                <TableHead className="text-white/60 text-right">Horas</TableHead>
                <TableHead className="text-white/60 text-right">Tarifa/h</TableHead>
                <TableHead className="text-white/60 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {technicians.map((technician) => {
                const roleInfo = getRoleInfo(technician.role);
                const total = technician.hours_worked * technician.hourly_rate;
                return (
                  <TableRow
                    key={technician.id}
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell className="text-white font-medium">
                      {technician.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${roleInfo.color} border`}>
                        {roleInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {technician.hours_worked}h
                    </TableCell>
                    <TableCell className="text-white/60 text-right">
                      {technician.hourly_rate?.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      })}
                    </TableCell>
                    <TableCell className="text-white text-right font-medium">
                      {total?.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ProjectTechniciansTab;