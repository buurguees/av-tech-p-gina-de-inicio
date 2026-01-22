import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

/**
 * TechnicianDetailPage - Temporarily disabled
 * 
 * This component had structural JSX corruption and is pending refactoring.
 * Once the main business flow (Clients → Projects → Quotes → Invoices) is complete,
 * this page will be rebuilt following the same component patterns.
 */
const TechnicianDetailPageDesktop = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 max-w-md text-center">
        <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">
          Página en Mantenimiento
        </h2>
        <p className="text-muted-foreground mb-4">
          Esta página está siendo refactorizada para mejorar su estructura y rendimiento.
          Estará disponible próximamente.
        </p>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => navigate(`/nexo-av/${userId}/technicians`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Técnicos
        </Button>
      </div>
    </div>
  );
};

export default TechnicianDetailPageDesktop;
