import { categories, type Category } from "@/lib/budget";
import { toCents } from "@/lib/budget-math";

export type CsvColumnMapping = { merchant: string; description: string; amount: string; date: string; category: string };
export type ParsedCsvExpense = { merchant: string; description: string; amountCents: number; occurredOn: string; category?: Category };

export function normalizeCsvDate(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
  return "";
}

export function parseCsvAmount(value: string) {
  const amount = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? toCents(amount) : 0;
}

export function categoryFromCsv(value: string): Category | undefined {
  return categories.find((category) => category.toLowerCase() === value.trim().toLowerCase());
}

export function parseMappedCsvRows(rows: Record<string, string>[], mapping: CsvColumnMapping) {
  const valid: ParsedCsvExpense[] = [];
  let invalid = 0;
  for (const row of rows) {
    const merchant = String(row[mapping.merchant] ?? "").trim();
    const amountCents = parseCsvAmount(String(row[mapping.amount] ?? ""));
    const occurredOn = normalizeCsvDate(String(row[mapping.date] ?? ""));
    if (!merchant || !amountCents || !occurredOn) {
      invalid += 1;
      continue;
    }
    valid.push({
      merchant,
      description: String(row[mapping.description] ?? "").trim(),
      amountCents,
      occurredOn,
      category: mapping.category ? categoryFromCsv(String(row[mapping.category] ?? "")) : undefined,
    });
  }
  return { valid, invalid };
}
