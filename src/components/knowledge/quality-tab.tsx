"use client";

import type { QualityStats } from "@/lib/knowledge/types";

/** Hand-rolled SVG sparkline (no recharts) over the per-test-set accuracy. */
function Sparkline({ points }: { points: number[] }) {
  const W = 320;
  const H = 90;
  const PAD = 8;
  if (points.length === 0) return null;
  const min = Math.min(...points, 80);
  const max = 100;
  const span = Math.max(1, max - min);
  const step = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = PAD + i * step;
    const y = PAD + (1 - (p - min) / span) * (H - PAD * 2);
    return [x, y] as const;
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${coords[coords.length - 1][0].toFixed(1)},${H - PAD} L${coords[0][0].toFixed(1)},${H - PAD} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gold-Set Genauigkeit pro Testlauf">
      <path d={area} fill="var(--accent-soft)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="var(--accent)" />
      ))}
    </svg>
  );
}

export function QualityTab({ quality }: { quality: QualityStats }) {
  return (
    <div>
      <div className="kb-q-top">
        <div className="kb-q-score">
          <span className="kb-q-score-val">{quality.overallPct}%</span>
          <span className="kb-q-score-label">
            Gold-Set Genauigkeit · {quality.correct}/{quality.total} richtig
          </span>
        </div>
        <div className="kb-q-spark">
          <div className="kb-diff-label" style={{ marginBottom: "var(--space-2)" }}>
            Genauigkeit pro Testlauf
          </div>
          <Sparkline points={quality.bySet.map((s) => s.pct)} />
        </div>
      </div>

      <div className="kb-q-sets">
        {quality.bySet.map((s) => (
          <div key={s.testSet} className="kb-q-set">
            <span className="kb-q-set-name">{s.testSet}</span>
            <span className="kb-q-bar">
              <span className="kb-q-bar-fill" style={{ width: `${s.pct}%` }} />
            </span>
            <span className="kb-q-set-pct">{s.pct}%</span>
          </div>
        ))}
      </div>

      {quality.failures.length > 0 && (
        <>
          <h3 className="kb-q-fail-title">Fehler-Cluster ({quality.failures.length})</h3>
          {quality.failures.map((f, i) => (
            <div key={i} className="kb-q-fail">
              <div>{f.frage}</div>
              <div className="kb-q-fail-set">
                {f.testSet}
                {f.frageNr != null ? ` · Frage ${f.frageNr}` : ""}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
