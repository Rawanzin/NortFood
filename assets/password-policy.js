export const minimumPasswordLength = 8;
export function passwordError(value) {
  const password = String(value || '');
  if (password.length < minimumPasswordLength) return 'Use pelo menos 8 caracteres na senha.';
  return '';
}
