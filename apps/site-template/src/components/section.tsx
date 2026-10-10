type Props = {
  id: string;
  /** 英字の小見出し（例: SERVICE） */
  eyebrow: string;
  title: string;
  soft?: boolean;
  children: React.ReactNode;
};

export function Section({ id, eyebrow, title, soft, children }: Props) {
  return (
    <section className={soft ? "bg-brand-soft" : "bg-white"} id={id}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="font-semibold text-brand text-xs tracking-[0.25em]">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-bold text-2xl text-stone-900 sm:text-3xl">
          {title}
        </h2>
        <div className="mt-10 sm:mt-12">{children}</div>
      </div>
    </section>
  );
}
