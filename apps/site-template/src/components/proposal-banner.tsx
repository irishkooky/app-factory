import { site } from "~/site.config";

export function ProposalBanner() {
  return (
    <div className="bg-stone-900 px-4 py-2 text-center text-stone-100 text-xs sm:text-sm">
      このページは{site.company.name}様へのご提案用に{site.site.proposedBy}
      が作成したサンプルです。掲載内容は公開情報をもとにした仮のものです。
    </div>
  );
}
