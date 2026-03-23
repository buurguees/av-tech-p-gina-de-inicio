import CompactKpiCard from "@/pages/nexo_av/desktop/components/common/CompactKpiCard";
import type { CalendarKpis } from "@/pages/nexo_av/shared/hooks/useCalendarData";

interface CalendarKpiBarProps {
  kpis: CalendarKpis;
  loading?: boolean;
}

const CalendarKpiBar = ({ kpis, loading }: CalendarKpiBarProps) => (
  <div className="grid grid-cols-4 gap-3 px-4 py-3">
    <CompactKpiCard
      label="Planificados"
      value={loading ? "—" : String(kpis.planned)}
      sub="con fecha asignada"
      color="blue"
      delay={0}
    />
    <CompactKpiCard
      label="En ejecución"
      value={loading ? "—" : String(kpis.inProgress)}
      sub="instalación activa"
      color="amber"
      delay={0.05}
    />
    <CompactKpiCard
      label="Sin técnico"
      value={loading ? "—" : String(kpis.withoutTechnician)}
      sub="pendientes de asignar"
      color={kpis.withoutTechnician > 0 ? "destructive" : "emerald"}
      delay={0.1}
    />
    <CompactKpiCard
      label="Listo facturar"
      value={loading ? "—" : String(kpis.readyToInvoice)}
      sub="esperando factura"
      color="emerald"
      delay={0.15}
    />
  </div>
);

export default CalendarKpiBar;
