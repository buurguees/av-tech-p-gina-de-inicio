/**
 * Password validation hook following OWASP best practices
 * Minimum 12 characters with complexity requirements
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

const COMMON_PASSWORDS = [
  'password123', 'admin1234', 'qwerty123', '12345678901', 
  'contraseña123', 'password1234', 'admin12345', 'avtech123',
  'nexoav123', 'nexoav1234', 'avtech1234'
];

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  
  const requirements = {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'`~]/.test(password),
  };

  if (!requirements.minLength) {
    errors.push('Mínimo 12 caracteres');
  }
  
  if (!requirements.hasUppercase) {
    errors.push('Al menos una mayúscula');
  }
  
  if (!requirements.hasLowercase) {
    errors.push('Al menos una minúscula');
  }
  
  if (!requirements.hasNumber) {
    errors.push('Al menos un número');
  }
  
  if (!requirements.hasSpecialChar) {
    errors.push('Al menos un carácter especial (!@#$%...)');
  }
  
  // Check for common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Esta contraseña es demasiado común');
  }

  // Calculate strength
  const metRequirements = Object.values(requirements).filter(Boolean).length;
  let strength: PasswordValidationResult['strength'] = 'weak';
  
  if (metRequirements >= 5 && password.length >= 16) {
    strength = 'very-strong';
  } else if (metRequirements >= 5 && password.length >= 12) {
    strength = 'strong';
  } else if (metRequirements >= 3) {
    strength = 'medium';
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
    requirements,
  };
};

export const getStrengthColor = (strength: PasswordValidationResult['strength']): string => {
  switch (strength) {
    case 'very-strong': return 'text-green-400';
    case 'strong': return 'text-emerald-400';
    case 'medium': return 'text-yellow-400';
    default: return 'text-red-400';
  }
};

export const getStrengthLabel = (strength: PasswordValidationResult['strength']): string => {
  switch (strength) {
    case 'very-strong': return 'Muy segura';
    case 'strong': return 'Segura';
    case 'medium': return 'Media';
    default: return 'Débil';
  }
};
