import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AI_MODES } from '../../logic/constants';
import type { DepartmentScope } from '../../logic/types';

interface ModeSelectorProps {
  value: DepartmentScope;
  onChange: (value: DepartmentScope) => void;
}

const ModeSelector = ({ value, onChange }: ModeSelectorProps) => {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DepartmentScope)}>
      <SelectTrigger className="w-[180px] h-8 text-xs">
        <SelectValue placeholder="Modo" />
      </SelectTrigger>
      <SelectContent>
        {AI_MODES.map((mode) => (
          <SelectItem key={mode.value} value={mode.value} className="text-xs">
            <div>
              <div className="font-medium">{mode.label}</div>
              <div className="text-muted-foreground text-[10px]">{mode.description}</div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ModeSelector;
