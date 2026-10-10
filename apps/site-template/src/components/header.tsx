"use client";

import { Menu, Phone, X } from "lucide-react";
import { useState } from "react";
import { site } from "~/site.config";
import { NAV_ITEMS } from "./nav-items";

export function Header() {
  const [open, setOpen] = useState(false);
  const items = NAV_ITEMS.flatMap((item) => {
    if (item.id !== "works") return [item];
    return site.gallery?.photos.length ? [{ ...item, title: site.gallery.title }] : [];
  });

  return (
    <header className="sticky top-0 z-40 border-stone-200 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <a className="font-bold text-lg text-stone-900 sm:text-xl" href="#top">
          {site.company.shortName}
        </a>

        <nav className="hidden items-center gap-6 lg:flex">
          {items.map((item) => (
            <a
              className="font-medium text-sm text-stone-600 transition-colors hover:text-brand"
              href={`#${item.id}`}
              key={item.id}
            >
              {item.title}
            </a>
          ))}
          <a
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 font-semibold text-sm text-white transition-colors hover:bg-brand-dark"
            href={`tel:${site.contact.phone.replaceAll("-", "")}`}
          >
            <Phone className="h-4 w-4" />
            {site.contact.phone}
          </a>
        </nav>

        <button
          aria-expanded={open}
          aria-label={open ? "メニューを閉じる" : "メニューを開く"}
          className="rounded-md p-2 text-stone-700 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-stone-200 border-t bg-white px-5 pb-4 lg:hidden">
          {items.map((item) => (
            <a
              className="block border-stone-100 border-b py-3 font-medium text-stone-700"
              href={`#${item.id}`}
              key={item.id}
              onClick={() => setOpen(false)}
            >
              {item.title}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
