import Link from "next/link";
import { reviewPacketStats, type ReviewPacket } from "@/lib/research/reviewWorkbench";

const packet:ReviewPacket={
  packetId:"synthetic-review-packet",
  title:"Synthetic evidence review packet",
  source:{
    documentId:"synthetic-doc-001",
    physicalPage:12,
    originalBytesSha256:"a".repeat(64),
    pageHash:"b".repeat(64),
    sourceRefs:["synthetic:release:1:page:12"],
  },
  extractedText:"Synthetic text-layer extraction. No live investigation material is loaded on this page.",
  ocr:{
    receiptId:"synthetic-ocr-1",
    text:"Synthetic OCR candidate text.",
    meanConfidence:.74,
    reviewStatus:"hold_for_human_ocr_and_original_image_review",
  },
  tableCandidates:[{tableId:"synthetic-table-1",rowCount:4,columnCount:5,status:"candidate_requires_visual_review"}],
  identityCandidates:[
    {candidateId:"candidate-a",label:"J. Example",status:"ambiguous",basisMentionIds:["mention-1","mention-2"]},
    {candidateId:"candidate-b",label:"Example Holdings",status:"candidate",basisMentionIds:["mention-3"]},
  ],
  contradictions:[
    {conflictId:"conflict-1",reason:"synthetic incompatible timestamp example",evidenceRefs:["synthetic:a","synthetic:b"]},
  ],
  releaseVariants:[
    {releaseId:"release-a",changed:false,redactionChangeCount:0},
    {releaseId:"release-b",changed:true,redactionChangeCount:2},
  ],
  visualAssets:[
    {assetId:"visual-1",kind:"scan",exhibitLabel:"Synthetic Exhibit A",reviewStatus:"hold_for_visual_source_and_privacy_review"},
  ],
  privacyFlagIds:["synthetic-privacy-hold"],
  publicationStatus:"hold",
};
const stats=reviewPacketStats(packet);

function badge(value:string){
  return <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-zinc-400">{value.replaceAll("_"," ")}</span>;
}
function card(title:string,children:React.ReactNode){
  return <section className="rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 md:p-6">
    <div className="mb-4 text-xs uppercase tracking-[0.2em] text-zinc-500">{title}</div>{children}
  </section>;
}

export default function ResearchReviewPage(){
  return <main className="min-h-screen bg-[#050607] text-zinc-100">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(88,190,255,.13),transparent_34%),radial-gradient(circle_at_85%_25%,rgba(244,114,182,.12),transparent_30%),linear-gradient(to_bottom,#050607,#09090b_55%,#050607)]"/>
    <div className="relative mx-auto max-w-[1600px] px-5 py-8 md:px-10 md:py-12">
      <header className="mb-7 flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.34em] text-sky-300/70">
            <span className="h-px w-10 bg-sky-300/50"/> Firefly / investigation review
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.035em] md:text-6xl">Evidence Review Workbench</h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-zinc-400">
            Original-source review, extraction comparison, identity holds, contradictions, release deltas,
            OCR, structured records, and visual exhibits. Review actions create receipts; they never rewrite source evidence.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/vault" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-white">Vault</Link>
          <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-white">Home</Link>
        </div>
      </header>

      <div className="mb-7 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100">
        <strong>Synthetic UI acceptance only.</strong> No live Epstein/EFTA evidence, victim/private-person data, production review writes,
        or publication authority is connected to this screen.
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Unresolved identities",stats.unresolvedIdentities],
          ["Contradictions",stats.contradictions],
          ["Changed releases",stats.changedReleaseVariants],
          ["Structured tables",stats.tableCandidates],
          ["Privacy holds",stats.privacyFlags],
        ].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</div>
          <div className="mt-2 text-2xl font-medium">{value}</div>
        </div>)}
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.25fr_.95fr]">
        <div className="space-y-6">
          {card("Original source",<div>
            <div className="flex flex-wrap gap-2">{badge("HOLD")}{badge("physical page "+packet.source.physicalPage)}</div>
            <div className="mt-4 grid gap-2 font-mono text-[11px] leading-5 text-zinc-500">
              <div>document: {packet.source.documentId}</div>
              <div>original sha: {packet.source.originalBytesSha256}</div>
              <div>page hash: {packet.source.pageHash}</div>
              <div>source: {packet.source.sourceRefs.join(" · ")}</div>
            </div>
            <div className="mt-5 flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/30 text-center text-sm text-zinc-600">
              Original rendered page image appears here only after an authorized page-image source is connected.
            </div>
          </div>)}

          <div className="grid gap-6 lg:grid-cols-2">
            {card("Text layer",<div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4 text-sm leading-7 text-zinc-300">{packet.extractedText}</div>)}
            {card("OCR candidate",packet.ocr?<div>
              <div className="mb-3 flex flex-wrap gap-2">{badge(packet.ocr.reviewStatus)}{packet.ocr.meanConfidence!==null&&badge(String(Math.round(packet.ocr.meanConfidence*100))+"% machine confidence")}</div>
              <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4 text-sm leading-7 text-zinc-300">{packet.ocr.text}</div>
            </div>:<p className="text-sm text-zinc-500">No OCR candidate.</p>)}
          </div>

          {card("Contradictions & release deltas",<div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-3">{packet.contradictions.map(c=><article key={c.conflictId} className="rounded-2xl border border-rose-300/10 bg-rose-300/[0.03] p-4">
              <div className="flex gap-2">{badge("unresolved contradiction")}</div><p className="mt-3 text-sm leading-6 text-zinc-300">{c.reason}</p>
              <div className="mt-2 font-mono text-[10px] text-zinc-600">{c.evidenceRefs.join(" · ")}</div>
            </article>)}</div>
            <div className="space-y-3">{packet.releaseVariants.map(r=><article key={r.releaseId} className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3"><span className="font-medium">{r.releaseId}</span>{badge(r.changed?"changed":"unchanged")}</div>
              <div className="mt-2 text-xs text-zinc-500">redaction changes: {r.redactionChangeCount}</div>
            </article>)}</div>
          </div>)}
        </div>

        <div className="space-y-6">
          {card("Identity resolution",<div className="space-y-3">{packet.identityCandidates.map(i=><article key={i.candidateId} className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3"><div className="font-medium">{i.label}</div>{badge(i.status)}</div>
            <div className="mt-2 text-xs text-zinc-600">{i.basisMentionIds.join(" · ")}</div>
          </article>)}</div>)}

          {card("Structured records",<div className="space-y-3">{packet.tableCandidates.map(t=><article key={t.tableId} className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
            <div className="flex items-center justify-between"><span className="font-medium">{t.tableId}</span>{badge(t.status)}</div>
            <div className="mt-2 text-xs text-zinc-500">{t.rowCount} rows × {t.columnCount} columns</div>
          </article>)}</div>)}

          {card("Visual exhibits",<div className="space-y-3">{packet.visualAssets.map(v=><article key={v.assetId} className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3"><span className="font-medium">{v.exhibitLabel??v.assetId}</span>{badge(v.kind)}</div>
            <div className="mt-2">{badge(v.reviewStatus)}</div>
          </article>)}</div>)}

          {card("Review actions",<div>
            <p className="mb-4 text-sm leading-6 text-zinc-500">Controls are intentionally non-writing in this synthetic screen. Production actions will append review receipts after database security/integration approval.</p>
            <div className="grid grid-cols-2 gap-2">
              {["Confirm extraction","Reject alias","Hold identity","Mark derivative source","Open Roundabout","Accept OCR candidate","Reject table candidate","Accept visual observation"].map(label=><button key={label} disabled className="min-h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-left text-xs text-zinc-500 disabled:cursor-not-allowed">{label}</button>)}
            </div>
          </div>)}
        </div>
      </div>

      <footer className="mt-8 border-t border-white/[0.07] pt-5 text-xs leading-5 text-zinc-600">
        Association is not conduct. Missingness is a lead, not proof. OCR and table reconstruction remain secondary extraction. Every substantive conclusion stays HOLD until its source chain, identity, privacy, and counterevidence review is complete.
      </footer>
    </div>
  </main>;
}
