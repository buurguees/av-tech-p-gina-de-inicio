import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Send, Calendar, FileText } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const contactSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre es muy largo"),
  empresa: z.string().trim().max(100, "El nombre de empresa es muy largo").optional(),
  email: z.string().trim().email("Email inválido").max(255, "Email muy largo"),
  telefono: z.string().trim().min(8, "Teléfono inválido").max(20, "Teléfono muy largo"),
  tipoSolicitud: z.enum(["presupuesto", "visita"]),
  tipoEspacio: z.string().trim().min(1, "Selecciona un tipo de espacio"),
  mensaje: z.string().trim().min(10, "El mensaje debe tener al menos 10 caracteres").max(1000, "El mensaje es muy largo"),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormDialogProps {
  trigger: React.ReactNode;
}

export const ContactFormDialog = ({ trigger }: ContactFormDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<ContactFormData>>({
    tipoSolicitud: 'presupuesto',
    tipoEspacio: '',
  });

  const tiposEspacio = [
    { value: 'retail', label: 'Retail / Tienda' },
    { value: 'corporativo', label: 'Corporativo / Oficinas' },
    { value: 'evento', label: 'Eventos / Ferias' },
    { value: 'exterior', label: 'Publicidad Exterior' },
    { value: 'otro', label: 'Otro' },
  ];

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedData = contactSchema.parse(formData);
      
      const { data, error } = await supabase.functions.invoke('send-contact-form', {
        body: validatedData
      });

      if (error) {
        throw new Error(error.message || 'Error al enviar el formulario');
      }

      if (data?.error) {
        throw new Error(data.error);
      }
      
      toast.success(
        formData.tipoSolicitud === 'presupuesto' 
          ? '¡Solicitud de presupuesto enviada!' 
          : '¡Solicitud de visita enviada!',
        {
          description: 'Nos pondremos en contacto contigo pronto.',
        }
      );
      
      setFormData({
        tipoSolicitud: 'presupuesto',
        tipoEspacio: '',
      });
      setOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error('Error en el formulario', {
          description: firstError.message,
        });
      } else {
        toast.error('Error al enviar', {
          description: error instanceof Error ? error.message : 'Por favor, inténtalo de nuevo.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl">Empecemos tu proyecto</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Tipo de solicitud */}
          <div className="space-y-3">
            <Label className="text-caption">¿Qué necesitas?</Label>
            <RadioGroup
              value={formData.tipoSolicitud}
              onValueChange={(value) => handleChange('tipoSolicitud', value)}
              className="flex flex-col sm:flex-row gap-3"
            >
              <label 
                className={`flex-1 flex items-center gap-3 p-3 border rounded-sm cursor-pointer transition-colors ${
                  formData.tipoSolicitud === 'presupuesto' 
                    ? 'border-foreground bg-secondary' 
                    : 'border-border hover:border-foreground/50'
                }`}
              >
                <RadioGroupItem value="presupuesto" id="dialog-presupuesto" />
                <FileText className="w-4 h-4" />
                <span className="text-small">Solicitar presupuesto</span>
              </label>
              <label 
                className={`flex-1 flex items-center gap-3 p-3 border rounded-sm cursor-pointer transition-colors ${
                  formData.tipoSolicitud === 'visita' 
                    ? 'border-foreground bg-secondary' 
                    : 'border-border hover:border-foreground/50'
                }`}
              >
                <RadioGroupItem value="visita" id="dialog-visita" />
                <Calendar className="w-4 h-4" />
                <span className="text-small">Agendar visita</span>
              </label>
            </RadioGroup>
          </div>

          {/* Datos personales */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-nombre" className="text-caption">Nombre *</Label>
              <Input
                id="dialog-nombre"
                placeholder="Tu nombre"
                value={formData.nombre || ''}
                onChange={(e) => handleChange('nombre', e.target.value)}
                className="bg-secondary border-border focus:border-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-empresa" className="text-caption">Empresa</Label>
              <Input
                id="dialog-empresa"
                placeholder="Nombre de tu empresa"
                value={formData.empresa || ''}
                onChange={(e) => handleChange('empresa', e.target.value)}
                className="bg-secondary border-border focus:border-foreground"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-email" className="text-caption">Email *</Label>
              <Input
                id="dialog-email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="bg-secondary border-border focus:border-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-telefono" className="text-caption">Teléfono *</Label>
              <Input
                id="dialog-telefono"
                type="tel"
                placeholder="+34 XXX XXX XXX"
                value={formData.telefono || ''}
                onChange={(e) => handleChange('telefono', e.target.value)}
                className="bg-secondary border-border focus:border-foreground"
              />
            </div>
          </div>

          {/* Tipo de espacio */}
          <div className="space-y-3">
            <Label className="text-caption">Tipo de espacio *</Label>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              {tiposEspacio.map((tipo) => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => handleChange('tipoEspacio', tipo.value)}
                  className={`px-3 py-2 border rounded-sm text-xs transition-colors ${
                    formData.tipoEspacio === tipo.value
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border hover:border-foreground/50'
                  }`}
                >
                  {tipo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mensaje */}
          <div className="space-y-2">
            <Label htmlFor="dialog-mensaje" className="text-caption">
              {formData.tipoSolicitud === 'presupuesto' 
                ? 'Cuéntanos sobre tu proyecto *' 
                : 'Cuéntanos qué necesitas *'}
            </Label>
            <Textarea
              id="dialog-mensaje"
              placeholder={
                formData.tipoSolicitud === 'presupuesto'
                  ? 'Describe el espacio, dimensiones aproximadas, tipo de contenido que mostrarás...'
                  : 'Indica tu disponibilidad, dirección del espacio y cualquier detalle relevante...'
              }
              value={formData.mensaje || ''}
              onChange={(e) => handleChange('mensaje', e.target.value)}
              className="bg-secondary border-border focus:border-foreground min-h-[100px] resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="catalog"
            size="lg"
            className="w-full font-mono"
          >
            {isSubmitting ? (
              'Enviando...'
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {formData.tipoSolicitud === 'presupuesto' 
                  ? 'Solicitar presupuesto' 
                  : 'Solicitar visita'}
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactFormDialog;
