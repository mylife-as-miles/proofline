"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { loadPdf } from "@/lib/store";

/** pdf.js draws the pages, with its worker served by the app. */
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * The original pages of a text that came from a PDF, drawn by pdf.js. Only
 * there when this browser kept the file, which it does on import.
 */
export default function PdfPages({ articleId }: { articleId: string }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    let live = true;
    void loadPdf(articleId).then((b) => live && setBlob(b));
    return () => {
      live = false;
    };
  }, [articleId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
      if (e.key === "ArrowRight") setPage((p) => Math.min(pages || p, p + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pages]);

  if (!blob) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setWidth(Math.min(760, window.innerWidth - 32));
          setOpen(true);
        }}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-rule px-3.5 text-[13px] font-medium text-ink-2 transition-[border-color,color,transform] hover:border-rule-strong hover:text-ink active:scale-[0.97]"
      >
        Pages
      </button>

      {open && (
        <div className="fixed inset-0 z-[95] flex flex-col bg-bg/95 backdrop-blur-sm" style={{ animation: "fade 0.15s" }}>
          <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
            <p className="text-[13px] text-ink-3">
              {pages ? `Page ${page} of ${pages}` : "Opening…"}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
                className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunk hover:text-ink disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pages || p, p + 1))}
                disabled={!pages || page >= pages}
                aria-label="Next page"
                className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunk hover:text-ink disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="ml-2 grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-4 py-6">
            <div className="mx-auto w-fit">
              <Document
                file={blob}
                onLoadSuccess={(d) => setPages(d.numPages)}
                loading={<div className="h-[420px] w-[320px] animate-pulse rounded-[4px] bg-sunk" />}
                error={<p className="text-[13px] text-ink-3">This PDF could not be drawn.</p>}
              >
                <Page pageNumber={page} width={width} renderTextLayer={false} renderAnnotationLayer={false} className="overflow-hidden rounded-[3px] shadow-pop" />
              </Document>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
