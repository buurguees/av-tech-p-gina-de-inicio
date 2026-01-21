import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { X, Save, Search } from "lucide-react";
import ProductSearchInput from "../ProductSearchInput";

interface FormLine {
  id?: string;
  tempId?: string;
  concept: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

interface FormLineEditorMobileProps {
  line: FormLine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (line: FormLine) => void;
  type: 'quote' | 'invoice';
}

const FormLineEditorMobile = ({
  line,
  open,
  onOpenChange,
  onSave,
  type,
}: FormLineEditorMobileProps) => {
  const [formData, setFormData] = useState<FormLine>({
    concept: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 21,
    discount_percent: 0,
    subtotal: 0,
    tax_amount: 0,
    total: 0,
  });

  useEffect(() => {
    if (line) {
      setFormData(line);
    } else {
      // Reset form for new line
      setFormData({
        concept: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 21,
        discount_percent: 0,
        subtotal: 0,
        tax_amount: 0,
        total: 0,
      });
    }
  }, [line, open]);

  // Calculate totals automatically
  useEffect(() => {
    const quantity = formData.quantity || 0;
    const unitPrice = formData.unit_price || 0;
    const discount = formData.discount_percent || 0;
    const taxRate = formData.tax_rate || 0;

    const subtotal = quantity * unitPrice * (1 - discount / 100);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    setFormData(prev => ({
      ...prev,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax_amount: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    }));
  }, [formData.quantity, formData.unit_price, formData.discount_percent, formData.tax_rate]);

  const handleSave = () => {
    if (!formData.concept || formData.quantity <= 0 || formData.unit_price < 0) {
      return;
    }
    onSave(formData);
    onOpenChange(false);
  };

  const handleProductSelect = (product: any) => {
    setFormData(prev => ({
      ...prev,
      concept: product.name,
      description: product.description || '',
      unit_price: product.selling_price || 0,
    }));
  };

  const isValid = formData.concept && formData.quantity > 0 && formData.unit_price >= 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>
            {line ? `Editar línea` : `Nueva línea de ${type === 'quote' ? 'presupuesto' : 'factura'}`}
          </SheetTitle>
          <SheetDescription>
            {line ? 'Modifica los campos necesarios' : 'Completa los campos para agregar la línea'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Product Search */}
          <div className="space-y-2">
            <Label htmlFor="product-search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar producto
            </Label>
            <ProductSearchInput onSelect={handleProductSelect} />
          </div>

          {/* Concept */}
          <div className="space-y-2">
            <Label htmlFor="concept">
              Concepto <span className="text-destructive">*</span>
            </Label>
            <Input
              id="concept"
              value={formData.concept}
              onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
              placeholder="Ej: Pantalla LED 55 pulgadas"
              className="text-base h-12"
              style={{ touchAction: 'manipulation' }}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción detallada (opcional)"
              rows={3}
              className="text-base resize-none"
              style={{ touchAction: 'manipulation' }}
            />
          </div>

          {/* Quantity and Unit Price - Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Cantidad <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                inputMode="decimal"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="text-base h-12"
                style={{ touchAction: 'manipulation' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price">
                Precio unitario <span className="text-destructive">*</span>
              </Label>
              <Input
                id="unit_price"
                type="number"
                inputMode="decimal"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="text-base h-12"
                style={{ touchAction: 'manipulation' }}
              />
            </div>
          </div>

          {/* Tax Rate and Discount - Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tax_rate">IVA (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                inputMode="decimal"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                min="0"
                max="100"
                step="0.01"
                className="text-base h-12"
                style={{ touchAction: 'manipulation' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Descuento (%)</Label>
              <Input
                id="discount"
                type="number"
                inputMode="decimal"
                value={formData.discount_percent}
                onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
                min="0"
                max="100"
                step="0.01"
                className="text-base h-12"
                style={{ touchAction: 'manipulation' }}
              />
            </div>
          </div>

          {/* Totals - Read-only */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-2 border border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formData.subtotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA ({formData.tax_rate}%):</span>
              <span className="font-medium">{formData.tax_amount.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t">
              <span>Total:</span>
              <span className="text-primary">{formData.total.toFixed(2)} €</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12"
              type="button"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid}
              className="h-12"
              type="button"
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FormLineEditorMobile;
