import { cn } from "@/lib/utils";
import { fileKind } from "@/lib/documents-constants";

/**
 * Mini-document + colored format banner for non-image file cards (adapted from
 * 21st.dev urmauur/file-card-collections). Token-remapped: face = bg-surface-strong
 * + ring-hairline (theme-reactive, so no Tailwind `dark:` needed — this app themes
 * via [data-theme] vars, not the `dark` class); content lines = bg-text-1/{20,10,5};
 * banner = the project's --ft-* file-type colors (PDF=torch, etc.).
 *
 * Scoped to the library's real non-image types (pdf, doc/docx, xls/xlsx, csv,
 * ppt/pptx/pps/ppsx, txt, zip). Images never use this — they show real thumbnails.
 */

const FT_VAR: Record<string, string> = {
  pdf: "var(--ft-pdf)",
  word: "var(--ft-word)",
  excel: "var(--ft-excel)",
  ppt: "var(--ft-ppt)",
  zip: "var(--ft-zip)",
  txt: "var(--ft-txt)",
  image: "var(--ft-image)",
  file: "var(--ft-file)",
};

export function FileTypeGraphic({
  extension,
  className,
}: {
  extension: string;
  className?: string;
}) {
  const kind = fileKind(extension); // pdf | word | excel | ppt | image | txt | zip | file
  const banner = FT_VAR[kind] ?? FT_VAR.file;

  let placeholder = <DocLines />;
  if (kind === "excel") placeholder = <SheetGrid />;
  else if (kind === "ppt") placeholder = <Slide />;
  else if (kind === "zip") placeholder = <ZipRows />;

  return (
    <div aria-hidden className={cn("relative size-fit", className)}>
      <div
        className="absolute -right-2 bottom-1.5 z-[2] rounded px-1.5 py-0.5 text-[8px] font-bold uppercase text-white"
        style={{ backgroundColor: banner }}
      >
        {extension}
      </div>
      <div className="relative z-[1] h-18 w-14 overflow-hidden rounded-md bg-surface-strong p-2 ring-1 ring-hairline">
        {placeholder}
      </div>
    </div>
  );
}

/** Default text-document lines (pdf / doc / txt). */
function DocLines() {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="bg-text-1/20 h-0.5 w-1/2 rounded-full" />
      </div>
      {[
        ["w-1/3", "w-1/3"],
        ["w-1/2", "w-1/3"],
        ["w-1/3", "w-1/3"],
        ["w-1/3", "w-1/2"],
      ].map((w, i) => (
        <div key={i} className="flex gap-1">
          <div className={cn("bg-text-1/10 h-0.5 rounded-full", w[0])} />
          <div className={cn("bg-text-1/10 h-0.5 rounded-full", w[1])} />
        </div>
      ))}
      <div className="flex gap-1">
        <div className="bg-text-1/10 h-0.5 w-1/3 rounded-full" />
      </div>
    </div>
  );
}

/** Spreadsheet grid (xls / xlsx / csv). */
function SheetGrid() {
  return (
    <div className="space-y-0.5">
      <div className="grid grid-cols-3 gap-0.5">
        <div className="bg-text-1/20 h-2" />
        <div className="bg-text-1/20 h-2" />
        <div className="bg-text-1/20 h-2" />
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-text-1/5 h-2" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        <div className="bg-text-1/5 h-2" />
        <div className="bg-text-1/5 h-2" />
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        <div className="bg-text-1/5 h-2" />
      </div>
    </div>
  );
}

/** Slide thumbnail (ppt / pptx / pps / ppsx). */
function Slide() {
  return (
    <div className="space-y-1.5">
      <div className="bg-text-1/5 space-y-1 rounded border border-hairline p-1">
        <div className="flex justify-center">
          <div className="size-3 rounded-sm" style={{ backgroundColor: "var(--ft-ppt)", opacity: 0.45 }} />
        </div>
        <div className="bg-text-1/15 mx-auto h-0.5 w-8 rounded-full" />
      </div>
      <div className="flex justify-center gap-1">
        <div className="bg-text-1/15 h-0.5 w-8 rounded-full" />
        <div className="bg-text-1/15 h-0.5 w-4 rounded-full" />
      </div>
      <div className="space-y-1">
        <div className="bg-text-1/15 h-0.5 w-4 rounded-full" />
        <div className="bg-text-1/15 h-0.5 w-5 rounded-full" />
      </div>
    </div>
  );
}

/** Archive rows (zip). */
function ZipRows() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex overflow-hidden rounded-full">
            <div className={cn("size-1.5", i % 2 === 0 ? "bg-text-1/20" : "bg-text-1/5")} />
            <div className={cn("size-1.5", i % 2 === 0 ? "bg-text-1/5" : "bg-text-1/20")} />
          </div>
        ))}
      </div>
    </div>
  );
}
