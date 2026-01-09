import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface TabItem {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface DetailTabsMobileProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  tabs: TabItem[];
  children: React.ReactNode;
  className?: string;
}

const DetailTabsMobile = ({
  defaultValue,
  value,
  onValueChange,
  tabs,
  children,
  className,
}: DetailTabsMobileProps) => {
  return (
    <Tabs
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={cn("w-full", className)}
    >
      {/* Mobile tabs with horizontal scroll */}
      <div className="md:hidden mb-4">
        <div className="nexo-tabs-mobile">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "shrink-0 px-4 py-2.5 text-sm font-medium rounded-xl",
                "data-[state=active]:bg-white/10 data-[state=active]:text-white",
                "data-[state=inactive]:text-white/50 data-[state=inactive]:bg-white/5",
                "border border-white/10 data-[state=active]:border-white/30",
                "transition-all duration-200 touch-target"
              )}
            >
              {tab.icon && <tab.icon className="h-4 w-4 mr-1.5 shrink-0" />}
              <span className="whitespace-nowrap">{tab.label}</span>
            </TabsTrigger>
          ))}
        </div>
      </div>

      {/* Desktop tabs - normal grid */}
      <TabsList className="hidden md:grid md:grid-cols-4 lg:grid-cols-6 gap-2 bg-white/5 border border-white/10 p-1.5 rounded-xl">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=inactive]:text-white/50"
          >
            {tab.icon && <tab.icon className="h-4 w-4 mr-2" />}
            <span>{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Tab content - children should contain TabsContent components */}
      {children}
    </Tabs>
  );
};

export default DetailTabsMobile;
