// DeveloperPage - Component Showcase for Development
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Code2, Component, Folder, Edit, Copy, Trash2, FileText, Tag,
  LayoutDashboard, CalendarDays, Receipt, Users,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";

// Common components
import StatusSelector from "../components/common/StatusSelector";
import UserInfo from "../components/common/UserInfo";
import PlatformBrand from "../components/common/PlatformBrand";
import LockedIndicator from "../components/common/LockedIndicator";
import MoreOptionsDropdown from "../components/common/MoreOptionsDropdown";
import ConfirmActionDialog from "../components/common/ConfirmActionDialog";
import DataList from "../components/common/DataList";
import SearchBar from "../components/common/SearchBar";
import SearchableSelect from "../components/common/SearchableSelect";
import CompactKpiCard from "../components/common/CompactKpiCard";
import PaginationControls from "../components/common/PaginationControls";
import FormDialog from "../components/common/FormDialog";

// UI components (shadcn/ui)
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Status constants
import { QUOTE_STATUSES } from "@/constants/quoteStatuses";
import { PROJECT_STATUSES } from "@/constants/projectStatuses";
import { PURCHASE_ORDER_STATUSES } from "@/constants/purchaseOrderStatuses";
import { SALES_DOCUMENT_STATUSES, SALES_PAYMENT_STATUSES } from "@/constants/salesInvoiceStatuses";
import { PURCHASE_DOCUMENT_STATUSES, PURCHASE_PAYMENT_STATUSES } from "@/constants/purchaseInvoiceStatuses";

interface ComponentShowcase {
  name: string;
  file: string;
  description: string;
  component: React.ReactNode;
}

interface StatusGroup {
  name: string;
  file: string;
  note?: string;
  statuses: ReadonlyArray<{ value: string; label: string; className: string; description?: string }>;
}

// NavTab trigger classes — replicates ProjectTabNavigation style
const NAV_TAB_TRIGGER =
  "relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap flex-shrink-0 " +
  "transition-all duration-300 ease-out " +
  "data-[state=inactive]:text-white/50 data-[state=inactive]:bg-transparent " +
  "data-[state=inactive]:hover:text-white/80 data-[state=inactive]:hover:bg-white/5 " +
  "data-[state=active]:bg-black data-[state=active]:text-white " +
  "data-[state=active]:shadow-lg data-[state=active]:shadow-black/20 " +
  "data-[state=active]:scale-[1.02] data-[state=active]:font-semibold " +
  "dark:data-[state=active]:bg-white dark:data-[state=active]:text-black";

const DeveloperPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();

  // Interactive states
  const [statusValue, setStatusValue] = useState("DRAFT");
  const [dropdownValue, setDropdownValue] = useState("option1");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchableSelectValue, setSearchableSelectValue] = useState("");
  const [switchValue, setSwitchValue] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [paginationPage, setPaginationPage] = useState(3);

  // ─── Mock data ───────────────────────────────────────────────────────────────

  const statusOptions = [
    { value: "DRAFT", label: "Borrador", className: "bg-muted text-muted-foreground" },
    { value: "SENT", label: "Enviado", className: "bg-blue-500" },
    { value: "APPROVED", label: "Aprobado", className: "bg-green-500" },
  ];

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

  const searchItems = [
    { id: "1", name: "Instalación pantallas LED", ref: "P-001" },
    { id: "2", name: "Sistema de sonido Bose", ref: "P-002" },
    { id: "3", name: "Cartelería digital Hotel Arts", ref: "P-003" },
    { id: "4", name: "Control room Barcelona", ref: "P-004" },
    { id: "5", name: "Videowall aeropuerto", ref: "P-005" },
  ];

  const selectOptions = [
    { value: "cliente1", label: "Hotel Arts Barcelona", sublabel: "CL-001" },
    { value: "cliente2", label: "Palau de la Música", sublabel: "CL-002" },
    { value: "cliente3", label: "Fira de Barcelona", sublabel: "CL-003" },
    { value: "cliente4", label: "Camp Nou Experience", sublabel: "CL-004" },
  ];

  const tableData = [
    { ref: "F-2026-001", cliente: "Hotel Arts Barcelona", fecha: "01/03/2026", importe: "€4.250,00", estado: "Cobrada" },
    { ref: "F-2026-002", cliente: "Palau de la Música", fecha: "08/03/2026", importe: "€12.800,00", estado: "Pendiente" },
    { ref: "F-2026-003", cliente: "Fira de Barcelona", fecha: "15/03/2026", importe: "€7.320,00", estado: "Vencida" },
    { ref: "F-2026-004", cliente: "Camp Nou Experience", fecha: "20/03/2026", importe: "€2.100,00", estado: "Borrador" },
  ];

  // ─── Status groups ────────────────────────────────────────────────────────────

  const statusGroups: StatusGroup[] = [
    {
      name: "Presupuestos",
      file: "constants/quoteStatuses.ts → QUOTE_STATUSES",
      statuses: QUOTE_STATUSES,
    },
    {
      name: "Facturas de venta — Estado documental",
      file: "constants/salesInvoiceStatuses.ts → SALES_DOCUMENT_STATUSES",
      note: "OVERDUE y RECTIFIED existen en DB (legacy) pero aún no están en el constant — pendiente de añadir.",
      statuses: [
        ...SALES_DOCUMENT_STATUSES,
        {
          value: "OVERDUE",
          label: "Vencida",
          className: "bg-red-500/20 text-red-400 border border-red-500/30",
          description: "Emitida + no cobrada + fecha vencida",
        },
        {
          value: "RECTIFIED",
          label: "Rectificada",
          className: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
          description: "Rectificativa generada sobre esta factura",
        },
      ],
    },
    {
      name: "Facturas de venta — Estado de cobro",
      file: "constants/salesInvoiceStatuses.ts → SALES_PAYMENT_STATUSES",
      note: "Calculado. Nunca se edita manualmente. Solo aplica cuando doc_status = ISSUED.",
      statuses: SALES_PAYMENT_STATUSES,
    },
    {
      name: "Facturas de compra — Estado documental",
      file: "constants/purchaseInvoiceStatuses.ts → PURCHASE_DOCUMENT_STATUSES",
      note: "OVERDUE existe como campo derivado (is_overdue) pero aún no como estado documental explícito — pendiente de añadir.",
      statuses: [
        ...PURCHASE_DOCUMENT_STATUSES,
        {
          value: "OVERDUE",
          label: "Vencida",
          className: "bg-red-500/20 text-red-400 border border-red-500/30",
          description: "Aprobada + no pagada + fecha vencida",
        },
      ],
    },
    {
      name: "Facturas de compra — Estado de pago",
      file: "constants/purchaseInvoiceStatuses.ts → PURCHASE_PAYMENT_STATUSES",
      note: "Calculado. Nunca se edita manualmente. Solo aplica cuando doc_status = APPROVED.",
      statuses: PURCHASE_PAYMENT_STATUSES,
    },
    {
      name: "Pedidos de compra",
      file: "constants/purchaseOrderStatuses.ts → PURCHASE_ORDER_STATUSES",
      note: "Documento NO fiscal. Sin asiento contable.",
      statuses: PURCHASE_ORDER_STATUSES,
    },
    {
      name: "Proyectos",
      file: "constants/projectStatuses.ts → PROJECT_STATUSES",
      statuses: PROJECT_STATUSES,
    },
  ];

  // ─── Component showcases ──────────────────────────────────────────────────────

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
      name: "SearchBar",
      file: "components/common/SearchBar.tsx",
      description: "Input de búsqueda con debounce, dropdown de resultados y navegación por teclado",
      component: (
        <div className="w-full max-w-md">
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            items={searchItems}
            getSearchText={(item) => `${item.name} ${item.ref}`}
            renderResult={(item) => ({ id: item.id, label: item.name, subtitle: item.ref, data: item })}
            placeholder="Buscar proyecto... (escribe LED, Bose...)"
          />
        </div>
      ),
    },
    {
      name: "SearchableSelect",
      file: "components/common/SearchableSelect.tsx",
      description: "Select con búsqueda integrada, sublabel y navegación por teclado",
      component: (
        <div className="w-full max-w-xs">
          <SearchableSelect
            value={searchableSelectValue}
            onChange={setSearchableSelectValue}
            options={selectOptions}
            placeholder="Seleccionar cliente..."
          />
        </div>
      ),
    },
    {
      name: "CompactKpiCard",
      file: "components/common/CompactKpiCard.tsx",
      description: "Tarjeta KPI de alta densidad con border-left de color, dot indicador y tendencia",
      component: (
        <div className="grid grid-cols-3 gap-3 w-full">
          <CompactKpiCard label="Facturación" value="€48.200" sub="Marzo 2026" color="emerald" trend={12.3} />
          <CompactKpiCard label="Pendiente cobro" value="€14.800" sub="5 facturas" color="amber" trend={-3.1} />
          <CompactKpiCard label="Proyectos activos" value="12" sub="En ejecución" color="cyan" />
        </div>
      ),
    },
    {
      name: "PaginationControls",
      file: "components/common/PaginationControls.tsx",
      description: "Controles de paginación con páginas, ellipsis y contador de registros",
      component: (
        <div className="w-full">
          <PaginationControls
            currentPage={paginationPage}
            totalPages={10}
            startIndex={(paginationPage - 1) * 10 + 1}
            endIndex={Math.min(paginationPage * 10, 94)}
            totalItems={94}
            canGoPrev={paginationPage > 1}
            canGoNext={paginationPage < 10}
            onPrevPage={() => setPaginationPage((p) => Math.max(1, p - 1))}
            onNextPage={() => setPaginationPage((p) => Math.min(10, p + 1))}
            onGoToPage={setPaginationPage}
          />
        </div>
      ),
    },
    {
      name: "FormDialog",
      file: "components/common/FormDialog.tsx",
      description: "Diálogo de formulario genérico con validación, layout 2 columnas y campos tipados",
      component: (
        <div className="flex flex-col items-center gap-3">
          <Button onClick={() => setFormDialogOpen(true)}>Abrir FormDialog</Button>
          <FormDialog
            open={formDialogOpen}
            onOpenChange={setFormDialogOpen}
            title="Nuevo cliente"
            description="Introduce los datos del nuevo cliente"
            onSubmit={async () => setFormDialogOpen(false)}
            submitLabel="Crear cliente"
            fields={[
              { name: "nombre", label: "Nombre", type: "text", required: true, placeholder: "Nombre del cliente" },
              { name: "email", label: "Email", type: "email", placeholder: "email@empresa.com" },
              { name: "telefono", label: "Teléfono", type: "tel", placeholder: "+34 600 000 000" },
              {
                name: "tipo",
                label: "Tipo",
                type: "select",
                options: [
                  { value: "empresa", label: "Empresa" },
                  { value: "particular", label: "Particular" },
                ],
              },
            ]}
          />
        </div>
      ),
    },
    {
      name: "Select (shadcn/ui)",
      file: "@/components/ui/select.tsx",
      description: "Dropdown de selección de la librería shadcn/ui. Usa Radix UI.",
      component: (
        <div className="w-full max-w-xs">
          <Select value={dropdownValue} onValueChange={setDropdownValue}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Opción 1</SelectItem>
              <SelectItem value="option2">Opción 2</SelectItem>
              <SelectItem value="option3">Opción 3</SelectItem>
            </SelectContent>
          </Select>
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
    {
      name: "Input",
      file: "components/ui/input.tsx",
      description: "Campo de texto base — usado dentro de formularios y filtros",
      component: (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Input placeholder="Campo de texto" />
          <Input type="email" placeholder="Email" />
          <Input disabled placeholder="Deshabilitado" />
        </div>
      ),
    },
    {
      name: "Tabs (NavTab)",
      file: "components/ui/tabs.tsx + components/projects/ProjectTabNavigation.tsx",
      description: "Pestañas de navegación — texto verde al seleccionar, sin líneas decorativas",
      component: (
        <div className="w-full">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="bg-transparent shadow-none h-auto p-0 flex gap-1 w-full justify-start">
              {[
                { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                { value: "planificacion", label: "Planificación", icon: CalendarDays },
                { value: "facturas", label: "Facturas", icon: Receipt },
                { value: "tecnicos", label: "Técnicos", icon: Users },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="
                    flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    bg-transparent shadow-none border-0
                    data-[state=active]:bg-transparent data-[state=active]:shadow-none
                    data-[state=active]:text-green-500 data-[state=active]:font-semibold
                    data-[state=inactive]:text-muted-foreground
                    hover:text-foreground transition-colors
                  "
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="dashboard" className="pt-3 text-sm text-muted-foreground">Contenido del Dashboard</TabsContent>
            <TabsContent value="planificacion" className="pt-3 text-sm text-muted-foreground">Contenido de Planificación</TabsContent>
            <TabsContent value="facturas" className="pt-3 text-sm text-muted-foreground">Contenido de Facturas</TabsContent>
            <TabsContent value="tecnicos" className="pt-3 text-sm text-muted-foreground">Contenido de Técnicos</TabsContent>
          </Tabs>
        </div>
      ),
    },
    {
      name: "Table (mock listado)",
      file: "components/ui/table.tsx",
      description: "Tabla base con cabecera, filas y Badge de estado — patrón de listado en el ERP",
      component: (
        <div className="w-full rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.ref} className="cursor-pointer hover:bg-muted/40">
                  <TableCell className="font-mono text-xs font-medium">{row.ref}</TableCell>
                  <TableCell className="text-sm">{row.cliente}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.fecha}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{row.importe}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.estado === "Cobrada"
                          ? "default"
                          : row.estado === "Pendiente"
                          ? "secondary"
                          : row.estado === "Vencida"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {row.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ),
    },
    {
      name: "Switch",
      file: "components/ui/switch.tsx",
      description: "Toggle booleano — activo/inactivo, visible/oculto, habilitado/deshabilitado",
      component: (
        <div className="flex items-center gap-3">
          <Switch id="switch-demo" checked={switchValue} onCheckedChange={setSwitchValue} />
          <Label htmlFor="switch-demo">{switchValue ? "Activo" : "Inactivo"}</Label>
        </div>
      ),
    },
    {
      name: "Checkbox",
      file: "components/ui/checkbox.tsx",
      description: "Casilla de verificación — selección múltiple, opciones en formularios",
      component: (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="check1" checked={checkboxValue} onCheckedChange={(v) => setCheckboxValue(!!v)} />
            <Label htmlFor="check1">Opción interactiva</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="check2" defaultChecked />
            <Label htmlFor="check2">Marcado por defecto</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="check3" disabled />
            <Label htmlFor="check3" className="text-muted-foreground">Deshabilitado</Label>
          </div>
        </div>
      ),
    },
    {
      name: "Tooltip",
      file: "components/ui/tooltip.tsx",
      description: "Texto emergente al hover sobre cualquier elemento interactivo (Button, icono, campo)",
      component: (
        <TooltipProvider>
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">Eliminar</Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Eliminar este elemento permanentemente</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm">Duplicar</Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Crear una copia de este documento</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm">Exportar</Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Descargar como PDF</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
    {
      name: "Skeleton",
      file: "components/ui/skeleton.tsx",
      description: "Estado de carga — placeholder con animate-pulse mientras se cargan datos de la API",
      component: (
        <div className="flex flex-col gap-3 w-full max-w-sm p-4 rounded-xl border border-border bg-card">
          {/* Fila de cabecera: avatar + título */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          {/* Bloque de contenido */}
          <Skeleton className="h-16 w-full rounded-lg" />
          {/* Fila de acciones */}
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-8 flex-1 rounded-md" />
            <Skeleton className="h-8 flex-1 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
          </div>
        </div>
      ),
    },
  ];

  // ─── Renderers ────────────────────────────────────────────────────────────────

  const renderSection = (folder: string, items: ComponentShowcase[]) => (
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

  const renderEstadosSection = () => (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Tag className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Estados del sistema</h2>
        <span className="text-sm text-muted-foreground">({statusGroups.length} módulos)</span>
      </div>
      <div className="grid gap-4">
        {statusGroups.map((group, index) => (
          <motion.div
            key={group.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3 min-w-0">
                <Tag className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{group.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono truncate">{group.file}</p>
                </div>
              </div>
              {group.note && (
                <p className="mt-1.5 text-xs text-muted-foreground/70 italic ml-7">{group.note}</p>
              )}
            </div>
            <div className="p-6 bg-background">
              <div className="flex flex-wrap gap-4">
                {group.statuses.map((status) => (
                  <div key={status.value} className="flex flex-col items-center gap-2">
                    <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-medium", status.className)}>
                      {status.label}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground leading-none">{status.value}</span>
                    {status.description && (
                      <span className="text-[10px] text-muted-foreground/60 text-center max-w-[100px] leading-tight">
                        {status.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <DetailNavigationBar
        pageTitle="Developer"
        contextInfo="Catálogo de Componentes"
        onBack={() => navigate(`/nexo-av/${userId}/dashboard`)}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-6xl mx-auto space-y-8"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Code2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Componentes Reutilizables</h1>
              <p className="text-sm text-muted-foreground">Catálogo de componentes disponibles en la plataforma NexoAV</p>
            </div>
          </div>

          {renderSection("components/common/", commonComponents)}
          <div className="pt-4">{renderSection("components/ui/ (shadcn)", uiComponents)}</div>
          <div className="pt-4">{renderEstadosSection()}</div>
        </motion.div>
      </div>
    </div>
  );
};

export default DeveloperPage;
