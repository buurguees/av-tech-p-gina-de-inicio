import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().email("Email inválido").max(255),
  phone: z.string().min(6, "Teléfono inválido").max(20),
});

type FormData = z.infer<typeof formSchema>;

interface QuickQuoteDialogProps {
  trigger?: React.ReactNode;
}

const QuickQuoteDialog = ({ trigger }: QuickQuoteDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Get current user session
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        toast({
          title: "Error",
          description: "Sesión no válida",
          variant: "destructive",
        });
        return;
      }

      // Create client with "Nuevo Lead" status
      const { data: result, error } = await supabase.rpc('create_client', {
        p_company_name: data.name,
        p_contact_email: data.email,
        p_contact_phone: data.phone,
        p_lead_stage: 'NUEVO',
        p_lead_source: 'QUICK_QUOTE',
        p_assigned_to: session.session.user.id,
      });

      if (error) {
        console.error('Error creating client:', error);
        toast({
          title: "Error",
          description: error.message || "No se pudo crear el cliente",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Lead creado",
        description: "Se ha creado el lead correctamente",
      });

      setOpen(false);
      form.reset();

      // Navigate to the new quote page for this client
      // For now, navigate to client detail with quotes tab
      if (result) {
        navigate(`/nexo-av/${userId}/clients/${result}/quotes/new`);
      }
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "Error",
        description: "Ha ocurrido un error inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Presupuesto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-black border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Nuevo Presupuesto Rápido</DialogTitle>
          <DialogDescription className="text-white/60">
            Introduce los datos básicos del lead para generar un presupuesto.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Nombre</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Nombre del cliente o empresa"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="email@ejemplo.com"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      placeholder="+34 600 000 000"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-white text-black hover:bg-white/90"
              >
                {loading ? "Creando..." : "Continuar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickQuoteDialog;
