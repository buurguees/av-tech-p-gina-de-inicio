import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import "../../styles/components/navigation/tab-nav.css";

export interface TabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface TabNavProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
}

const TabNav = ({ tabs, activeTab, onTabChange, className }: TabNavProps) => {
  if (tabs.length < 4 || tabs.length > 6) {
    console.warn(`TabNav: Se recomienda entre 4 y 6 tabs. Actualmente hay ${tabs.length}`);
  }

  return (
    <nav className={`tab-nav ${className || ""}`}>
      <div className="tab-nav__container">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              className={`tab-nav__button ${isActive ? "tab-nav__button--active" : ""}`}
              onClick={() => onTabChange(tab.value)}
              aria-label={tab.label}
              aria-selected={isActive}
              role="tab"
            >
              {Icon && <Icon className="tab-nav__icon" />}
              <span className="tab-nav__label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabNav;
