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
import { Plus, Receipt, Loader2 } from "lucide-react";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  status: string;
}

interface ProjectExpensesTabProps {
  projectId: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'MATERIAL', label: 'Material', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'LABOR', label: 'Mano de obra', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'TRANSPORT', label: 'Transporte', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'OTHER', label: 'Otros', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const getCategoryInfo = (category: string) => {
  return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[3];
};

const ProjectExpensesTab = ({ projectId }: ProjectExpensesTabProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch expenses from database when table is created
    setLoading(false);
    setExpenses([]);
  }, [projectId]);

  const handleCreateExpense = () => {
    // TODO: Open create expense dialog
    console.log('Create expense for project:', projectId);
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
        <h3 className="text-lg font-semibold text-white">Gastos del Proyecto</h3>
        <Button
          onClick={handleCreateExpense}
          className="bg-white text-black hover:bg-white/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir Gasto
        </Button>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <Receipt className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 mb-4">No hay gastos registrados para este proyecto</p>
          <Button
            variant="link"
            className="text-white/60 hover:text-white"
            onClick={handleCreateExpense}
          >
            Registrar el primer gasto
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">Descripción</TableHead>
                <TableHead className="text-white/60">Categoría</TableHead>
                <TableHead className="text-white/60 text-right">Importe</TableHead>
                <TableHead className="text-white/60">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => {
                const categoryInfo = getCategoryInfo(expense.category);
                return (
                  <TableRow
                    key={expense.id}
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell className="text-white">
                      {expense.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${categoryInfo.color} border`}>
                        {categoryInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {expense.amount?.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      })}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {new Date(expense.date).toLocaleDateString('es-ES')}
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

export default ProjectExpensesTab;