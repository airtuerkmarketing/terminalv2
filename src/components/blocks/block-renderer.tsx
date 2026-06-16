import type { BlockRow, BlockType } from "@/lib/blocks/types";
import { blockSchemas } from "@/lib/blocks/schemas";
import { blockRegistry } from "@/lib/blocks/registry";
import { UnsupportedBlock } from "./unsupported";

/** Renders an ordered list of validated blocks. */
export function BlockRenderer({ blocks }: { blocks: BlockRow[] }) {
  return (
    <div className="page-blocks">
      {blocks.map((block) => (
        <BlockItem key={block.id} block={block} />
      ))}
    </div>
  );
}

function BlockItem({ block }: { block: BlockRow }) {
  const type = block.type as BlockType;
  const schema = blockSchemas[type];
  const Component = blockRegistry[type];

  // Unknown type → graceful fallback (note in dev, nothing in prod).
  if (!schema || !Component) return <UnsupportedBlock type={block.type} />;

  // Validate content; invalid content also degrades gracefully.
  const parsed = schema.safeParse(block.content);
  if (!parsed.success) return <UnsupportedBlock type={block.type} reason="invalid content" />;

  const inner = <Component content={parsed.data} />;

  const body =
    block.layout === "two-column" ? (
      <div className="block block--two-column">
        <div className="block-label">{block.heading ? <h2>{block.heading}</h2> : null}</div>
        <div className="block-body">{inner}</div>
      </div>
    ) : (
      <div className="block">{inner}</div>
    );

  // A block may declare an in-page anchor id (e.g. IBE product sections).
  return block.anchor ? <section id={block.anchor}>{body}</section> : body;
}
