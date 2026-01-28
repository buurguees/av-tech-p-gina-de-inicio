import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, AlertCircle } from "lucide-react";

const MobileNotFound = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-4 bg-red-500/10 rounded-2xl mb-6">
        <AlertCircle className="h-12 w-12 text-red-500" />
      </div>
      
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Página no encontrada
      </h1>
      
      <p className="text-muted-foreground mb-8 max-w-xs">
        La página que buscas no existe o no tienes permisos para acceder a ella.
      </p>
      
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="w-full h-12"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver atrás
        </Button>
        
        <Button
          onClick={() => navigate(`/nexo-av/${userId}/dashboard`)}
          className="w-full h-12"
        >
          <Home className="h-5 w-5 mr-2" />
          Ir al inicio
        </Button>
      </div>
    </div>
  );
};

export default MobileNotFound;
