import type { Metadata } from "next";
import { renderPage, pageMetadata } from "@/components/page-view";

// "/" routes through the same page system as every other URL (it is a
// block-driven page with full_path='/'). Empty pages show a graceful empty state.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/");
}

export default async function Home() {
  return await renderPage("/");
}
