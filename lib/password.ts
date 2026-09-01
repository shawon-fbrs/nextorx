export interface PasswordStrengthResult {
  score: number; // 0-5
  label: string;
  color: string;
  issues: string[];
  isValid: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const issues: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 12) {
    score++;
  } else {
    issues.push('At least 12 characters');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    issues.push('At least one uppercase letter');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    issues.push('At least one lowercase letter');
  }

  // Number check
  if (/[0-9]/.test(password)) {
    score++;
  } else {
    issues.push('At least one number');
  }

  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score++;
  } else {
    issues.push('At least one special character');
  }

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['bg-red', 'bg-orange', 'bg-yellow', 'bg-blue', 'bg-green'];

  return {
    score,
    label: labels[Math.max(0, score - 1)] || 'Very Weak',
    color: colors[Math.max(0, score - 1)] || 'bg-red',
    issues,
    isValid: score >= 4, // Require at least 4/5 checks
  };
}

export const PASSWORD_REQUIREMENTS = [
  { label: 'At least 12 characters', test: (p: string) => p.length >= 12 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];
