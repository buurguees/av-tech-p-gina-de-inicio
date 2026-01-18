import { useState, useEffect, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, FolderKanban, Loader2, MoreVertical, ChevronUp, ChevronDown, Info, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import CreateProjectDialog from "./components/CreateProjectDialog";
import PaginationControls from "./components/PaginationControls";
import { createMobilePage } from "./MobilePageWrapper";
import { cn } from "@/lib/utils";

// Lazy load mobile version
const ProjectsPageMobile = lazy(() => import("./mobile/ProjectsPageMobile"));

interface Project {
  id: string;
  project_number: string;
  client_id: string | null;
  client_name: string | null;
  status: string;
  project_address: string | null;
  project_city: string | null;
  client_order_number: string | null;
  local_name: string | null;
  project_name: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

const PROJECT_STATUSES = [
  { value: 'PLANNED', label: 'Planificado', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'IN_PROGRESS', label: 'En Progreso', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'PAUSED', label: 'Pausado', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'COMPLETED', label: 'Completado', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'CANCELLED', label: 'Cancelado', color: 'bg-red-100 text-red-700 border-red-300' },
];

const getStatusInfo = (status: string) => {
  return PROJECT_STATUSES.find(s => s.value === status) || PROJECT_STATUSES[0];
};

import ProjectsListSidebar from "./components/ProjectsListSidebar";

const ProjectsPageDesktop = () => {
  // ... rest of imports/logic ...
  const { userId } = useParams();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 500);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('list_projects', {
        p_search: debouncedSearchTerm || null
      });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [debouncedSearchTerm]);

  const handleProjectClick = (projectId: string) => {
    navigate(`/nexo-av/${userId}/projects/${projectId}`);
  };

  const handleProjectCreated = () => {
    setIsCreateDialogOpen(false);
    fetchProjects();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(new Set(paginatedProjects.map(p => p.id)));
    } else {
      setSelectedProjects(new Set());
    }
  };

  const handleSelectProject = (projectId: string, checked: boolean) => {
    const newSelected = new Set(selectedProjects);
    if (checked) {
      newSelected.add(projectId);
    } else {
      newSelected.delete(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case "number":
        aValue = a.project_number || "";
        bValue = b.project_number || "";
        break;
      case "client":
        aValue = a.client_name || "";
        bValue = b.client_name || "";
        break;
      case "name":
        aValue = a.project_name || "";
        bValue = b.project_name || "";
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "city":
        aValue = a.project_city || "";
        bValue = b.project_city || "";
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination (50 records per page)
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedProjects,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(sortedProjects, { pageSize: 50 });

  return (
    <div className="w-full">
      <div className="w-[95%] max-w-[1900px] mx-auto px-3 md:px-4 pb-4 md:pb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-card/50 border border-border rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <span className="text-muted-foreground text-sm font-medium">Proyectos Activos</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">
                      {projects.filter(p => p.status === 'IN_PROGRESS').length}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">en ejecución</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-card/50 border border-border rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-600">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <span className="text-muted-foreground text-sm font-medium">Planificados</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">
                      {projects.filter(p => p.status === 'PLANNED').length}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">pendientes de inicio</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-card/50 border border-border rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <span className="text-muted-foreground text-sm font-medium">Completados</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">
                      {projects.filter(p => p.status === 'COMPLETED').length}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">histórico total</span>
                  </div>
                </motion.div>
              </div>

              {/* Header - Estilo Holded */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Proyectos</h1>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Acciones
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          Exportar seleccionados
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Cambiar estado
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="h-9 px-4 text-sm font-medium"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Nuevo proyecto
                      <span className="ml-2 text-xs opacity-70">N</span>
                    </Button>
                  </div>
                </div>

                {/* Search Bar - Estilo Holded */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar proyectos..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pr-11 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FolderKanban className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay proyectos</p>
                  <p className="text-muted-foreground/70 text-sm mt-1">
                    Crea tu primer proyecto para comenzar
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/30">
                          <TableHead className="w-12 px-4">
                            <Checkbox
                              checked={selectedProjects.size === paginatedProjects.length && paginatedProjects.length > 0}
                              onCheckedChange={handleSelectAll}
                              className="border-white/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                            />
                          </TableHead>
                          <TableHead
                            className="text-white/70 cursor-pointer hover:text-white select-none"
                            onClick={() => handleSort("number")}
                          >
                            <div className="flex items-center gap-1">
                              Nº Proyecto
                              {sortColumn === "number" && (
                                sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-white/70 cursor-pointer hover:text-white select-none"
                            onClick={() => handleSort("client")}
                          >
                            <div className="flex items-center gap-1">
                              Cliente
                              {sortColumn === "client" && (
                                sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-white/70 cursor-pointer hover:text-white select-none"
                            onClick={() => handleSort("name")}
                          >
                            <div className="flex items-center gap-1">
                              Nombre
                              {sortColumn === "name" && (
                                sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="text-white/70">Pedido</TableHead>
                          <TableHead
                            className="text-white/70 cursor-pointer hover:text-white select-none"
                            onClick={() => handleSort("status")}
                          >
                            <div className="flex items-center gap-1">
                              Estado
                              {sortColumn === "status" && (
                                sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-white/70 cursor-pointer hover:text-white select-none"
                            onClick={() => handleSort("city")}
                          >
                            <div className="flex items-center gap-1">
                              Ciudad
                              {sortColumn === "city" && (
                                sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="text-white/70">Local</TableHead>
                          <TableHead className="text-white/70 w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedProjects.map((project) => {
                          const statusInfo = getStatusInfo(project.status);
                          const isSelected = selectedProjects.has(project.id);
                          return (
                            <TableRow
                              key={project.id}
                              className={cn(
                                "border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors duration-200",
                                isSelected && "bg-white/10"
                              )}
                              onClick={() => handleProjectClick(project.id)}
                            >
                              <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleSelectProject(project.id, checked as boolean)}
                                  className="border-white/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                />
                              </TableCell>
                              <TableCell className="font-mono text-white text-sm">
                                {project.project_number}
                              </TableCell>
                              <TableCell className="text-white text-sm">
                                {project.client_name || '-'}
                              </TableCell>
                              <TableCell className="text-white/80 text-sm max-w-xs truncate">
                                {project.project_name}
                              </TableCell>
                              <TableCell className="text-white/70 text-sm">
                                {project.client_order_number || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn(statusInfo.color, "border text-xs")}>
                                  {statusInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-white/70 text-sm">
                                {project.project_city || '-'}
                              </TableCell>
                              <TableCell className="text-white/70 text-sm">
                                {project.local_name || '-'}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                                    <DropdownMenuItem
                                      className="text-white hover:bg-white/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleProjectClick(project.id);
                                      }}
                                    >
                                      Ver detalle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-white hover:bg-white/10">
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-white hover:bg-white/10">
                                      Duplicar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      startIndex={startIndex}
                      endIndex={endIndex}
                      totalItems={totalItems}
                      canGoPrev={canGoPrev}
                      canGoNext={canGoNext}
                      onPrevPage={prevPage}
                      onNextPage={nextPage}
                      onGoToPage={goToPage}
                    />
                  )}
                </>
              )}
            </motion.div>
          </div>

          {/* Sidebar Column */}
          <div className="w-full lg:w-[350px] shrink-0 mt-8 lg:mt-0">
            <ProjectsListSidebar />
          </div>
        </div>
      </div>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
};

// Export version with mobile routing
const ProjectsPage = createMobilePage({
  DesktopComponent: ProjectsPageDesktop,
  MobileComponent: ProjectsPageMobile,
});

export default ProjectsPage;
