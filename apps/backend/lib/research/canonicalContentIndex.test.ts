import { describe,expect,it } from 'vitest';
import { capturePdfOriginalBytes } from './pdfPageProvenance';
import { originalSourceIdentity } from './sourceVersion';
import { canonicalContentIndex,scopedCanonicalAliases,type ScopedSourceAlias } from './canonicalContentIndex';
const alias=async(ownerId:string,projectId:string,localRecordId:string,url:string,body='synthetic fixture'):Promise<ScopedSourceAlias>=>({
 ownerId,projectId,localRecordId,identity:originalSourceIdentity(await capturePdfOriginalBytes({
 sourceUri:url,documentId:localRecordId,bytes:new TextEncoder().encode('%PDF-1.4\\n'+body),declaredPageCount:1,
 })),
});
describe('pure canonical content index',()=>{
 it('groups byte-identical mirrors without sharing cross-project aliases',async()=>{
  const a=await alias('owner-a','project-a','a','https://example.org/a.pdf');
  const b=await alias('owner-b','project-b','b','https://mirror.example.net/b.pdf');
  const groups=canonicalContentIndex([b,a]);
  expect(groups).toHaveLength(1);
  expect(groups[0].aliases).toHaveLength(2);
  expect(scopedCanonicalAliases(groups,'owner-a','project-a')).toHaveLength(1);
  expect(scopedCanonicalAliases(groups,'owner-b','project-b')[0].localRecordId).toBe('b');
  expect(scopedCanonicalAliases(groups,'owner-a','project-b')).toEqual([]);
 });
 it('separates changed content at same URL',async()=>{
  const a=await alias('a','p','1','https://example.org/a.pdf');
  const b=await alias('a','p','2','https://example.org/a.pdf','changed');
  expect(canonicalContentIndex([a,b])).toHaveLength(2);
 });
 it('is stable under input permutation',async()=>{
  const a=await alias('a','p','1','https://example.org/a.pdf');
  const b=await alias('b','p','2','https://mirror.example.org/a.pdf');
  expect(canonicalContentIndex([a,b])).toEqual(canonicalContentIndex([b,a]));
 });
 it('rejects duplicate scoped ids and malformed scope',async()=>{
  const a=await alias('a','p','1','https://example.org/a.pdf');
  expect(()=>canonicalContentIndex([a,a])).toThrow('duplicate_scoped_source_record');
  expect(()=>canonicalContentIndex([{...a,ownerId:' '}])).toThrow('invalid_owner_id');
 });
 it('rejects inconsistent page counts for identical bytes',async()=>{
  const a=await alias('a','p','1','https://example.org/a.pdf');
  const b=await alias('a','p','2','https://mirror.example.org/a.pdf');
  b.identity={...b.identity,physicalPdfPageCount:2};
  expect(()=>canonicalContentIndex([a,b])).toThrow('source_same_bytes_page_count_conflict');
 });
});
