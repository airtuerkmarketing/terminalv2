import type { TypeScaleTableContent } from "@/lib/blocks/types";

export function TypeScaleTable({ content }: { content: TypeScaleTableContent }) {
  return (
    <table className="scale-table">
      <thead>
        <tr>
          <th>Token</th>
          <th>Size</th>
          <th>Weight</th>
          <th>Line height</th>
          <th>Tracking</th>
        </tr>
      </thead>
      <tbody>
        {content.rows.map((r, i) => (
          <tr key={i}>
            <td>{r.token}</td>
            <td>{r.sizePx}px</td>
            <td>{r.weight ?? "—"}</td>
            <td>{r.lineHeight ?? "—"}</td>
            <td>{r.tracking ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
