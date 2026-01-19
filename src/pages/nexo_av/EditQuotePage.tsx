// EditQuotePage - Quote editing with tax selector
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, Save, Loader2, FileText, ChevronUp, ChevronDown, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import ProductSearchInput from "./components/ProductSearchInput";
import { QUOTE_STATUSES, getStatusInfo } from "@/constants/quoteStatuses";
import { useNexoAvTheme } from "./hooks/useNexoAvTheme";
interface Client {
  id: string;
  company_name: string;
}

interface Project {
  id: string;
  project_number: string;
  project_name: string;
}

interface QuoteLine {
  id?: string;
  tempId?: string;
  concept: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  line_order?: number;
  group_name?: string;
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}

interface TaxOption {
  value: number;
  label: string;
}

interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  client_name: string;
  project_id: string | null;
  project_name: string | null;
  status: string;
  valid_until: string | null;
  created_at: string;
}

const EditQuotePage = () => {
  const navigate = useNavigate();
  const { userId, quoteId } = useParams<{ userId: string; quoteId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState<string>("DRAFT");
  const [validUntil, setValidUntil] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);
  const [expandedDescriptionIndex, setExpandedDescriptionIndex] = useState<number | null>(null);
  const [numericInputValues, setNumericInputValues] = useState<Record<string, string>>({});
  const [dirtyLines, setDirtyLines] = useState<Set<number>>(new Set());
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  useEffect(() => {
    if (quoteId) {
      fetchQuoteData();
      fetchClients();
      fetchSaleTaxes();
    }
  }, [quoteId]);

  // Fetch projects when client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchClientProjects(selectedClientId);
    } else {
      setProjects([]);
    }
  }, [selectedClientId]);

  // Set project after projects are loaded and quote has project_id
  useEffect(() => {
    if (projects.length > 0 && quote?.project_id && !selectedProjectId) {
      // Only set if project exists in the loaded projects
      const projectExists = projects.some(p => p.id === quote.project_id);
      if (projectExists) {
        setSelectedProjectId(quote.project_id);
      }
    }
  }, [projects, quote?.project_id, selectedProjectId]);

  // Update valid_until when status changes to DRAFT
  // This ensures that whenever we're in DRAFT status, the date is recalculated
  useEffect(() => {
    if (currentStatus === "DRAFT") {
      const today = new Date();
      const validUntilDate = new Date(today);
      validUntilDate.setDate(validUntilDate.getDate() + 30);
      const newValidUntil = validUntilDate.toISOString().split("T")[0];
      // Only update if different to avoid unnecessary re-renders
      if (validUntil !== newValidUntil) {
        setValidUntil(newValidUntil);
      }
    }
    // When status changes from DRAFT to another status, keep the current validUntil
    // (it will be saved as-is in handleSave)
  }, [currentStatus]);

  const fetchQuoteData = async () => {
    try {
      setLoading(true);

      // Fetch quote - get_quote ahora devuelve project_id directamente
      const { data: quoteData, error: quoteError } = await supabase.rpc("get_quote", {
        p_quote_id: quoteId,
      });
      if (quoteError) throw quoteError;
      if (!quoteData || quoteData.length === 0) throw new Error("Presupuesto no encontrado");

      const quoteInfo = quoteData[0];

      // Set quote con todos los datos incluyendo project_id
      setQuote(quoteInfo);
      setSelectedClientId(quoteInfo.client_id);
      setCurrentStatus(quoteInfo.status);

      // If status is DRAFT, calculate valid_until as today + 30 days
      // Otherwise, use the stored valid_until date
      if (quoteInfo.status === "DRAFT") {
        const today = new Date();
        const validUntilDate = new Date(today);
        validUntilDate.setDate(validUntilDate.getDate() + 30);
        setValidUntil(validUntilDate.toISOString().split("T")[0]);
      } else {
        setValidUntil(quoteInfo.valid_until ? quoteInfo.valid_until.split('T')[0] : '');
      }

      // Fetch quote lines (already ordered by line_order from DB)
      const { data: linesData, error: linesError } = await supabase.rpc("get_quote_lines", {
        p_quote_id: quoteId,
      });
      if (linesError) throw linesError;

      setLines((linesData || []).map((line: any) => ({
        ...line,
        description: line.description || "",
      })));

    } catch (error: any) {
      console.error("Error fetching quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el presupuesto",
        variant: "destructive",
      });
      navigate(`/nexo-av/${userId}/quotes`);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.rpc("list_clients", {});
      if (error) throw error;
      setClients(data?.map((c: any) => ({ id: c.id, company_name: c.company_name })) || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchClientProjects = async (clientId: string) => {
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase.rpc("list_projects", { p_search: null });
      if (error) throw error;
      const clientProjects = (data || []).filter((p: any) => p.client_id === clientId);
      setProjects(clientProjects.map((p: any) => ({
        id: p.id,
        project_number: p.project_number,
        project_name: p.project_name,
      })));
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchSaleTaxes = async () => {
    try {
      const { data, error } = await supabase.rpc("list_taxes", { p_tax_type: "sales" });
      if (error) throw error;

      const options: TaxOption[] = (data || [])
        .filter((t: any) => t.is_active)
        .map((t: any) => ({
          value: t.rate,
          label: t.name,
        }));

      setTaxOptions(options);

      const defaultTax = (data || []).find((t: any) => t.is_default && t.is_active);
      if (defaultTax) {
        setDefaultTaxRate(defaultTax.rate);
      } else if (options.length > 0) {
        setDefaultTaxRate(options[0].value);
      }
    } catch (error) {
      console.error("Error fetching taxes:", error);
      setTaxOptions([{ value: 21, label: "IVA 21%" }]);
    }
  };

  const calculateLineValues = (line: Partial<QuoteLine>): QuoteLine => {
    const quantity = line.quantity || 0;
    const unitPrice = line.unit_price || 0;
    const discountPercent = line.discount_percent || 0;
    const taxRate = line.tax_rate || 21;

    const subtotal = quantity * unitPrice * (1 - discountPercent / 100);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    return {
      ...line,
      concept: line.concept || "",
      description: line.description || "",
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      discount_percent: discountPercent,
      subtotal,
      tax_amount: taxAmount,
      total,
    } as QuoteLine;
  };

  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({});

  const autoSaveLine = async (line: QuoteLine) => {
    // Only save if concept is present or it's an existing line being cleared (which might be valid? no, usually require concept)
    if (!line.concept && !line.id) return;

    // Use tempId or id as key
    const uniqueKey = line.id || line.tempId || "unknown";

    try {
      // @ts-ignore
      const { data: rpcData, error } = await supabase.rpc("auto_save_quote_line", {
        p_line_id: line.id || null, // null for new
        p_quote_id: quoteId,
        p_concept: line.concept,
        p_description: line.description || null,
        p_quantity: line.quantity,
        p_unit_price: line.unit_price,
        p_tax_rate: line.tax_rate,
        p_discount_percent: line.discount_percent,
        p_group_name: line.group_name || null,
        p_line_order: line.line_order // We will handle order separately usually, but can pass it if known
      });

      if (error) throw error;

      // Update state if new line got an ID
      const data = rpcData as any;
      if (!line.id && data?.line_id) {
        setLines(prev => prev.map(l => {
          if (l.tempId === line.tempId) {
            return { ...l, id: data.line_id, isNew: false, isModified: false };
          }
          return l;
        }));
      } else {
        // Just clear isModified
        setLines(prev => prev.map(l => {
          if (l.id === line.id) {
            return { ...l, isModified: false };
          }
          return l;
        }));
      }
      setLastSavedTime(new Date());
    } catch (err) {
      console.error("Auto-save failed", err);
    }
  };


  const addLine = () => {
    const newLine = calculateLineValues({
      tempId: crypto.randomUUID(),
      concept: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: defaultTaxRate,
      discount_percent: 0,
      isNew: true,
    });
    setLines([...lines, newLine]);
  };

  const updateLine = (index: number, field: keyof QuoteLine, value: any) => {
    const updatedLines = [...lines];
    const updatedLine = calculateLineValues({
      ...updatedLines[index],
      [field]: value,
      isModified: !updatedLines[index].isNew,
    });
    updatedLines[index] = updatedLine;
    setLines(updatedLines);

    // Debounced Auto-Save
    const uniqueKey = updatedLine.id || updatedLine.tempId;
    if (uniqueKey) {
      if (debounceRef.current[uniqueKey]) clearTimeout(debounceRef.current[uniqueKey]);
      debounceRef.current[uniqueKey] = setTimeout(() => {
        autoSaveLine(updatedLine);
      }, 1000);
    }
  };

  const handleProductSelect = (index: number, item: { id: string; type: string; name: string; code: string; price: number; tax_rate: number; description?: string }) => {
    console.log('=== HANDLE PRODUCT SELECT (EditQuotePage) ===');
    console.log('Index:', index);
    console.log('Item received:', item);
    console.log('Item price:', item.price, typeof item.price);
    console.log('Item tax_rate:', item.tax_rate, typeof item.tax_rate);
    console.log('Item description:', item.description);

    const updatedLines = [...lines];
    const currentQuantity = updatedLines[index].quantity;

    const lineData = {
      ...updatedLines[index],
      concept: item.name,
      description: item.description || "",
      unit_price: item.price,
      tax_rate: item.tax_rate || defaultTaxRate,
      quantity: currentQuantity,
      isModified: !updatedLines[index].isNew,
    };

    console.log('Line data before calculate:', lineData);

    updatedLines[index] = calculateLineValues(lineData);

    console.log('Line after calculate:', updatedLines[index]);

    setLines(updatedLines);
  };

  const removeLine = (index: number) => {
    const line = lines[index];
    if (line.id) {
      // Mark existing line for deletion
      const updatedLines = [...lines];
      updatedLines[index] = { ...line, isDeleted: true };
      setLines(updatedLines);
    } else {
      // Remove new line completely
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const moveLine = async (index: number, direction: 'up' | 'down') => {
    const line = lines[index];
    if (!line.id) {
      // For new lines, just reorder in memory
      const newLines = [...lines];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newLines.length) return;

      [newLines[index], newLines[targetIndex]] = [newLines[targetIndex], newLines[index]];
      setLines(newLines);
      return;
    }

    // For existing lines, call the RPC function
    try {
      const { error } = await supabase.rpc('reorder_quote_line', {
        p_line_id: line.id,
        p_direction: direction,
      });

      if (error) throw error;

      // Reload lines to get updated order
      const { data: linesData, error: linesError } = await supabase.rpc("get_quote_lines", {
        p_quote_id: quoteId!,
      });
      if (linesError) throw linesError;

      setLines((linesData || []).map((l: any) => ({
        ...l,
        description: l.description || "",
      })));
    } catch (error: any) {
      console.error("Error reordering line:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo reordenar la línea",
        variant: "destructive",
      });
    }
  };

  const getTotals = () => {
    const activeLines = lines.filter(l => !l.isDeleted);
    const subtotal = activeLines.reduce((acc, line) => acc + line.subtotal, 0);
    const total = activeLines.reduce((acc, line) => acc + line.total, 0);

    // Group taxes by rate - this ensures each tax rate is shown separately
    const taxesByRate: Record<number, { rate: number; amount: number; label: string }> = {};
    activeLines.forEach((line) => {
      // Only include taxes with non-zero amounts
      if (line.tax_amount !== 0) {
        if (!taxesByRate[line.tax_rate]) {
          // Find the label from taxOptions, or use rate percentage as fallback
          const taxOption = taxOptions.find(t => t.value === line.tax_rate);
          taxesByRate[line.tax_rate] = {
            rate: line.tax_rate,
            amount: 0,
            label: taxOption?.label || `IVA ${line.tax_rate}%`,
          };
        }
        taxesByRate[line.tax_rate].amount += line.tax_amount;
      }
    });

    return {
      subtotal,
      taxes: Object.values(taxesByRate).sort((a, b) => b.rate - a.rate), // Sort by rate descending
      total,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Helper: Parse input value (handles both . and , as decimal separator)
  const parseNumericInput = (value: string): number => {
    if (!value || value === '') return 0;

    let cleaned = value.trim();

    // Count dots and commas
    const dotCount = (cleaned.match(/\./g) || []).length;
    const commaCount = (cleaned.match(/,/g) || []).length;

    // If there's a comma, it's definitely the decimal separator (European format)
    if (commaCount > 0) {
      // Remove all dots (thousand separators) and replace comma with dot for parsing
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    } else if (dotCount === 1) {
      // Single dot: check if it's likely a decimal (has digits after) or thousand separator
      const dotIndex = cleaned.indexOf('.');
      const afterDot = cleaned.substring(dotIndex + 1);

      // If there are 1-2 digits after the dot, treat it as decimal separator
      // Otherwise, treat it as thousand separator
      if (afterDot.length <= 2 && /^\d+$/.test(afterDot)) {
        // Decimal separator - keep as is for parsing
        cleaned = cleaned;
      } else {
        // Thousand separator - remove it
        cleaned = cleaned.replace(/\./g, '');
      }
    } else if (dotCount > 1) {
      // Multiple dots: all are thousand separators, remove them
      cleaned = cleaned.replace(/\./g, '');
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Helper: Format number for display (with thousand separators and comma decimal)
  const formatNumericDisplay = (value: number | string): string => {
    if (value === '' || value === null || value === undefined) return '';
    const num = typeof value === 'string' ? parseNumericInput(value) : value;
    if (isNaN(num) || num === 0) return '';

    // Format with thousand separators and comma decimal
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Helper: Handle numeric input change
  const handleNumericInputChange = (value: string, field: 'quantity' | 'unit_price' | 'discount_percent', actualIndex: number) => {
    const inputKey = `${actualIndex}-${field}`;

    // Store the raw input value for display
    setNumericInputValues(prev => ({ ...prev, [inputKey]: value }));

    // Allow empty string for clearing
    if (value === '' || value === null || value === undefined) {
      updateLine(actualIndex, field, 0);
      return;
    }

    // Parse the value (handles both . and , as decimal separator)
    const numericValue = parseNumericInput(value);
    updateLine(actualIndex, field, numericValue);
  };

  // Get display value for numeric input
  const getNumericDisplayValue = (value: number, field: 'quantity' | 'unit_price' | 'discount_percent', actualIndex: number): string => {
    const inputKey = `${actualIndex}-${field}`;
    const storedValue = numericInputValues[inputKey];

    // If user is typing, show what they're typing
    if (storedValue !== undefined) {
      return storedValue;
    }

    // Otherwise format the numeric value
    if (value === 0) return '';
    return formatNumericDisplay(value);
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      toast({
        title: "Error",
        description: "Selecciona un cliente",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const wasProvisional = quote?.quote_number.startsWith("BORR-");
    const isApproving = currentStatus === "APPROVED" && quote?.status !== "APPROVED";

    try {
      // Update quote
      const selectedProject = projects.find(p => p.id === selectedProjectId);

      // Calculate valid_until based on status
      let calculatedValidUntil: string | null = null;

      if (currentStatus === "DRAFT") {
        // If in DRAFT status, always recalculate valid_until as today + 30 days
        const today = new Date();
        const validUntilDate = new Date(today);
        validUntilDate.setDate(validUntilDate.getDate() + 30);
        calculatedValidUntil = validUntilDate.toISOString().split("T")[0];
        // Update local state to reflect the new date
        setValidUntil(calculatedValidUntil);
      } else {
        // If not in DRAFT, use the date set by user (or existing date)
        calculatedValidUntil = validUntil || null;
      }

      const { error: quoteError } = await supabase.rpc("update_quote", {
        p_quote_id: quoteId!,
        p_client_id: selectedClientId,
        p_project_name: selectedProject?.project_name || null,
        p_valid_until: calculatedValidUntil,
        p_status: currentStatus,
        p_project_id: selectedProjectId || null,
      });
      if (quoteError) throw quoteError;

      // Process lines (in order: delete, add, update)
      const lineIdsToOrder: string[] = [];

      // Sort lines by group before saving to ensure line_order matches group structure
      // Non-deleted lines only for determining order
      const linesToSort = [...lines].filter(l => !l.isDeleted);
      linesToSort.sort((a, b) => {
        const groupA = a.group_name || '';
        const groupB = b.group_name || '';
        if (groupA && !groupB) return -1; // Groups first
        if (!groupA && groupB) return 1;
        if (groupA === groupB) return (a.line_order || 0) - (b.line_order || 0); // Keep relative order
        return groupA.localeCompare(groupB, undefined, { numeric: true }); // Alphanumeric sort (Group 1 < Group 2)
      });

      // We need to map the sorted order back to the original array processing or just re-process
      // Actually, we just need the IDs in the correct order for `update_quote_lines_order`
      // But we also need to SAVE them.
      // The saving part (add/update) doesn't care about order usually, but `add_quote_line` does insert with a new order.
      // However, `update_quote_lines_order` at the end FIXES the order.
      // So we can process `lines` as is for saving, but construct `lineIdsToOrder` from the SORTED list.

      // Map of tempId/id to resolved ID
      const idMap = new Map<string, string>();

      // First pass: Save all lines (add/update)
      for (const line of lines) {
        if (line.isDeleted && line.id) {
          // Delete line
          const { error } = await supabase.rpc("delete_quote_line", { p_line_id: line.id });
          if (error) throw error;
        } else if (line.isNew && line.concept.trim()) {
          // Add new line
          const { data: newLineId, error } = await supabase.rpc("add_quote_line", {
            p_quote_id: quoteId!,
            p_concept: line.concept,
            p_description: line.description || null,
            p_quantity: line.quantity,
            p_unit_price: line.unit_price,
            p_tax_rate: line.tax_rate,
            p_discount_percent: line.discount_percent,
            p_group_name: line.group_name || null
          });
          if (error) throw error;

          const lineId = typeof newLineId === 'string' ? newLineId : newLineId?.[0] || newLineId;
          // Store mapping for sorting later
          if (lineId) {
            const key = line.id || line.tempId || ''; // Should be tempId for new lines
            if (key) idMap.set(key, lineId);
          }
        } else if (line.id) {
          // Update existing line
          if (line.isModified) {
            const { error } = await supabase.rpc("update_quote_line", {
              p_line_id: line.id,
              p_concept: line.concept,
              p_description: line.description || null,
              p_quantity: line.quantity,
              p_unit_price: line.unit_price,
              p_tax_rate: line.tax_rate,
              p_discount_percent: line.discount_percent,
            });
            if (error) throw error;
          }
          idMap.set(line.id, line.id);
        }
      }

      // Second pass: Construct ordered ID list based on GROUPS
      // We use the same sorting logic on the lines we have in memory (ignoring deleted)
      const activeLines = lines.filter(l => !l.isDeleted && (l.id || l.isNew));

      activeLines.sort((a, b) => {
        const groupA = a.group_name || '';
        const groupB = b.group_name || '';

        // Logic: Groups first, then empty groups
        if (groupA && !groupB) return -1;
        if (!groupA && groupB) return 1;

        if (groupA === groupB) {
          // Stable sort for same group
          return lines.indexOf(a) - lines.indexOf(b);
        }

        return groupA.localeCompare(groupB, undefined, { numeric: true });
      });

      // Now build the ID list from the sorted active lines, using the idMap to get real IDs for new lines
      for (const line of activeLines) {
        const key = line.id || line.tempId;
        if (key && idMap.has(key)) {
          lineIdsToOrder.push(idMap.get(key)!);
        }
      }

      // Update line_order to match the current order in the UI
      if (lineIdsToOrder.length > 0) {
        const { error: orderError } = await supabase.rpc("update_quote_lines_order", {
          p_quote_id: quoteId!,
          p_line_ids: lineIdsToOrder,
        });
        if (orderError) throw orderError;
      }

      // Show appropriate message based on what happened
      if (isApproving && wasProvisional) {
        // Fetch the updated quote to get the new number
        const { data: updatedQuote } = await supabase.rpc("get_quote", { p_quote_id: quoteId });
        const newNumber = updatedQuote?.[0]?.quote_number || "asignado";

        toast({
          title: "¡Presupuesto aprobado!",
          description: `Se ha asignado el número definitivo: ${newNumber}`,
        });
      } else {
        toast({
          title: "Cambios guardados",
          description: "El presupuesto se ha actualizado correctamente",
        });
      }

      navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
    } catch (error: any) {
      console.error("Error saving quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el presupuesto",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totals = getTotals();
  const statusInfo = getStatusInfo(currentStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-32">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center pt-32">
        <FileText className="h-16 w-16 text-white/20 mb-4" />
        <p className="text-white/60">Presupuesto no encontrado</p>
        <Button
          variant="link"
          onClick={() => navigate(`/nexo-av/${userId}/quotes`)}
          className="text-orange-500 mt-2"
        >
          Volver a presupuestos
        </Button>
      </div>
    );
  }

  const isProvisionalNumber = quote.quote_number.startsWith("BORR-");
  const hasFinalNumber = !isProvisionalNumber && quote.quote_number.startsWith("P-");
  const displayNumber = hasFinalNumber ? quote.quote_number : `(${quote.quote_number})`;

  return (
    <div className="w-full">
      <div className="w-[90%] max-w-[1800px] mx-auto px-3 md:px-4 pb-4 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 mb-4 md:mb-8">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-2xl font-bold text-foreground font-mono">{displayNumber}</h1>
                <Badge className={`${statusInfo.className} text-[10px] md:text-xs`}>
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-muted-foreground text-[10px] md:text-sm hidden md:block">Editando presupuesto</p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-8 md:h-10 px-4"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden md:inline ml-2">Guardar</span>
            </Button>
          </div>

          {/* Quote header info - Client Data */}
          <div className="bg-card rounded-lg border border-border p-3 md:p-6 mb-3 md:mb-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
              <div className="p-1.5 rounded-lg bg-secondary">
                <FileText className="h-3 w-3 md:h-4 md:w-4 text-primary" />
              </div>
              <span className="text-muted-foreground text-[10px] md:text-xs font-medium uppercase tracking-wide">Datos del documento</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <div className="space-y-1 md:space-y-2 col-span-2 md:col-span-1">
                <Label className="text-muted-foreground text-[10px] md:text-sm">Contacto</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id} className="text-xs md:text-sm">
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:space-y-2 col-span-2 md:col-span-1">
                <Label className="text-white/70 text-[10px] md:text-sm">Proyecto</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                  disabled={!selectedClientId || loadingProjects}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder={
                      !selectedClientId
                        ? "Cliente primero"
                        : loadingProjects
                          ? "Cargando..."
                          : projects.length === 0
                            ? "Sin proyectos"
                            : "Seleccionar"
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="text-white text-xs md:text-sm">
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-white/70 text-[10px] md:text-sm">Fecha</Label>
                <Input
                  type="date"
                  value={quote.created_at.split('T')[0]}
                  disabled
                  className="bg-white/5 border-white/10 text-white/50 h-8 md:h-10 text-xs md:text-sm"
                />
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-white/70 text-[10px] md:text-sm">
                  Vence
                  {currentStatus === "DRAFT" && (
                    <span className="text-orange-400/70 text-[9px] ml-1">(auto: +30 días)</span>
                  )}
                </Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  disabled={currentStatus === "DRAFT"}
                  className="bg-white/5 border-white/10 text-white h-8 md:h-10 text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title={currentStatus === "DRAFT" ? "En borrador, la fecha se calcula automáticamente como hoy + 30 días" : "Fecha de validez del presupuesto"}
                />
              </div>
            </div>
          </div>

          {/* Mobile Lines - Vertical Cards (same as NewQuotePage) */}
          <div className="md:hidden space-y-2 mb-3">
            {/* Lines Header */}
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-[10px] font-medium uppercase tracking-wide">Líneas del presupuesto</span>
              <span className="text-white/40 text-[9px]">Usa @nombre para buscar</span>
            </div>

            {lines.filter(l => !l.isDeleted).map((line, displayIndex) => {
              const actualIndex = lines.findIndex(l => (l.id || l.tempId) === (line.id || line.tempId));
              const activeLines = lines.filter(l => !l.isDeleted);
              const isFirst = displayIndex === 0;
              const isLast = displayIndex === activeLines.length - 1;
              return (
                <div key={line.tempId || line.id} className="bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 p-3 space-y-2 shadow-xl shadow-black/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveLine(actualIndex, 'up')}
                          disabled={isFirst}
                          className="h-5 w-5 text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed p-0"
                          title="Mover arriba"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveLine(actualIndex, 'down')}
                          disabled={isLast}
                          className="h-5 w-5 text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed p-0"
                          title="Mover abajo"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-orange-500/70 text-[10px] font-mono">Línea {displayIndex + 1}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(actualIndex)}
                      className="text-white/40 hover:text-red-400 hover:bg-red-500/10 h-6 w-6"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <Input
                    value={line.group_name || ''}
                    onChange={(e) => updateLine(actualIndex, "group_name", e.target.value)}
                    placeholder="Grupo (opcional)"
                    className="bg-white/5 border-white/10 text-white/60 h-7 text-[10px] mb-2"
                  />

                  <ProductSearchInput
                    value={line.concept}
                    onChange={(value) => updateLine(actualIndex, "concept", value)}
                    onSelectItem={(item) => handleProductSelect(actualIndex, item)}
                    placeholder="Concepto o @buscar"
                  />

                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(actualIndex, "description", e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="bg-white/5 border-white/10 text-white/80 h-8 text-xs"
                  />

                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-white/50 text-[9px]">Cant.</Label>
                      <Input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(actualIndex, "quantity", parseFloat(e.target.value) || 0)}
                        className="bg-white/5 border-white/10 text-white h-8 text-xs text-center"
                        min="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/50 text-[9px]">Precio</Label>
                      <Input
                        type="number"
                        value={line.unit_price}
                        onChange={(e) => updateLine(actualIndex, "unit_price", parseFloat(e.target.value) || 0)}
                        className="bg-white/5 border-white/10 text-white h-8 text-xs"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/50 text-[9px]">Dto %</Label>
                      <Input
                        type="number"
                        value={line.discount_percent}
                        onChange={(e) => updateLine(actualIndex, "discount_percent", parseFloat(e.target.value) || 0)}
                        className="bg-white/5 border-white/10 text-white h-8 text-xs text-center"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/50 text-[9px]">IVA</Label>
                      <Select
                        value={line.tax_rate.toString()}
                        onValueChange={(v) => updateLine(actualIndex, "tax_rate", parseFloat(v))}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 z-50">
                          {taxOptions.map((tax) => (
                            <SelectItem key={tax.value} value={tax.value.toString()} className="text-white text-xs">
                              {tax.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-white/50 text-[9px]">Subtotal</span>
                    <span className="text-white font-medium text-sm">{formatCurrency(line.subtotal)}</span>
                  </div>
                </div>
              );
            })}

          </div>

          {/* Desktop Lines Table (same structure as NewQuotePage) */}
          <div className="hidden md:block bg-gradient-to-br from-white/[0.08] to-white/[0.03] backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden mb-6 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
              <span className="text-white text-sm font-semibold uppercase tracking-wider">Líneas del presupuesto</span>
              <span className="text-white/50 text-xs font-medium">Escribe @nombre para buscar en el catálogo</span>
            </div>
            <div className="overflow-x-auto bg-white/[0.02]">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent bg-white/[0.03]">
                    <TableHead className="text-white/60 w-16 px-5 py-3 text-xs font-semibold uppercase tracking-wider"></TableHead>
                    <TableHead className="text-white/80 w-32 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Grupo</TableHead>
                    <TableHead className="text-white/80 min-w-[300px] px-5 py-3 text-xs font-semibold uppercase tracking-wider">Concepto</TableHead>
                    <TableHead className="text-white/80 min-w-[250px] px-5 py-3 text-xs font-semibold uppercase tracking-wider">Descripción</TableHead>
                    <TableHead className="text-white/80 text-center w-28 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Cant.</TableHead>
                    <TableHead className="text-white/80 text-right w-32 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Precio</TableHead>
                    <TableHead className="text-white/80 text-center w-20 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Dto %</TableHead>
                    <TableHead className="text-white/80 w-36 px-5 py-3 text-xs font-semibold uppercase tracking-wider">IVA</TableHead>
                    <TableHead className="text-white/80 text-right w-32 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Subtotal</TableHead>
                    <TableHead className="text-white/60 w-14 px-5 py-3"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.filter(l => !l.isDeleted).map((line, displayIndex) => {
                    const actualIndex = lines.findIndex(l => (l.id || l.tempId) === (line.id || line.tempId));
                    const activeLines = lines.filter(l => !l.isDeleted);
                    const isFirst = displayIndex === 0;
                    const isLast = displayIndex === activeLines.length - 1;
                    return (
                      <TableRow
                        key={line.id || line.tempId}
                        className="border-white/5 hover:bg-white/[0.04] transition-colors duration-150 group"
                      >
                        <TableCell className="px-5 py-3.5">
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveLine(actualIndex, 'up')}
                              disabled={isFirst}
                              className="h-6 w-6 text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed"
                              title="Mover arriba"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveLine(actualIndex, 'down')}
                              disabled={isLast}
                              className="h-6 w-6 text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed"
                              title="Mover abajo"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <Input
                            value={line.group_name || ''}
                            onChange={(e) => updateLine(actualIndex, "group_name", e.target.value)}
                            placeholder="Grupo"
                            className="bg-transparent border-0 border-b border-white/10 text-white/70 h-auto text-sm pl-2 pr-0 py-2 hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                          />
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <ProductSearchInput
                            value={line.concept}
                            onChange={(value) => updateLine(actualIndex, "concept", value)}
                            onSelectItem={(item) => handleProductSelect(actualIndex, item)}
                            placeholder="@buscar producto"
                            className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm font-medium pl-2 pr-0 py-2 hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                          />
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          {expandedDescriptionIndex === actualIndex ? (
                            <div className="space-y-2">
                              <Textarea
                                value={line.description}
                                onChange={(e) => updateLine(actualIndex, "description", e.target.value)}
                                placeholder="Descripción opcional"
                                className="bg-white/5 border border-white/20 text-white/90 placeholder:text-white/25 text-sm px-3 py-2 min-h-[80px] resize-y focus:border-orange-500/60 focus-visible:ring-2 focus-visible:ring-orange-500/30 rounded-lg"
                                onBlur={() => setExpandedDescriptionIndex(null)}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(actualIndex, "description", e.target.value)}
                              onClick={() => setExpandedDescriptionIndex(actualIndex)}
                              className="bg-transparent border-0 border-b border-white/10 text-white/85 placeholder:text-white/25 h-auto text-sm pl-2 pr-0 py-2 hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors cursor-text"
                              placeholder="Descripción opcional"
                              readOnly
                            />
                          )}
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <div className="flex justify-center">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={getNumericDisplayValue(line.quantity, 'quantity', actualIndex)}
                              onChange={(e) => handleNumericInputChange(e.target.value, 'quantity', actualIndex)}
                              onBlur={() => {
                                const inputKey = `${actualIndex}-quantity`;
                                setNumericInputValues(prev => {
                                  const newValues = { ...prev };
                                  delete newValues[inputKey];
                                  return newValues;
                                });
                              }}
                              className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm text-center font-medium px-0 py-2 w-20 hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                              placeholder="0"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={getNumericDisplayValue(line.unit_price, 'unit_price', actualIndex)}
                            onChange={(e) => handleNumericInputChange(e.target.value, 'unit_price', actualIndex)}
                            onBlur={() => {
                              const inputKey = `${actualIndex}-unit_price`;
                              setNumericInputValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[inputKey];
                                return newValues;
                              });
                            }}
                            className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm text-right font-medium px-0 py-2 hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                            placeholder="0,00"
                          />
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={getNumericDisplayValue(line.discount_percent || 0, 'discount_percent' as any, actualIndex)}
                            onChange={(e) => handleNumericInputChange(e.target.value, 'discount_percent' as any, actualIndex)}
                            onBlur={() => {
                              const inputKey = `${actualIndex}-discount_percent`;
                              setNumericInputValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[inputKey];
                                return newValues;
                              });
                            }}
                            className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm text-center font-medium px-0 py-2 w-12 mx-auto hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <div className="flex justify-center">
                            <Select
                              value={String(line.tax_rate)}
                              onValueChange={(v) => updateLine(actualIndex, "tax_rate", parseFloat(v))}
                            >
                              <SelectTrigger className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm font-medium px-0 py-2 w-full hover:border-white/30 focus:border-orange-500/60 rounded-none shadow-none transition-colors">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900/95 backdrop-blur-xl border-white/20 shadow-2xl">
                                {taxOptions.map((tax) => (
                                  <SelectItem key={tax.value} value={String(tax.value)} className="text-white hover:bg-white/10">
                                    {tax.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-semibold text-right text-sm px-5 py-3.5">
                          {formatCurrency(line.subtotal)}
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(actualIndex)}
                            className="text-white/30 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {lines.filter(l => !l.isDeleted).length === 0 && (
                    <TableRow className="border-white/10">
                      <TableCell colSpan={8} className="text-center py-12">
                        <p className="text-white/40 text-sm mb-2">No hay líneas en este presupuesto</p>
                        <Button
                          variant="link"
                          onClick={addLine}
                          className="text-orange-500 text-sm"
                        >
                          Añadir primera línea
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-5 border-t border-white/10 bg-gradient-to-r from-white/5 to-transparent">
              <Button
                variant="outline"
                onClick={addLine}
                className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 backdrop-blur-sm rounded-lg transition-all duration-200 h-10 px-4 gap-2 font-medium"
              >
                <Plus className="h-4 w-4" />
                Añadir línea
              </Button>
            </div>
          </div>


          {/* Mobile: Add line button at the end */}
          <div className="md:hidden mb-3">
            <Button
              variant="outline"
              onClick={addLine}
              className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 backdrop-blur-sm rounded-2xl h-10 text-xs transition-all duration-200"
            >
              <Plus className="h-3 w-3 mr-1.5" />
              Añadir línea
            </Button>
          </div>

          {/* Totals */}
          <div className="bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-2xl rounded-2xl md:rounded-3xl border border-white/15 p-5 md:p-6 shadow-2xl shadow-black/40">
            <div className="max-w-sm ml-auto space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-white/70 font-medium">Base imponible</span>
                <span className="text-white font-semibold">{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.taxes.map((tax) => (
                <div key={tax.rate} className="flex justify-between text-sm">
                  <span className="text-white/70 font-medium">{tax.label}</span>
                  <span className="text-white font-semibold">{formatCurrency(tax.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-4 border-t border-white/20">
                <span className="text-white font-semibold text-lg">Total</span>
                <span className="text-orange-400 text-xl font-bold">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Export with mobile version
import { lazy } from 'react';
import { createMobilePage } from './MobilePageWrapper';

const EditQuotePageMobile = lazy(() => import('./mobile/EditQuotePageMobile'));

export default createMobilePage({
  DesktopComponent: EditQuotePage,
  MobileComponent: EditQuotePageMobile,
});
