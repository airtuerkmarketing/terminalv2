import Link from "next/link";
import type { ProductShowcaseContent, ProductShowcaseItem } from "@/lib/blocks/types";

export function ProductShowcase({ content }: { content: ProductShowcaseContent }) {
  return (
    <div className="product-showcase">
      {content.products.map((p, i) =>
        p.href ? (
          <Link key={i} className="product-card" href={p.href}>
            <Body p={p} />
          </Link>
        ) : (
          <div key={i} className="product-card">
            <Body p={p} />
          </div>
        )
      )}
    </div>
  );
}

function Body({ p }: { p: ProductShowcaseItem }) {
  return (
    <>
      {/* mark background may be a product brand colour (brand content) */}
      <div className="mark" style={p.color ? { background: p.color } : undefined}>
        {p.name.slice(0, 2)}
      </div>
      <div className="name">{p.name}</div>
      {p.tagline ? <div className="tagline">{p.tagline}</div> : null}
    </>
  );
}
