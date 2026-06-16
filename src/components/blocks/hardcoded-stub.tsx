/**
 * Placeholder for a hardcoded page (rendering_mode='hardcoded'). The real
 * interactive component (keyed by component_key) is built in Task 5; for now we
 * route to this stub by component_key so the URL resolves instead of 404ing.
 */
export function HardcodedStub({
  title,
  componentKey,
}: {
  title: string;
  componentKey: string | null;
}) {
  return (
    <div className="hardcoded-stub">
      <h1>{title}</h1>
      {componentKey ? <span className="key">component_key: {componentKey}</span> : null}
      <p className="note">
        This is a hardcoded page — its interactive component is built in Task 5.
      </p>
    </div>
  );
}
