export function resolveInitialTheme({ stored, prefersDark }) {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function toggleTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}
