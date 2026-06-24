import { EmailSignature } from "@/components/hardcoded/email-signature";

/**
 * Email-signature section — embeds the existing hardcoded generator exactly as
 * the DB-block path did (renderHardcodedEmbedded): single-column `.anchor-section`
 * (no `--two-col`), no `<h2>` here — the component renders its own "Your
 * Signature" heading. The anchor id stays `email-signature`.
 */
export function EmailSignatureSection() {
  return (
    <section id="email-signature" className="anchor-section">
      <EmailSignature title="Email Signature" embedded />
    </section>
  );
}
