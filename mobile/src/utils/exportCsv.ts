import { Share, Platform } from 'react-native';

type CsvValue = string | number | null | undefined;

export function escapeCsv(value: CsvValue): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Builds a CSV string and opens the native share sheet.
 *
 * @param filename  Suggested filename (shown in share sheet on iOS)
 * @param headers   Column header labels
 * @param rows      Data rows — each inner array must match the headers length
 */
export async function exportToCsv(
  filename: string,
  headers: string[],
  rows: CsvValue[][],
): Promise<void> {
  const csvLines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ];
  const csv = csvLines.join('\n');

  if (Platform.OS === 'android') {
    await Share.share({ message: csv, title: filename });
  } else {
    // iOS — 'subject' belongs to ShareOptions (2nd arg), not ShareContent
    await Share.share({ message: csv }, { subject: filename });
  }
}
