import { Check, X } from "lucide-react";
import { PasswordValidationResult, getStrengthColor, getStrengthLabel } from "@/hooks/usePasswordValidation";

interface PasswordStrengthIndicatorProps {
  validation: PasswordValidationResult;
  showRequirements?: boolean;
}

const PasswordStrengthIndicator = ({ 
  validation, 
  showRequirements = true 
}: PasswordStrengthIndicatorProps) => {
  const { strength, requirements } = validation;
  const strengthColor = getStrengthColor(strength);
  const strengthLabel = getStrengthLabel(strength);

  // Progress bar width based on strength
  const getProgressWidth = () => {
    switch (strength) {
      case 'very-strong': return '100%';
      case 'strong': return '75%';
      case 'medium': return '50%';
      default: return '25%';
    }
  };

  const getProgressColor = () => {
    switch (strength) {
      case 'very-strong': return 'bg-green-500';
      case 'strong': return 'bg-emerald-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const requirementsList = [
    { key: 'minLength', label: '12+ caracteres', met: requirements.minLength },
    { key: 'hasUppercase', label: 'Mayúscula', met: requirements.hasUppercase },
    { key: 'hasLowercase', label: 'Minúscula', met: requirements.hasLowercase },
    { key: 'hasNumber', label: 'Número', met: requirements.hasNumber },
    { key: 'hasSpecialChar', label: 'Especial (!@#...)', met: requirements.hasSpecialChar },
  ];

  return (
    <div className="space-y-2 mt-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getProgressColor()} transition-all duration-300`}
            style={{ width: getProgressWidth() }}
          />
        </div>
        <span className={`text-xs font-medium ${strengthColor}`}>
          {strengthLabel}
        </span>
      </div>

      {/* Requirements list */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-1 text-xs">
          {requirementsList.map((req) => (
            <div 
              key={req.key}
              className={`flex items-center gap-1 ${req.met ? 'text-green-400' : 'text-white/40'}`}
            >
              {req.met ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
