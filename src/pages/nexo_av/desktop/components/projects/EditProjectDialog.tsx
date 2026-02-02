/**
 * EditProjectDialog - Diálogo para editar proyecto (desktop)
 */
import { Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { EditProjectForm, type ProjectDetail } from "@/pages/nexo_av/components/projects/EditProjectForm";

export interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDetail;
  onSuccess: () => void;
}

const EditProjectDialog = ({ open, onOpenChange, project, onSuccess }: EditProjectDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-background border-border p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-5 w-5 text-primary" />
            Editar Proyecto
          </DialogTitle>
        </DialogHeader>
        <EditProjectForm
          project={project}
          onSuccess={onSuccess}
          onClose={() => onOpenChange(false)}
          layout="dialog"
          renderFooter={({ loading, onCancel }) => (
            <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20 gap-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </DialogFooter>
          )}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditProjectDialog;
