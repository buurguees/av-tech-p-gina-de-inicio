import { Button } from "@/components/ui/button";
import { Save, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MobileTotalsFooterProps {
  subtotal: number;
  taxAmount: number;
  total: number;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
}

const MobileTotalsFooter = ({
  subtotal,
  taxAmount,
  total,
  onSave,
  onCancel,
  saving = false,
  saveLabel = "Guardar",
  cancelLabel = "Cancelar",
  disabled = false,
}: MobileTotalsFooterProps) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl z-40 pb-safe">
      {/* Totals Section */}
      <div className="px-4 py-3 bg-muted/20">
        <AnimatePresence mode="wait">
          <motion.div
            key={`totals-${total}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-1.5"
          >
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA:</span>
              <span className="font-medium">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-1 border-t border-border">
              <span>Total:</span>
              <motion.span
                key={`total-value-${total}`}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-primary"
              >
                {formatCurrency(total)}
              </motion.span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="h-12 text-base"
          style={{ touchAction: 'manipulation' }}
        >
          <X className="h-4 w-4 mr-2" />
          {cancelLabel}
        </Button>
        <Button
          onClick={onSave}
          disabled={disabled || saving}
          className="h-12 text-base"
          style={{ touchAction: 'manipulation' }}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {saveLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default MobileTotalsFooter;
