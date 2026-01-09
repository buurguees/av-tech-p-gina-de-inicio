import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface FormDialogMobileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component that optimizes dialogs for mobile devices
 * - Larger inputs for touch targets
 * - Better spacing
 * - Fixed action buttons at bottom on mobile
 * - Auto-scroll on input focus
 */
const FormDialogMobile = ({
  open,
  onOpenChange,
  title,
  children,
  className,
}: FormDialogMobileProps) => {
  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border",
          "nexo-form-mobile",
          isMobile && "max-w-[95vw] p-4",
          className
        )}
      >
        <DialogHeader className={cn(isMobile && "mb-4")}>
          <DialogTitle className={cn("font-mono text-xl", isMobile && "text-lg")}>
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className={cn(
          "space-y-4",
          isMobile && "space-y-5"
        )}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FormDialogMobile;
