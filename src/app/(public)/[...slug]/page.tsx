import type { Metadata } from "next";
import { renderPage, pageMetadata } from "@/components/page-view";

type Params = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return pageMetadata("/" + slug.join("/"));
}

export default async function CatchAllPage({ params }: Params) {
  const { slug } = await params;
  return await renderPage("/" + slug.join("/"));
}
