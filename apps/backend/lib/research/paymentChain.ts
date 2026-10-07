export type PaymentEvidenceKind =
  | "witness_report" | "receipt" | "ledger" | "bank_transaction" | "atm_withdrawal"
  | "reimbursement" | "household_book" | "staff_record" | "invoice" | "other";

export type PaymentEvidence = {
  evidenceRef:string;
  sourceFamilyId:string;
  paymentRef:string;
  kind:PaymentEvidenceKind;
  amount:number|null;
  currency:string|null;
  payerEntityId:string|null;
  payeeEntityId:string|null;
};

export type PaymentChainAssessment = {
  paymentRef:string;
  status:"witness_only"|"cash_availability_only"|"transaction_record_support"|"direct_linked_payment_record"|"conflicting_records";
  evidenceRefs:readonly string[];
  sourceFamilyIds:readonly string[];
  directTransactionRefs:readonly string[];
  cashAvailabilityRefs:readonly string[];
  witnessRefs:readonly string[];
  contradictions:readonly string[];
  note:"cash_withdrawal_does_not_prove_payment";
};

const req=(v:unknown,k:string,max=1000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_payment_"+k);
  return v.trim();
};
const opt=(v:string|null,k:string)=>v===null?null:req(v,k,300);
const uniq=(v:readonly string[])=>[...new Set(v)].sort();
const directKinds=new Set<PaymentEvidenceKind>(["receipt","ledger","bank_transaction","reimbursement","household_book","staff_record"]);

export function assessPaymentChains(input:readonly PaymentEvidence[]):readonly PaymentChainAssessment[]{
  const rows=input.map(r=>{
    if(r.amount!==null&&(!Number.isFinite(r.amount)||r.amount<0))throw new Error("invalid_payment_amount");
    return {...r,evidenceRef:req(r.evidenceRef,"evidence_ref"),sourceFamilyId:req(r.sourceFamilyId,"source_family_id"),
      paymentRef:req(r.paymentRef,"payment_ref"),currency:opt(r.currency,"currency"),
      payerEntityId:opt(r.payerEntityId,"payer"),payeeEntityId:opt(r.payeeEntityId,"payee")};
  });
  if(new Set(rows.map(r=>r.evidenceRef)).size!==rows.length)throw new Error("duplicate_payment_evidence_ref");
  const groups=new Map<string,typeof rows>();for(const r of rows)groups.set(r.paymentRef,[...(groups.get(r.paymentRef)??[]),r]);
  return [...groups.entries()].map(([paymentRef,g])=>{
    const direct=g.filter(r=>directKinds.has(r.kind)),cash=g.filter(r=>r.kind==="atm_withdrawal"),witness=g.filter(r=>r.kind==="witness_report");
    const contradictions:string[]=[];
    const amounts=uniq(direct.filter(r=>r.amount!==null&&r.currency).map(r=>r.currency+":"+r.amount));
    if(amounts.length>1)contradictions.push("conflicting_direct_amounts");
    const parties=uniq(direct.filter(r=>r.payerEntityId&&r.payeeEntityId).map(r=>r.payerEntityId+"→"+r.payeeEntityId));
    if(parties.length>1)contradictions.push("conflicting_direct_parties");
    let status:PaymentChainAssessment["status"]="witness_only";
    if(contradictions.length)status="conflicting_records";
    else if(direct.some(r=>r.payerEntityId&&r.payeeEntityId))status="direct_linked_payment_record";
    else if(direct.length)status="transaction_record_support";
    else if(cash.length)status="cash_availability_only";
    return {paymentRef,status,evidenceRefs:uniq(g.map(r=>r.evidenceRef)),sourceFamilyIds:uniq(g.map(r=>r.sourceFamilyId)),
      directTransactionRefs:uniq(direct.map(r=>r.evidenceRef)),cashAvailabilityRefs:uniq(cash.map(r=>r.evidenceRef)),
      witnessRefs:uniq(witness.map(r=>r.evidenceRef)),contradictions:uniq(contradictions),
      note:"cash_withdrawal_does_not_prove_payment" as const};
  }).sort((a,b)=>a.paymentRef.localeCompare(b.paymentRef));
}
