/**
 * CSV export helpers for the user-management admin panel (AP 3 Phase 5).
 *
 * Pure utilities — NO React. `buildUsersCsv` + `generateCsvFilename` are plain
 * string functions (safe anywhere); `downloadCsv` touches browser globals
 * (Blob/URL/document) so it is client-only. The column set is the F2 minimal
 * shape: first_name, last_name, email, role, status (status = loginStatus).
 */
import type { TeamMemberListItem } from "@/lib/users";

const CSV_HEADERS = ["first_name", "last_name", "email", "role", "status"] as const;

/** UTF-8 byte-order mark — makes Excel read the file as UTF-8 (umlauts intact).
 *  Built from the code point (not a literal) to keep an invisible char out of source. */
const BOM = String.fromCharCode(0xfeff);

/**
 * RFC-4180 field escaping: wrap in double quotes when the value contains a comma,
 * a quote or a line break, doubling any embedded quotes. Plain values pass through.
 */
function csvEscape(val: string): string {
  return /[",\r\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
}

/**
 * Serialize members to a CSV string. Prefixed with a UTF-8 BOM so Excel renders
 * umlauts correctly, CRLF line endings (Excel-friendly). Null email/role become
 * empty strings — never the literal "null" (first/last name + status are NOT NULL
 * in the DTO).
 */
export function buildUsersCsv(members: TeamMemberListItem[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const m of members) {
    lines.push(
      [
        csvEscape(m.firstName),
        csvEscape(m.lastName),
        csvEscape(m.email ?? ""),
        csvEscape(m.role ?? ""),
        csvEscape(m.loginStatus),
      ].join(",")
    );
  }
  return BOM + lines.join("\r\n");
}

/**
 * "airtuerk-users-YYYYMMDD-HHMM.csv", stamped in the user's LOCAL timezone (the
 * wall-clock time they see), not UTC.
 */
export function generateCsvFilename(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  return `airtuerk-users-${stamp}.csv`;
}

/**
 * Trigger a client-side download of `csv` as `filename`. Browser-only: builds a
 * Blob, points a temporary <a download> at an object URL, clicks it, then cleans
 * up both the element and the object URL. Never call this server-side.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
