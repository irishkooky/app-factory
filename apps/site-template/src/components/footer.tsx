import { site } from "~/site.config";

export function Footer() {
  const { company, contact } = site;

  return (
    <footer className="bg-stone-900 text-stone-400">
      <div className="mx-auto max-w-6xl px-5 py-10 text-sm sm:px-8">
        <p className="font-bold text-base text-white">{company.name}</p>
        <p className="mt-2">
          {contact.postalCode && `〒${contact.postalCode} `}
          {contact.address}
        </p>
        <p className="mt-1">TEL {contact.phone}</p>
        <p className="mt-6 text-stone-500 text-xs">
          © {new Date().getFullYear()} {company.name}
        </p>
      </div>
    </footer>
  );
}
