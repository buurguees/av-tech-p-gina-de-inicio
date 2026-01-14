import { useParams } from "react-router-dom";
import { DollarSign, TrendingDown } from "lucide-react";

const ExpensesPage = () => {
  const { userId } = useParams<{ userId: string }>();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <DollarSign className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gastos</h1>
          <p className="text-sm text-muted-foreground">Gestión de gastos</p>
        </div>
      </div>

      <div className="border border-border rounded-lg p-12 text-center bg-card">
        <TrendingDown className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Próximamente</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Esta funcionalidad estará disponible próximamente. Aquí podrás gestionar todos tus gastos.
        </p>
      </div>
    </div>
  );
};

export default ExpensesPage;
