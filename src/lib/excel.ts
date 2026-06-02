import * as XLSX from 'xlsx'

export function exportToExcel(data: Record<string, unknown>[], sheetName: string): Buffer {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Auto-size columns
  if (data.length > 0) {
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2
    }))
    ws['!cols'] = colWidths
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
