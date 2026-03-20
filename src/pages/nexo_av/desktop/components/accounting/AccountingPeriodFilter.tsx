import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AccountingPeriodFilterProps {
  filterType: "year" | "quarter" | "month";
  setFilterType: (v: "year" | "quarter" | "month") => void;
  selectedYear: number;
  setSelectedYear: (v: number) => void;
  selectedQuarter: number;
  setSelectedQuarter: (v: number) => void;
  selectedMonth: number;
  setSelectedMonth: (v: number) => void;
  balanceDate: string;
  setBalanceDate: (v: string) => void;
  loading: boolean;
  onRefresh: () => void;
}

const AccountingPeriodFilter = ({
  filterType, setFilterType,
  selectedYear, setSelectedYear,
  selectedQuarter, setSelectedQuarter,
  selectedMonth, setSelectedMonth,
  balanceDate, setBalanceDate,
  loading, onRefresh,
}: AccountingPeriodFilterProps) => (
  <div className="flex items-center gap-2">
    {/* Segmented control Año / Trimestre / Mes */}
    <div className="flex gap-1.5 bg-secondary/50 rounded-lg p-1 border border-border/50">
      {(["year", "quarter", "month"] as const).map((type) => (
        <button
          key={type}
          onClick={() => setFilterType(type)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
            filterType === type
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {type === "year" ? "Año" : type === "quarter" ? "Trimestre" : "Mes"}
        </button>
      ))}
    </div>

    {/* Año siempre visible */}
    <Input
      type="number"
      value={selectedYear}
      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
      className="w-20 h-8 text-xs"
      placeholder="Año"
    />

    {/* Trimestre */}
    {filterType === "quarter" && (
      <Select value={selectedQuarter.toString()} onValueChange={(v) => setSelectedQuarter(parseInt(v))}>
        <SelectTrigger className="w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Q1</SelectItem>
          <SelectItem value="2">Q2</SelectItem>
          <SelectItem value="3">Q3</SelectItem>
          <SelectItem value="4">Q4</SelectItem>
        </SelectContent>
      </Select>
    )}

    {/* Mes */}
    {filterType === "month" && (
      <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
            <SelectItem key={month} value={month.toString()}>
              {format(new Date(selectedYear, month - 1, 1), "MMMM", { locale: es })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}

    {/* Fecha de balance */}
    <Input
      type="date"
      value={balanceDate}
      onChange={(e) => setBalanceDate(e.target.value)}
      className="w-36 h-8 text-xs"
    />

    {/* Actualizar */}
    <Button onClick={onRefresh} disabled={loading} size="sm" variant="outline" className="h-8 text-xs">
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Filter className="h-3 w-3 mr-1" />}
      Actualizar
    </Button>
  </div>
);

export default AccountingPeriodFilter;
