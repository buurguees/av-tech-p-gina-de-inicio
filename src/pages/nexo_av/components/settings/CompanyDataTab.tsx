import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export function CompanyDataTab() {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Datos de la Empresa
        </CardTitle>
        <CardDescription className="text-white/60">
          Configura la información de tu empresa que aparecerá en presupuestos y facturas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-white/40 text-center py-12">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Próximamente...</p>
          <p className="text-sm mt-2">
            Aquí podrás configurar el nombre, dirección, CIF y datos fiscales de tu empresa.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
