import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface DashboardWidgetProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    action?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    variant?: "clean" | "glass" | "solid";
    className?: string;
    headerClassName?: string;
    contentClassName?: string;
}

const DashboardWidget = ({
    title,
    subtitle,
    icon: Icon,
    action,
    children,
    footer,
    variant = "clean",
    className,
    headerClassName,
    contentClassName,
}: DashboardWidgetProps) => {
    const variantStyles = {
        clean: "bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200",
        glass: "bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg",
        solid: "bg-primary text-primary-foreground shadow-md",
    };

    return (
        <div className={cn("rounded-2xl overflow-hidden flex flex-col h-full", variantStyles[variant], className)}>
            {/* Header */}
            <div className={cn("px-6 py-5 flex items-start justify-between", headerClassName)}>
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className={cn(
                            "p-2.5 rounded-xl",
                            variant === "solid"
                                ? "bg-primary-foreground/10 text-primary-foreground"
                                : "bg-primary/5 text-primary"
                        )}>
                            <Icon className="w-5 h-5" />
                        </div>
                    )}
                    <div>
                        <h3 className={cn(
                            "font-semibold text-lg tracking-tight",
                            variant === "solid" ? "text-primary-foreground" : "text-foreground"
                        )}>
                            {title}
                        </h3>
                        {subtitle && (
                            <p className={cn(
                                "text-sm mt-0.5",
                                variant === "solid" ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                {action && (
                    <div className="flex-shrink-0 ml-4">
                        {action}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className={cn("flex-1 px-6 pb-6", contentClassName)}>
                {children}
            </div>

            {/* Footer */}
            {footer && (
                <div className={cn(
                    "px-6 py-4 border-t",
                    variant === "solid" ? "border-primary-foreground/10" : "border-border/50 bg-secondary/30"
                )}>
                    {footer}
                </div>
            )}
        </div>
    );
};

export default DashboardWidget;
