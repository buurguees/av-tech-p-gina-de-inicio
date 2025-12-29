import { motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Send, Calendar, FileText, Phone, Mail, MapPin } from 'lucide-react';
import { z } from 'zod';

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

const Contacto = () => {
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
      
      // Aquí se integraría con el backend
      console.log('Formulario enviado:', validatedData);
      
      toast.success(
        formData.tipoSolicitud === 'presupuesto' 
          ? '¡Solicitud de presupuesto enviada!' 
          : '¡Solicitud de visita enviada!',
        {
          description: 'Nos pondremos en contacto contigo pronto.',
        }
      );
      
      // Reset form
      setFormData({
        tipoSolicitud: 'presupuesto',
        tipoEspacio: '',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error('Error en el formulario', {
          description: firstError.message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contacto" className="relative py-20 sm:py-32 overflow-hidden">
      <div className="max-w-[1800px] mx-auto px-6 sm:px-8 md:px-16">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left column - Info */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col"
          >
            <div className="section-tag">
              Hablemos
            </div>
            <h2 className="section-title max-w-xl">
              <span className="section-title-primary">Empecemos</span>
              <br />
              <span className="section-title-secondary">tu proyecto</span>
            </h2>
            <p className="section-description mt-6">
              ¿Tienes un espacio que necesita destacar? Cuéntanos tu visión y diseñaremos la solución audiovisual perfecta para tu negocio.
            </p>

            {/* Contact info */}
            <div className="mt-12 space-y-6">
              <motion.div 
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div className="w-12 h-12 rounded-sm bg-secondary flex items-center justify-center">
                  <Phone className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="text-caption mb-1">Teléfono</p>
                  <a href="tel:+34616579640" className="text-body hover:text-foreground transition-colors">+34 616 579 640</a>
                </div>
              </motion.div>

              <motion.div 
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <div className="w-12 h-12 rounded-sm bg-secondary flex items-center justify-center">
                  <Mail className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="text-caption mb-1">Email</p>
                  <a href="mailto:info@avtechesdeveniments.com" className="text-body hover:text-foreground transition-colors">info@avtechesdeveniments.com</a>
                </div>
              </motion.div>

              <motion.div 
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <div className="w-12 h-12 rounded-sm bg-secondary flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="text-caption mb-1">Ubicación</p>
                  <p className="text-body">C/ Francesc Hombravella Maristany, 13</p>
                  <p className="text-small">08320, El Masnou, Barcelona</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right column - Form */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Tipo de solicitud */}
              <div className="space-y-4">
                <Label className="text-caption">¿Qué necesitas?</Label>
                <RadioGroup
                  value={formData.tipoSolicitud}
                  onValueChange={(value) => handleChange('tipoSolicitud', value)}
                  className="flex gap-4"
                >
                  <label 
                    className={`flex-1 flex items-center gap-3 p-4 border rounded-sm cursor-pointer transition-colors ${
                      formData.tipoSolicitud === 'presupuesto' 
                        ? 'border-foreground bg-secondary' 
                        : 'border-border hover:border-foreground/50'
                    }`}
                  >
                    <RadioGroupItem value="presupuesto" id="presupuesto" />
                    <FileText className="w-5 h-5" />
                    <span className="text-small">Solicitar presupuesto</span>
                  </label>
                  <label 
                    className={`flex-1 flex items-center gap-3 p-4 border rounded-sm cursor-pointer transition-colors ${
                      formData.tipoSolicitud === 'visita' 
                        ? 'border-foreground bg-secondary' 
                        : 'border-border hover:border-foreground/50'
                    }`}
                  >
                    <RadioGroupItem value="visita" id="visita" />
                    <Calendar className="w-5 h-5" />
                    <span className="text-small">Agendar visita</span>
                  </label>
                </RadioGroup>
              </div>

              {/* Datos personales */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-caption">Nombre *</Label>
                  <Input
                    id="nombre"
                    placeholder="Tu nombre"
                    value={formData.nombre || ''}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    className="bg-secondary border-border focus:border-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa" className="text-caption">Empresa</Label>
                  <Input
                    id="empresa"
                    placeholder="Nombre de tu empresa"
                    value={formData.empresa || ''}
                    onChange={(e) => handleChange('empresa', e.target.value)}
                    className="bg-secondary border-border focus:border-foreground"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-caption">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="bg-secondary border-border focus:border-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono" className="text-caption">Teléfono *</Label>
                  <Input
                    id="telefono"
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
                <div className="flex flex-wrap gap-2">
                  {tiposEspacio.map((tipo) => (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => handleChange('tipoEspacio', tipo.value)}
                      className={`px-4 py-2 border rounded-sm text-small transition-colors ${
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
                <Label htmlFor="mensaje" className="text-caption">
                  {formData.tipoSolicitud === 'presupuesto' 
                    ? 'Cuéntanos sobre tu proyecto *' 
                    : 'Cuéntanos qué necesitas *'}
                </Label>
                <Textarea
                  id="mensaje"
                  placeholder={
                    formData.tipoSolicitud === 'presupuesto'
                      ? 'Describe el espacio, dimensiones aproximadas, tipo de contenido que mostrarás...'
                      : 'Indica tu disponibilidad, dirección del espacio y cualquier detalle relevante...'
                  }
                  value={formData.mensaje || ''}
                  onChange={(e) => handleChange('mensaje', e.target.value)}
                  className="bg-secondary border-border focus:border-foreground min-h-[120px] resize-none"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-6 bg-foreground text-background hover:bg-foreground/90 font-mono tracking-wide"
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
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contacto;
