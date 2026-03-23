/**
 * useCompanionRules
 * Hook compartido que carga las reglas de producto acompañante y expone
 * helpers reutilizables para cualquier editor de líneas de documento.
 *
 * Ejemplo: 1 JORNADA TÉCNICO → 1 MEDIA DIETA
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CompanionRule {
  id: string;
  triggerProductId: string;
  triggerSku: string;
  triggerName: string;
  companionProductId: string;
  companionSku: string;
  companionName: string;
  companionSalePrice: number;
  companionTaxRate: number;
  quantityRatio: number;
  isActive: boolean;
}

export function useCompanionRules() {
  const [rules, setRules] = useState<CompanionRule[]>([]);
  const [suppressedTriggerKeys, setSuppressedTriggerKeys] = useState<Set<string>>(new Set());
  const suppressedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    suppressedRef.current = suppressedTriggerKeys;
  }, [suppressedTriggerKeys]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.rpc("list_product_companion_rules");
        if (error || !data) return;
        setRules(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data as any[])
            .filter((r) => r.is_active)
            .map((r) => ({
              id: r.id,
              triggerProductId: r.trigger_product_id,
              triggerSku: r.trigger_sku,
              triggerName: r.trigger_name,
              companionProductId: r.companion_product_id,
              companionSku: r.companion_sku,
              companionName: r.companion_name,
              companionSalePrice: Number(r.companion_sale_price),
              companionTaxRate: Number(r.companion_tax_rate),
              quantityRatio: Number(r.quantity_ratio),
              isActive: r.is_active,
            }))
        );
      } catch {
        // silent — reglas de acompañante son opcionales
      }
    };
    load();
  }, []);

  /** Devuelve la regla activa para un trigger_product_id, o undefined si no existe. */
  function findRuleForTrigger(productId: string): CompanionRule | undefined {
    return rules.find((r) => r.triggerProductId === productId);
  }

  /**
   * Una línea es sub-sección acompañante si su product_id es el companion
   * de alguna regla Y la línea anterior es el trigger.
   * Detección posicional, sin flags extra.
   */
  function isCompanionChild<L extends { product_id?: string }>(
    lines: L[],
    index: number
  ): boolean {
    if (rules.length === 0 || index === 0) return false;
    const line = lines[index];
    const prev = lines[index - 1];
    return rules.some(
      (r) =>
        line?.product_id === r.companionProductId &&
        prev?.product_id === r.triggerProductId
    );
  }

  return {
    companionRules: rules,
    suppressedRef,
    setSuppressedTriggerKeys,
    findRuleForTrigger,
    isCompanionChild,
  };
}
