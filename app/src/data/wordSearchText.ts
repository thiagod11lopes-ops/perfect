export function normalizeWordSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
}