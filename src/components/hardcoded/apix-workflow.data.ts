/**
 * APIX Workflow — content & config extracted from apix-workflow.tsx (WF-08).
 * The 22-node diagram copy (DATA), graph topology (CONNS), box layout
 * (SOURCES/MODULES), colour themes, icon map, and Supabase image URLs. Edit
 * here without touching the drag / SVG-line engine. Identifiers keep their names.
 */

import { type ComponentType } from "react";
import {
  FileText, CreditCard, Sparkles, Tags, Route, Luggage, RotateCcw, Receipt,
  Combine, CircleCheck, Database, CalendarClock, Accessibility, ArrowLeftRight,
  Briefcase, UserRound,
} from "lucide-react";

export type IconC = ComponentType<{ className?: string }>;

// Supabase public-URL base for the migrated diagram images (apix/workflow/).
export const SB_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/apix/workflow/`;
export const IMG: Record<string, string> = {
  charter: SB_BASE + "charter.png",
  fullcharter: SB_BASE + "full-charter.png",
  scheduled: SB_BASE + "scheduled-flights.png",
  ndc: SB_BASE + "ndc-direct.png",
  leftover: SB_BASE + "left-over-seats.png",
};
export const CUSTOMERS_BG = SB_BASE + "customers-bg.jpg";

// Lucide icon component per node id (verbatim id→name map from the original).
export const ICONS: Record<string, IconC> = {
  content: FileText, payment: CreditCard, features: Sparkles,
  volumedeals: Tags, conditions: Route, luggage: Luggage,
  refund: RotateCcw, invoicing: Receipt,
  multiairline: Combine, checkin: CircleCheck, cache: Database,
  schedule: CalendarClock, ssr: Accessibility, oneway: ArrowLeftRight,
  b2b: Briefcase, b2c: UserRound,
};

// Per-module color themes — content blue, payment green, features orange (CONTENT).
export type Theme = { c: string; soft: string; g1: string; g2: string };
export const THEME: Record<string, Theme> = {
  content: { c: "#0A82DF", soft: "#EFF6FE", g1: "#EFF6FE", g2: "#CFE4F9" },
  payment: { c: "#16a34a", soft: "#ECFDF3", g1: "#ECFDF3", g2: "#C3EFD3" },
  features: { c: "#EA580C", soft: "#FFF3EC", g1: "#FFF4ED", g2: "#FBD7BE" },
};

export interface NodeData { b: string; t: string; d: string; img?: string; items?: string[]; parent?: string }

// Node content + copy — ported VERBATIM from the original.
export const DATA: Record<string, NodeData> = {
  charter: { b: "Source · Inventory", t: "Charter Flights", img: "charter", d: "<p>Exclusive seat blocks contracted directly with charter operators. airtuerk negotiates dedicated allocations on charter aircraft, giving partners reliable access to inventory not available through traditional channels.</p><p>Especially valuable for seasonal routes and tour-operator-friendly destinations where guaranteed capacity beats market availability.</p>" },
  fullcharter: { b: "Source · Inventory", t: "Full-Charter", img: "fullcharter", d: "<p>Complete aircraft chartered by airtuerk for specific routes or programs. Used when partners need guaranteed capacity at scale — high-volume holiday routes, group movements, or seasonal peaks where every seat counts.</p><p>APIX exposes these capacity blocks alongside scheduled inventory, so partners can sell from a single search.</p>" },
  scheduled: { b: "Source · Inventory", t: "Scheduled Flights", img: "scheduled", d: "<p>IATA-published commercial routes from scheduled airlines worldwide. Connected via direct GDS feeds and cached for sub-second response times.</p><p>The standard backbone for any travel platform — every major destination, every major carrier, in real time.</p>" },
  ndc: { b: "Source · Inventory", t: "NDC + Direct Connections", img: "ndc", d: "<p>Direct connections to airline NDC (New Distribution Capability) feeds and direct API integrations. Goes beyond traditional GDS to deliver richer content, branded fares, ancillaries, and dynamic pricing.</p><p>Currently includes Lufthansa, SWISS and other NDC-enabled carriers, with new connections added continuously.</p>" },
  leftover: { b: "Source · Inventory", t: "Left Over Seats", img: "leftover", d: "<p>Last-minute unsold inventory aggregated from multiple sources. Often available at discounted rates and ideal for flash-deal platforms, last-minute booking engines, and opportunistic resellers.</p><p>APIX surfaces these seats automatically as they become available — no separate integration required.</p>" },
  streaming: { b: "Infrastructure", t: "Data Streaming", d: "<p>The real-time aggregation layer that brings every source into a unified data stream. Continuous price updates, availability changes, and schedule modifications flow through here before they reach the gateway.</p><p>This is what makes APIX feel instant — no batch jobs, no stale data, no waiting for nightly syncs.</p>" },
  content: { b: "Module · Content", t: "Content Module", d: "<p>Pricing rules, route-specific conditions, and baggage configuration — all the commercial logic that turns raw inventory into a sellable product.</p><p>APIX lets partners configure custom content rules per market or even per individual customer.</p>", items: ["volumedeals", "conditions", "luggage"] },
  volumedeals: { b: "Content · Pricing", t: "Volume Deals", d: "<p>Negotiated bulk-rate agreements for partners with significant booking volume. Discounts, override commissions, and custom pricing tiers are applied automatically based on partner ID.</p><p>No manual handling required — partners just integrate once and the right pricing flows through every search and booking.</p>", parent: "content" },
  conditions: { b: "Content · Pricing", t: "Route-specific conditions", d: "<p>Custom rules applied to individual routes. Different fare logic for high-demand corridors, seasonal pricing, or restricted-distribution markets — all configurable without code changes.</p>", parent: "content" },
  luggage: { b: "Content · Ancillaries", t: "Luggage handling", d: "<p>Configurable baggage rules per fare class, route, or partner. APIX surfaces included baggage allowances, paid options, and bag policies consistently across all connected products.</p><p>Eliminates the manual lookup partners would otherwise need against airline-specific baggage tables.</p>", parent: "content" },
  payment: { b: "Module · Payment", t: "Payment Module", d: "<p>Transaction infrastructure built into APIX. Handles the full payment lifecycle — collection, processing, refunds, and partner-specific billing arrangements like invoicing for B2B accounts.</p>", items: ["refund", "invoicing"] },
  refund: { b: "Payment · Automation", t: "Automatic refund feature", d: "<p>Self-service refund flows triggered by cancellation events. Refund eligibility is calculated against fare rules and processed without manual intervention.</p><p>Cuts agency support load significantly — what used to be a back-office task is now an instant API call.</p>", parent: "payment" },
  invoicing: { b: "Payment · Methods", t: "Invoicing + Card payments", d: "<p>Multiple payment paths in one API. Credit card processing for direct B2C bookings, monthly invoicing for B2B partners with credit lines.</p><p>Partners choose what fits their flow without building separate payment integrations.</p>", parent: "payment" },
  features: { b: "Module · Operations", t: "Features Module", d: "<p>Operational tools that make APIX useful day-to-day. Multi-airline ticketing, online check-in, schedule-change automation, special service requests — the heavy lifting that would otherwise require separate integrations is built in.</p>", items: ["multiairline", "checkin", "cache", "schedule", "ssr", "oneway", "b2b", "b2c"] },
  multiairline: { b: "Features · Itinerary", t: "Multiple Airline combination", d: "<p>Combine segments from different carriers into a single itinerary — including mixed scheduled + charter combinations. Pricing and ticketing handled automatically.</p>", parent: "features" },
  checkin: { b: "Features · Service", t: "Online check-in function", d: "<p>Trigger check-in workflows from the partner's interface. APIX brokers the request to the operating airline and returns boarding pass data when available.</p>", parent: "features" },
  cache: { b: "Features · Performance", t: "Cache data query", d: "<p>Fast-lookup endpoint that reads from APIX's cached availability layer. Sub-100ms response for high-frequency queries like search-result enrichment.</p>", parent: "features" },
  schedule: { b: "Features · Automation", t: "Automated schedule change", d: "<p>When carriers update timetables, APIX detects affected bookings, notifies partners, and offers reaccommodation options — all without manual intervention from agents.</p>", parent: "features" },
  ssr: { b: "Features · Service", t: "SSR booking function", d: "<p>Special Service Requests — wheelchair, meal preferences, infant seats — booked through the same API call as the flight itself. No second integration required.</p>", parent: "features" },
  oneway: { b: "Features · Pricing", t: "OneWay + Return content", d: "<p>Smart fare construction that combines one-way and return inventory to create the cheapest possible itinerary, even when traditional return fares would be more expensive.</p>", parent: "features" },
  b2b: { b: "Features · Tools", t: "B2B Management tool", d: "<p>Admin interface for B2B partners to manage their bookings, refunds, billing, and settings — browser-based UI sitting on top of the same APIX endpoints.</p>", parent: "features" },
  b2c: { b: "Features · Tools", t: "B2C Management tool", d: "<p>White-label B2C booking management interface for end-customer self-service. Customers can view bookings, request refunds, and manage extras.</p>", parent: "features" },
  gateway: { b: "Core", t: "airtuerk API Gateway", d: "<p>The single REST endpoint that exposes everything — every source, every module, every feature — through one consistent API.</p><p>Authentication, rate limiting, versioning, and documentation all sit at this layer. <strong>One integration replaces a dozen.</strong></p>" },
  customers: { b: "Endpoint · Partners", t: "Connected partners", d: "<p>APIX is built for travel businesses that need flight inventory programmatically:</p><ul><li><strong>Online Travel Agencies</strong> — power flight search and booking on consumer sites</li><li><strong>Tour Operators</strong> — combine flights with hotel/package inventory</li><li><strong>B2B Portals</strong> — give travel agents access under their own brand</li><li><strong>Booking Engines</strong> — embed flight booking into corporate travel tools</li></ul>" },
};

// Global prev/next order for the modal (content → payment → features items).
export const ITEM_ORDER: string[] = ["volumedeals", "conditions", "luggage", "refund", "invoicing", "multiairline", "checkin", "cache", "schedule", "ssr", "oneway", "b2b", "b2c"];

// Connections (gateway links render in the darker "ax-dark" palette).
export const CONNS: [string, string][] = [
  ["ndc", "streaming"], ["scheduled", "streaming"], ["fullcharter", "streaming"], ["charter", "streaming"], ["leftover", "streaming"],
  ["streaming", "content"], ["streaming", "payment"], ["streaming", "features"],
  ["content", "gateway"], ["payment", "gateway"], ["features", "gateway"], ["gateway", "customers"],
];

// Box layout — data-x/data-y from the original markup.
export const SOURCES = [
  { id: "ndc", x: 40, y: 30, label: "NDC + Direct", img: "ndc" },
  { id: "scheduled", x: 40, y: 195, label: "Scheduled Flights", img: "scheduled" },
  { id: "fullcharter", x: 40, y: 360, label: "Full-Charter", img: "fullcharter" },
  { id: "charter", x: 40, y: 525, label: "Charter", img: "charter" },
  { id: "leftover", x: 40, y: 690, label: "Left Over Seats", img: "leftover" },
];
export const MODULES = [
  { id: "content", theme: "content", x: 560, y: 60, title: "Content", items: [
    { id: "volumedeals", label: "Volume Deals" }, { id: "conditions", label: "Special conditions for specific routes" }, { id: "luggage", label: "Luggage" },
  ] },
  { id: "features", theme: "features", x: 980, y: 60, title: "Features", items: [
    { id: "multiairline", label: "Multiple Airline combination" }, { id: "checkin", label: "Online check-in function" }, { id: "cache", label: "Cache data query" },
    { id: "schedule", label: "Automated schedule change" }, { id: "ssr", label: "SSR booking function" }, { id: "oneway", label: "OneWay + Return content" },
    { id: "b2b", label: "B2B Management tool" }, { id: "b2c", label: "B2C Management tool" },
  ] },
  { id: "payment", theme: "payment", x: 760, y: 565, title: "Payment", items: [
    { id: "refund", label: "Automatic refund feature" }, { id: "invoicing", label: "Incl. Invoicing + CC payment" },
  ] },
];

export function themeFor(id: string): Theme {
  if (THEME[id]) return THEME[id];
  const d = DATA[id];
  if (d?.parent && THEME[d.parent]) return THEME[d.parent];
  return THEME.content;
}
