export function validateForm(values = {}) {
  return Object.values(values).every((value) => String(value).trim() !== '');
}
