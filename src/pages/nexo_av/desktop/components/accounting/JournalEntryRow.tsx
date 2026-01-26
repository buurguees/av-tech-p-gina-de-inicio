import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, ExternalLink, CheckCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  entry_type: string;
  description: string;
  reference_id: string | null;
  reference_type: string | null;
  project_id: string | null;
  project_name: string | null;
  is_locked: boolean;
  created_by_name: string | null;
  created_at: string;
  total_debit: number;
  total_credit: number;
}

interface JournalEntryLine {
  id: string;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
  line_order: number;
  third_party_id: string | null;
  third_party_name: string | null;
  third_party_type: string | null;
}

interface JournalEntryRowProps {
  entry: JournalEntry;
  formatCurrency: (amount: number) => string;
  getEntryTypeLabel: (type: string) => string;
  onViewDocument: (referenceType: string | null, referenceId: string | null) => void;
}

const JournalEntryRow = ({
  entry,
  formatCurrency,
  getEntryTypeLabel,
  onViewDocument,
}: JournalEntryRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lines, setLines] = useState<JournalEntryLine[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);

  const fetchLines = async () => {
    if (lines.length > 0) return; // Already fetched
    
    setLoadingLines(true);
    try {
      const { data, error } = await supabase.rpc("get_journal_entry_lines", {
        p_entry_id: entry.id,
      });
      if (error) throw error;
      setLines(data || []);
    } catch (error) {
      console.error("Error fetching journal entry lines:", error);
    } finally {
      setLoadingLines(false);
    }
  };

  const handleToggle = () => {
    if (!isExpanded && lines.length === 0) {
      fetchLines();
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Main entry row */}
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={handleToggle}>
        <TableCell className="w-[30px]">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="text-sm">{format(new Date(entry.entry_date), "dd/MM/yyyy")}</TableCell>
        <TableCell className="font-mono text-sm">{entry.entry_number}</TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">{getEntryTypeLabel(entry.entry_type)}</Badge>
        </TableCell>
        <TableCell className="text-sm max-w-[300px] truncate">{entry.description}</TableCell>
        <TableCell className="text-right font-semibold text-green-600">{formatCurrency(entry.total_debit)}</TableCell>
        <TableCell className="text-right font-semibold text-red-600">{formatCurrency(entry.total_credit)}</TableCell>
        <TableCell>
          {entry.reference_type && entry.reference_id ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewDocument(entry.reference_type, entry.reference_id);
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver
            </Button>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </TableCell>
        <TableCell>
          {entry.is_locked ? (
            <Badge variant="secondary" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Bloqueado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">Abierto</Badge>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded lines */}
      {isExpanded && (
        <>
          {loadingLines ? (
            <TableRow className="bg-muted/20">
              <TableCell colSpan={9} className="py-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Cargando líneas...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            <>
              {/* Lines header */}
              <TableRow className="bg-muted/30 border-none">
                <TableCell></TableCell>
                <TableCell colSpan={2} className="text-xs font-semibold text-muted-foreground py-2">
                  CUENTA
                </TableCell>
                <TableCell className="text-xs font-semibold text-muted-foreground py-2">
                  NOMBRE
                </TableCell>
                <TableCell className="text-xs font-semibold text-muted-foreground py-2">
                  TERCERO / DESCRIPCIÓN
                </TableCell>
                <TableCell className="text-xs font-semibold text-muted-foreground py-2 text-right">
                  DEBE
                </TableCell>
                <TableCell className="text-xs font-semibold text-muted-foreground py-2 text-right">
                  HABER
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
              
              {/* Individual lines */}
              {lines.map((line) => (
                <TableRow key={line.id} className="bg-muted/10 border-none">
                  <TableCell></TableCell>
                  <TableCell colSpan={2} className="font-mono text-sm py-1.5">
                    {line.account_code}
                  </TableCell>
                  <TableCell className="text-sm py-1.5">
                    {line.account_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground py-1.5">
                    {line.third_party_name || line.description || "-"}
                  </TableCell>
                  <TableCell className="text-right py-1.5">
                    {line.debit_amount > 0 ? (
                      <span className="text-green-600 font-medium">{formatCurrency(line.debit_amount)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-1.5">
                    {line.credit_amount > 0 ? (
                      <span className="text-red-600 font-medium">{formatCurrency(line.credit_amount)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              ))}
              
              {lines.length === 0 && (
                <TableRow className="bg-muted/10 border-none">
                  <TableCell colSpan={9} className="text-center text-muted-foreground text-sm py-2">
                    No hay líneas registradas
                  </TableCell>
                </TableRow>
              )}
              
              {/* Separator row */}
              <TableRow className="border-b-2">
                <TableCell colSpan={9} className="h-2"></TableCell>
              </TableRow>
            </>
          )}
        </>
      )}
    </>
  );
};

export default JournalEntryRow;
