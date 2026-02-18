import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import "../../styles/components/navigation/tab-nav.css";

export interface TabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  align?: "left" | "right";
}

interface TabNavProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
}

const TabNav = ({ tabs, activeTab, onTabChange, className }: TabNavProps) => {
  if (tabs.length < 2 || tabs.length > 7) {
    console.warn(`TabNav: Se recomienda entre 2 y 7 tabs. Actualmente hay ${tabs.length}`);
  }

  // Separar tabs por alineación
  const leftTabs = tabs.filter((tab) => tab.align !== "right");
  const rightTabs = tabs.filter((tab) => tab.align === "right");

  const renderTab = (tab: TabItem, isRightTab: boolean = false) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.value;

    return (
      <button
        key={tab.value}
        type="button"
        className={`tab-nav__button ${isActive ? "tab-nav__button--active" : ""} ${isRightTab ? "tab-nav__button--isolated" : ""}`}
        onClick={() => onTabChange(tab.value)}
        aria-label={tab.label}
        aria-selected={isActive}
        role="tab"
      >
        {Icon && <Icon className="tab-nav__icon" />}
        <span className="tab-nav__label">{tab.label}</span>
      </button>
    );
  };

  return (
    <nav className={`tab-nav ${className || ""}`}>
      <div className="tab-nav__container">
        <div className="tab-nav__left">
          {leftTabs.map((tab) => renderTab(tab, false))}
        </div>
        {rightTabs.length > 0 && (
          <div className="tab-nav__right">
            {rightTabs.map((tab) => renderTab(tab, true))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default TabNav;
