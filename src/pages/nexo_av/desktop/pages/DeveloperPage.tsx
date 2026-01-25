// DeveloperPage - Component Showcase for Development
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Code2, Component, Folder, Edit, Copy, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";

// Import components to showcase
import StatusSelector from "../components/common/StatusSelector";
import DropDown from "../components/common/DropDown";
import SearchableDropdown from "../components/common/SearchableDropdown";
import TextInput from "../components/common/TextInput";
import UserInfo from "../components/common/UserInfo";
import PlatformBrand from "../components/common/PlatformBrand";
import LockedIndicator from "../components/common/LockedIndicator";
import MoreOptionsDropdown from "../components/common/MoreOptionsDropdown";
import FormSection from "../components/common/FormSection";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [searchableValue, setSearchableValue] = useState("");
  const [textValue, setTextValue] = useState("Texto de ejemplo");

  // Status options for StatusSelector
  const statusOptions = [
    { value: "DRAFT", label: "Borrador", className: "bg-muted text-muted-foreground" },
    { value: "SENT", label: "Enviado", className: "bg-blue-500" },
    { value: "APPROVED", label: "Aprobado", className: "bg-green-500" },
  ];

  // Define showcased components
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
      description: "Dropdown simple para 2-7 opciones",
      component: (
        <div className="w-64">
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
      name: "SearchableDropdown",
      file: "components/common/SearchableDropdown.tsx",
      description: "Dropdown con búsqueda integrada para listas largas",
      component: (
        <div className="w-80">
          <SearchableDropdown
            value={searchableValue}
            onChange={setSearchableValue}
            options={[
              { value: "1", label: "Cliente Ejemplo S.L.", secondaryLabel: "C-001" },
              { value: "2", label: "Empresa Demo S.A.", secondaryLabel: "C-002" },
              { value: "3", label: "Corporación Test", secondaryLabel: "C-003" },
            ]}
            placeholder="Seleccionar cliente..."
          />
        </div>
      ),
    },
    {
      name: "TextInput",
      file: "components/common/TextInput.tsx",
      description: "Campo de texto estilizado con label opcional",
      component: (
        <div className="w-64">
          <TextInput
            label="Nombre"
            value={textValue}
            onChange={setTextValue}
            placeholder="Escribe aquí..."
          />
        </div>
      ),
    },
    {
      name: "UserInfo",
      file: "components/common/UserInfo.tsx",
      description: "Información de usuario con nombre y rol",
      component: (
        <UserInfo 
          name="Alex Burgués" 
          role="Admin"
        />
      ),
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
      component: (
        <LockedIndicator isLocked={true} message="Este documento está bloqueado" />
      ),
    },
    {
      name: "MoreOptionsDropdown",
      file: "components/common/MoreOptionsDropdown.tsx",
      description: "Menú de opciones (tres puntos) con acciones",
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
      name: "FormSection",
      file: "components/common/FormSection.tsx",
      description: "Sección de formulario con título y grid",
      component: (
        <div className="w-full max-w-md">
          <FormSection title="Datos Generales">
            <Input placeholder="Campo 1" />
            <Input placeholder="Campo 2" />
          </FormSection>
        </div>
      ),
    },
    {
      name: "Button (shadcn/ui)",
      file: "components/ui/button.tsx",
      description: "Botones con variantes y tamaños",
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
      name: "Input (shadcn/ui)",
      file: "components/ui/input.tsx",
      description: "Campo de entrada básico",
      component: (
        <div className="w-64">
          <Input placeholder="Escribe algo..." />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Navigation Bar */}
      <DetailNavigationBar
        pageTitle="Developer"
        contextInfo="Catálogo de Componentes"
        onBack={() => navigate(`/nexo-av/${userId}/dashboard`)}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-6xl mx-auto space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Code2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Componentes Reutilizables</h1>
              <p className="text-sm text-muted-foreground">
                Catálogo de componentes disponibles en la plataforma
              </p>
            </div>
          </div>

          {/* Common Components Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Folder className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">
                components/common/
              </h2>
              <span className="text-sm text-muted-foreground">
                ({commonComponents.length} componentes)
              </span>
            </div>

            <div className="grid gap-4">
              {commonComponents.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  {/* Component Header */}
                  <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Component className="h-4 w-4 text-primary" />
                      <div>
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                        <p className="text-xs text-muted-foreground font-mono">
                          {item.file}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground max-w-md text-right">
                      {item.description}
                    </span>
                  </div>

                  {/* Component Preview */}
                  <div className="p-6 bg-background">
                    <div className="flex items-center justify-center min-h-[60px]">
                      {item.component}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
};

export default DeveloperPage;
