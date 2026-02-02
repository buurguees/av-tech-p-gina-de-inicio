/**
 * EditProjectSheet - Bottom sheet para editar proyecto (mobile)
 */
import { Building2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditProjectForm, type ProjectDetail } from "@/pages/nexo_av/components/projects/EditProjectForm";

export interface EditProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDetail;
  onSuccess: () => void;
}

const EditProjectSheet = ({ open, onOpenChange, project, onSuccess }: EditProjectSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/50 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-5 w-5 text-primary" />
            Editar Proyecto
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto min-h-0">
          <EditProjectForm
            project={project}
            onSuccess={onSuccess}
            onClose={() => onOpenChange(false)}
            layout="sheet"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditProjectSheet;
