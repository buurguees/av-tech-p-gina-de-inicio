/**
 * useDisplacementRules
 * Hook compartido que carga la configuración de reglas de desplazamiento y expone
 * helpers reutilizables para cualquier editor de líneas de documento.
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DisplacementConfig {
  kmProductId: string;
  hoursProductId: string;
  hoursProductName: string;
  hoursUnitPrice: number;
  hoursTaxRate: number;
  rules: Array<{ km_min: number; km_max: number | null; travel_hours: number }>;
}

export function useDisplacementRules() {
  const [config, setConfig] = useState<DisplacementConfig | null>(null);
  const [suppressedKmKeys, setSuppressedKmKeys] = useState<Set<string>>(new Set());
  // Ref para acceder al set dentro de callbacks sin dependencias estables
  const suppressedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    suppressedRef.current = suppressedKmKeys;
  }, [suppressedKmKeys]);

  useEffect(() => {
    const load = async () => {
      try {
        const [rulesRes, productsRes] = await Promise.all([
          supabase.rpc("list_km_displacement_rules"),
          supabase.rpc("get_displacement_products"),
        ]);
        if (rulesRes.error || productsRes.error) return;
        const rules = (rulesRes.data ?? []).filter((r: { is_active: boolean }) => r.is_active);
        const products: Array<{
          product_id: string; role: string; name: string; unit_price: number; tax_rate: number;
        }> = productsRes.data ?? [];
        const kmProd = products.find((p) => p.role === "km");
        const hoursProd = products.find((p) => p.role === "hours");
        if (kmProd && hoursProd && rules.length > 0) {
          setConfig({
            kmProductId: kmProd.product_id,
            hoursProductId: hoursProd.product_id,
            hoursProductName: hoursProd.name,
            hoursUnitPrice: hoursProd.unit_price,
            hoursTaxRate: hoursProd.tax_rate,
            rules,
          });
        }
      } catch {
        // silent — desplazamiento es opcional
      }
    };
    load();
  }, []);

  /** Calcula las horas que corresponden a X km según las reglas activas. */
  function resolveHours(km: number): number {
    if (!config) return 0;
    const rule = config.rules.find(
      (r) => km >= r.km_min && (r.km_max === null || km <= r.km_max)
    );
    return rule?.travel_hours ?? 0;
  }

  /** Una línea es sub-sección de desplazamiento si su product_id es el de horas
   *  y la línea anterior es la de km. Detección por posición, sin flags extra. */
  function isDisplacementChild<L extends { product_id?: string }>(
    lines: L[],
    index: number
  ): boolean {
    if (!config || index === 0) return false;
    return (
      lines[index]?.product_id === config.hoursProductId &&
      lines[index - 1]?.product_id === config.kmProductId
    );
  }

  return {
    config,
    suppressedRef,
    setSuppressedKmKeys,
    resolveHours,
    isDisplacementChild,
  };
}
