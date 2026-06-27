/*
 * Align IBE sub-page page.sort_order with brand.sort_order for DB-internal
 * consistency. The sidebar orders IBE products by brand.sort_order (51..57) and
 * is already correct live; page.sort_order held a different, currently-unused
 * order (cockpit=70, rentalcar=20, …) — a hidden inconsistency. This aligns the
 * page order to the brand order so any future consumer of either field agrees.
 * Sidebar (brand.sort_order) is NOT touched → live order unchanged.
 *
 * Brand order: multicheck, cockpit, myTransfer, myBooking, rentalCar, myStats,
 * airLounge (airLounge hidden_in_sidebar per D-043). Idempotent: explicit
 * per-slug UPDATEs with fixed target values; all distinct (no collision).
 */
UPDATE public.pages SET sort_order = 10 WHERE full_path = '/ibe-product-suite/multicheck';
UPDATE public.pages SET sort_order = 20 WHERE full_path = '/ibe-product-suite/cockpit';
UPDATE public.pages SET sort_order = 30 WHERE full_path = '/ibe-product-suite/mytransfer';
UPDATE public.pages SET sort_order = 40 WHERE full_path = '/ibe-product-suite/mybooking';
UPDATE public.pages SET sort_order = 50 WHERE full_path = '/ibe-product-suite/rentalcar';
UPDATE public.pages SET sort_order = 60 WHERE full_path = '/ibe-product-suite/mystats';
UPDATE public.pages SET sort_order = 70 WHERE full_path = '/ibe-product-suite/airlounge';
