import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Clock3, Wrench } from "lucide-react";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const CalendarPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();

  return (
    <div className="flex h-full flex-col bg-background">
      <DetailNavigationBar
        pageTitle="Calendario"
        contextInfo="Desktop · Integracion M365 en preparacion"
        onBack={() => navigate(`/nexo-av/${userId}/dashboard`)}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-500/10 p-3">
              <CalendarDays className="h-6 w-6 text-sky-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
              <p className="text-sm text-muted-foreground">
                Base desktop para la futura sincronizacion entre calendarios M365 y NEXO AV.
              </p>
            </div>
          </div>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-sky-500" />
                Modulo en preparacion
              </CardTitle>
              <CardDescription>
                La entrada ya esta creada en el sidebar desktop. En el siguiente paso conectaremos
                la logica de calendarios corporativos y sincronizacion con ERP.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-sky-500/30 bg-sky-500/5 p-4">
                <Wrench className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-500" />
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Prioridad prevista: `Instalaciones` y `Facturacion`.</p>
                  <p>Origen operativo validado: calendarios M365 del buzon corporativo configurado.</p>
                  <p>Alcance actual: solo desktop, sin cambios en mobile.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
