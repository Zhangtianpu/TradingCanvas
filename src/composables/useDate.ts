export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return formatDate(new Date())
}

export function shortDate(dateStr: string): string {
  const parts = dateStr.split('-')
  return `${parts[1]}-${parts[2]}`
}
