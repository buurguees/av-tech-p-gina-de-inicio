// DeveloperPage - Component Showcase for Development
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Code2, Component, Folder, Edit, Copy, Trash2, FileText } from "lucide-react";
import { motion } from "motion/react";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";

// Import components to showcase (only ones that still exist as shared)
import StatusSelector from "../components/common/StatusSelector";
import DropDown from "../components/common/DropDown";
import UserInfo from "../components/common/UserInfo";
import PlatformBrand from "../components/common/PlatformBrand";
import LockedIndicator from "../components/common/LockedIndicator";
import MoreOptionsDropdown from "../components/common/MoreOptionsDropdown";
import ConfirmActionDialog from "../components/common/ConfirmActionDialog";
import DataList from "../components/common/DataList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Component registry with metadata
interface ComponentShowcase {
  name: string;
  file: string;
  description: string;
  component: React.ReactNode;
}

const DeveloperPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  
  // States for interactive components
  const [statusValue, setStatusValue] = useState("DRAFT");
  const [dropdownValue, setDropdownValue] = useState("option1");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Status options for StatusSelector
  const statusOptions = [
    { value: "DRAFT", label: "Borrador", className: "bg-muted text-muted-foreground" },
    { value: "SENT", label: "Enviado", className: "bg-blue-500" },
    { value: "APPROVED", label: "Aprobado", className: "bg-green-500" },
  ];

  // Sample data for DataList
  const sampleData = [
    { id: "1", number: "P-001", name: "Proyecto Ejemplo", status: "Activo", total: "€12,500" },
    { id: "2", number: "P-002", name: "Instalación LED", status: "Pendiente", total: "€8,200" },
    { id: "3", number: "P-003", name: "Mantenimiento Anual", status: "Completado", total: "€3,400" },
  ];

  const dataListColumns = [
    { key: "number", label: "Nº", priority: 1 },
    { key: "name", label: "Nombre", priority: 2 },
    { key: "status", label: "Estado", priority: 3 },
    { key: "total", label: "Total", priority: 4, align: "right" as const },
  ];

  // Define showcased components - Common
  const commonComponents: ComponentShowcase[] = [
    {
      name: "StatusSelector",
      file: "components/common/StatusSelector.tsx",
      description: "Selector de estado con colores semánticos",
      component: (
        <StatusSelector
          currentStatus={statusValue}
          statusOptions={statusOptions}
          onStatusChange={setStatusValue}
        />
      ),
    },
    {
      name: "DropDown",
      file: "components/common/DropDown.tsx",
      description: "Dropdown simple para 2-7 opciones. Ocupa 100% del ancho del contenedor.",
      component: (
        <div className="w-full">
          <DropDown
            value={dropdownValue}
            onSelect={setDropdownValue}
            options={[
              { value: "option1", label: "Opción 1" },
              { value: "option2", label: "Opción 2" },
              { value: "option3", label: "Opción 3" },
            ]}
          />
        </div>
      ),
    },
    {
      name: "UserInfo",
      file: "components/common/UserInfo.tsx",
      description: "Información de usuario con nombre y rol",
      component: <UserInfo name="Alex Burgués" role="Admin" />,
    },
    {
      name: "PlatformBrand",
      file: "components/common/PlatformBrand.tsx",
      description: "Logo y nombre de la plataforma",
      component: <PlatformBrand />,
    },
    {
      name: "LockedIndicator",
      file: "components/common/LockedIndicator.tsx",
      description: "Indicador de elemento bloqueado",
      component: <LockedIndicator isLocked={true} message="Este documento está bloqueado" />,
    },
    {
      name: "MoreOptionsDropdown",
      file: "components/common/MoreOptionsDropdown.tsx",
      description: "Menú de opciones (tres puntos) con acciones destructivas separadas",
      component: (
        <MoreOptionsDropdown
          actions={[
            { label: "Editar", icon: <Edit className="h-4 w-4" />, onClick: () => {} },
            { label: "Duplicar", icon: <Copy className="h-4 w-4" />, onClick: () => {} },
            { label: "Eliminar", icon: <Trash2 className="h-4 w-4" />, onClick: () => {}, variant: "destructive" },
          ]}
        />
      ),
    },
    {
      name: "ConfirmActionDialog",
      file: "components/common/ConfirmActionDialog.tsx",
      description: "Diálogo de confirmación para acciones destructivas",
      component: (
        <div className="flex flex-col items-center gap-3">
          <Button variant="destructive" onClick={() => setConfirmDialogOpen(true)}>
            Abrir diálogo de confirmación
          </Button>
          <ConfirmActionDialog
            open={confirmDialogOpen}
            onOpenChange={setConfirmDialogOpen}
            title="¿Eliminar elemento?"
            description="Esta acción no se puede deshacer. ¿Estás seguro?"
            confirmLabel="Eliminar"
            onConfirm={() => setConfirmDialogOpen(false)}
          />
        </div>
      ),
    },
    {
      name: "DataList",
      file: "components/common/DataList.tsx",
      description: "Lista de datos responsive con columnas ordenables y acciones",
      component: (
        <div className="w-full border border-border rounded-xl overflow-hidden">
          <DataList
            data={sampleData}
            columns={dataListColumns}
            getItemId={(item) => item.id}
            onItemClick={() => {}}
            actions={[
              { label: "Ver", icon: <FileText className="h-4 w-4" />, onClick: () => {} },
              { label: "Eliminar", icon: <Trash2 className="h-4 w-4" />, onClick: () => {}, variant: "destructive" },
            ]}
          />
        </div>
      ),
    },
  ];

  // UI Components from shadcn
  const uiComponents: ComponentShowcase[] = [
    {
      name: "Button",
      file: "components/ui/button.tsx",
      description: "Botones con variantes y tamaños consistentes (h-11 por defecto)",
      component: (
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      ),
    },
    {
      name: "Badge",
      file: "components/ui/badge.tsx",
      description: "Etiquetas para estados y categorías",
      component: (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      ),
    },
  ];

  const renderSection = (title: string, folder: string, items: ComponentShowcase[]) => (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Folder className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">{folder}</h2>
        <span className="text-sm text-muted-foreground">({items.length} componentes)</span>
      </div>

      <div className="grid gap-4">
        {items.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Component className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono truncate">{item.file}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground max-w-md text-right hidden sm:block">{item.description}</span>
            </div>
            <div className="p-6 bg-background">
              <div className="flex items-center justify-center min-h-[60px]">{item.component}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <DetailNavigationBar pageTitle="Developer" contextInfo="Catálogo de Componentes" onBack={() => navigate(`/nexo-av/${userId}/dashboard`)} />
      <div className="flex-1 overflow-y-auto p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Code2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Componentes Reutilizables</h1>
              <p className="text-sm text-muted-foreground">Catálogo de componentes disponibles en la plataforma NexoAV</p>
            </div>
          </div>
          {renderSection("Componentes Comunes", "components/common/", commonComponents)}
          <div className="pt-4">{renderSection("Componentes UI (shadcn)", "components/ui/", uiComponents)}</div>
        </motion.div>
      </div>
    </div>
  );
};

export default DeveloperPage;