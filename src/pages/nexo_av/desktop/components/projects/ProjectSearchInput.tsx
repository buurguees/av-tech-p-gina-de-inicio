import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderKanban, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name?: string;
}

interface ProjectSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectProject: (project: Project) => void;
  placeholder?: string;
  className?: string;
  clientId?: string; // Optional: filter by client
  showDropdown?: boolean; // Show dropdown with active projects
}

export default function ProjectSearchInput({
  value,
  onChange,
  onSelectProject,
  placeholder = "Buscar proyecto o @buscar",
  className,
  clientId,
  showDropdown = true,
}: ProjectSearchInputProps) {
  const [searchResults, setSearchResults] = useState<Project[]>([]);
  const [dropdownProjects, setDropdownProjects] = useState<Project[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDropdown, setLoadingDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  // Check if we're in search mode (starts with @)
  const searchMode = value.startsWith('@');
  const searchQuery = searchMode ? value.slice(1).trim() : '';

  const searchProjects = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    
    try {
      const { data: projectsData, error: projectsError } = await supabase.rpc('list_projects', {
        p_search: query,
      });

      if (projectsError) {
        console.error('Error searching projects:', projectsError);
        setSearchResults([]);
        return;
      }

      let projects: Project[] = (projectsData || []).map((p: any) => ({
        id: p.id,
        project_number: p.project_number,
        project_name: p.project_name,
        client_name: p.client_name,
      }));

      // Filter by client if provided
      if (clientId) {
        projects = projects.filter(p => p.id === clientId || true); // TODO: Add client_id filter when available in RPC
      }

      setSearchResults(projects);
    } catch (error) {
      console.error('Error searching projects:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Fetch dropdown projects (IN_PROGRESS and COMPLETED)
  const fetchDropdownProjects = useCallback(async () => {
    if (!showDropdown) return;
    
    setLoadingDropdown(true);
    try {
      const { data: projectsData, error: projectsError } = await supabase.rpc('list_projects', {
        p_search: null,
      });

      if (projectsError) {
        console.error('Error fetching dropdown projects:', projectsError);
        setDropdownProjects([]);
        return;
      }

      // Filter for IN_PROGRESS and COMPLETED projects
      const projects: Project[] = (projectsData || [])
        .filter((p: any) => p.status === 'IN_PROGRESS' || p.status === 'COMPLETED')
        .map((p: any) => ({
          id: p.id,
          project_number: p.project_number,
          project_name: p.project_name,
          client_name: p.client_name,
        }));

      setDropdownProjects(projects);
    } catch (error) {
      console.error('Error fetching dropdown projects:', error);
      setDropdownProjects([]);
    } finally {
      setLoadingDropdown(false);
    }
  }, [showDropdown]);

  // Load dropdown projects on mount
  useEffect(() => {
    if (showDropdown) {
      fetchDropdownProjects();
    }
  }, [showDropdown, fetchDropdownProjects]);

  // Search when in search mode
  useEffect(() => {
    if (searchMode && searchQuery) {
      const timeoutId = setTimeout(() => {
        searchProjects(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchMode, searchProjects]);

  // Update dropdown position on focus/resize
  useEffect(() => {
    if (isFocused) {
      updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isFocused, updateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    if (showResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showResults]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowResults(newValue.startsWith('@') && newValue.length > 1);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value.startsWith('@') && value.length > 1) {
      setShowResults(true);
      updateDropdownPosition();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding to allow click on results
    setTimeout(() => setShowResults(false), 200);
  };

  const handleSelect = (project: Project) => {
    onSelectProject(project);
    onChange(project.project_name);
    setShowResults(false);
  };

  const handleSelectFromDropdown = (project: Project) => {
    onSelectProject(project);
    onChange(project.project_name);
  };

  return (
    <>
      <div ref={containerRef} className={cn("relative flex gap-2", className)}>
        {showDropdown && (
          <Select
            value=""
            onValueChange={(projectId) => {
              const project = dropdownProjects.find(p => p.id === projectId);
              if (project) {
                handleSelectFromDropdown(project);
              }
            }}
          >
            <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Proyectos activos" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900/95 backdrop-blur-xl border-white/20">
              {loadingDropdown ? (
                <div className="p-4 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                </div>
              ) : dropdownProjects.length === 0 ? (
                <div className="p-4 text-center text-white/40 text-sm">
                  No hay proyectos activos
                </div>
              ) : (
                dropdownProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id} className="text-white hover:bg-white/10">
                    <div className="flex flex-col">
                      <span className="font-medium">{project.project_name}</span>
                      {project.client_name && (
                        <span className="text-xs text-white/60">{project.client_name}</span>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={cn(
              "w-full",
              searchMode && "border-orange-500/50"
            )}
          />
        </div>
      </div>

      {showResults && dropdownPosition && createPortal(
        <div
          ref={resultsRef}
          className="fixed z-50 bg-zinc-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl max-h-[300px] overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {loading ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-white/40" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center text-white/40 text-sm">
              {searchQuery.length < 2 ? 'Escribe al menos 2 caracteres' : 'No se encontraron resultados'}
            </div>
          ) : (
            <div className="py-1">
              {searchResults.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleSelect(project)}
                  className="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-3"
                >
                  <FolderKanban className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{project.project_name}</div>
                    <div className="text-white/40 text-xs truncate">
                      {project.project_number}
                      {project.client_name && ` • ${project.client_name}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
