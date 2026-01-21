import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const expenseSchema = z.object({
    description: z.string().min(1, "La descripción es requerida"),
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: "El importe debe ser un número positivo",
    }),
    category: z.enum(['MATERIAL', 'LABOR', 'TRANSPORT', 'OTHER']),
    date: z.string().min(1, "La fecha es requerida"),
    notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface CreateProjectExpenseDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    onSuccess: () => void;
}

const CreateProjectExpenseDialog = ({
    isOpen,
    onOpenChange,
    projectId,
    onSuccess,
}: CreateProjectExpenseDialogProps) => {
    const [loading, setLoading] = useState(false);

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            description: "",
            amount: "",
            category: "OTHER",
            date: new Date().toISOString().split('T')[0],
            notes: "",
        },
    });

    const onSubmit = async (values: ExpenseFormValues) => {
        try {
            setLoading(true);
            const { data, error } = await supabase.rpc('add_project_expense', {
                p_project_id: projectId,
                p_description: values.description,
                p_amount: Number(values.amount),
                p_category: values.category,
                p_date: values.date,
                p_notes: values.notes || null
            } as any);

            if (error) throw error;

            toast.success("Gasto registrado correctamente");
            onSuccess();
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error('Error creating expense:', error);
            toast.error("Error al registrar el gasto");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-[#1A1A1A] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Registrar Gasto del Proyecto</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="bg-white/5 border-white/10" placeholder="Ej: Material de iluminación..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Importe (€)</FormLabel>
                                        <FormControl>
                                            <Input {...field} type="number" step="0.01" className="bg-white/5 border-white/10" placeholder="0.00" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoría</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-white/5 border-white/10">
                                                    <SelectValue placeholder="Seleccionar..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                                                <SelectItem value="MATERIAL">Material</SelectItem>
                                                <SelectItem value="LABOR">Mano de obra</SelectItem>
                                                <SelectItem value="TRANSPORT">Transporte</SelectItem>
                                                <SelectItem value="OTHER">Otros</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fecha</FormLabel>
                                    <FormControl>
                                        <Input {...field} type="date" className="bg-white/5 border-white/10" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas adicionales (opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} className="bg-white/5 border-white/10 min-h-[100px]" placeholder="Detalles extra del gasto..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="border-white/10 text-white hover:bg-white/5"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-white text-black hover:bg-white/90"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar Gasto
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateProjectExpenseDialog;
