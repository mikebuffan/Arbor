import { describe,expect,it } from 'vitest';
import { capturePdfOriginalBytes } from './pdfPageProvenance';
import { originalSourceIdentity } from './sourceVersion';
import { reviewSourceChains,type SourceChainRecord } from './sourceChainReview';
const make=async (url:string,body:string):Promise<SourceChainRecord>=>({
 source:originalSourceIdentity(await capturePdfOriginalBytes({
  sourceUri:url,documentId:'synthetic',bytes:new TextEncoder().encode('%PDF-1.4\\n'+body),declaredPageCount:1,
 })),
 upstreamRecordIds:['synthetic-origin'],originReviewReceiptId:'synthetic-review',
});
describe('source chain independence review (synthetic only)',()=>{
 it('collapses byte-identical mirrors even with distinct chain claims',async()=>{
  const a=await make('https://example.org/a.pdf','fixture');
  const b=await make('https://mirror.example.org/b.pdf','fixture');
  b.upstreamRecordIds=['other'];b.originReviewReceiptId='other-review';
  expect(reviewSourceChains(a,b)).toMatchObject({disposition:'same_content',provenIndependent:false});
 });
 it('holds changed versions at the same location',async()=>{
  const a=await make('https://example.org/a.pdf','fixture');
  const b=await make('https://example.org/a.pdf','changed fixture');
  expect(reviewSourceChains(a,b).disposition).toBe('same_location_changed_content');
 });
 it('holds different PDFs with common upstream',async()=>{
  const a=await make('https://example.org/a.pdf','fixture');
  const b=await make('https://example.net/b.pdf','other fixture');
  expect(reviewSourceChains(a,b).disposition).toBe('shared_upstream');
 });
 it('holds unknown chain and reused review receipts',async()=>{
  const a=await make('https://example.org/a.pdf','fixture');
  const b=await make('https://example.net/b.pdf','other fixture');
  b.upstreamRecordIds=['other'];
  expect(reviewSourceChains(a,b).disposition).toBe('unverified_chain');
  b.originReviewReceiptId=null;
  expect(reviewSourceChains(a,b).disposition).toBe('unverified_chain');
 });
 it('even distinct reviewed chains remain human review candidates, not proof',async()=>{
  const a=await make('https://example.org/a.pdf','fixture');
  const b=await make('https://example.net/b.pdf','other fixture');
  b.upstreamRecordIds=['other'];b.originReviewReceiptId='other-review';
  expect(reviewSourceChains(a,b)).toEqual({disposition:'independence_review_candidate',
   provenIndependent:false,holdReasons:['human_independence_verification_required']});
 });
 it('rejects malformed and duplicate provenance claims',async()=>{
  const a=await make('https://example.org/a.pdf','fixture');
  const b=await make('https://example.net/b.pdf','other fixture');
  expect(()=>reviewSourceChains({...a,upstreamRecordIds:['same',' same ']},b)).toThrow('duplicate_upstream_record_id');
  expect(()=>reviewSourceChains({...a,originReviewReceiptId:' '},b)).toThrow('invalid_origin_review_receipt_id');
 });
});
