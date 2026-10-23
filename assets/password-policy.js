export const minimumPasswordLength = 8;
const common = new Set(['12345678','123456789','1234567890','password','password1','senha123','senha1234','qwerty123','abcdefgh','87654321','11111111','00000000','nortfood']);
export function passwordError(value) {
  const password = String(value || '');
  if (password.length < minimumPasswordLength) return 'Use pelo menos 8 caracteres na senha.';
  if (common.has(password.toLowerCase())) return 'Esta senha é muito comum. Escolha uma frase ou senha diferente.';
  return '';
}
