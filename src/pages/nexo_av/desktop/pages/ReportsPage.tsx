import { useParams } from "react-router-dom";
import { BarChart3, FileText } from "lucide-react";

const ReportsPage = () => {
  const { userId } = useParams<{ userId: string }>();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Informes</h1>
          <p className="text-sm text-muted-foreground">Análisis y reportes del sistema</p>
        </div>
      </div>

      <div className="border border-border rounded-lg p-12 text-center bg-card">
        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Próximamente</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Esta funcionalidad estará disponible próximamente. Aquí podrás generar y visualizar informes detallados del sistema.
        </p>
      </div>
    </div>
  );
};

export default ReportsPage;
