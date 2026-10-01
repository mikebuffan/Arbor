\set ON_ERROR_STOP on

insert into public.arbor_research_ocr_receipts
(owner_id,project_id,receipt_key,document_key,physical_page,original_bytes_sha256,
 image_bytes_sha256,engine,engine_version,source_kind,page_pixel_width,page_pixel_height,
 extracted_text,mean_confidence)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'ocr-1','doc-ocr',1,repeat('a',64),repeat('b',64),'synthetic-ocr','1','handwritten',
 100,100,'J. Example',0.65)
returning id as ocr_id \gset

insert into public.arbor_research_ocr_tokens
(owner_id,project_id,ocr_receipt_id,token_key,token_text,confidence,x,y,width,height)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 :'ocr_id','t1','J.',0.7,5,10,10,8),
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 :'ocr_id','t2','Example',0.6,20,10,30,8);

insert into public.arbor_research_ocr_reviews
(owner_id,project_id,review_key,ocr_receipt_id,reviewer_ref,reviewed_at,decision,corrected_text,correction_notes)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'ocr-review-1',:'ocr_id','synthetic-human',now(),'corrected','J. Exemple','synthetic correction');

do $immut$
begin
  begin
    update public.arbor_research_ocr_receipts set extracted_text='rewritten' where receipt_key='ocr-1';
    raise exception 'ocr receipt history rewrite succeeded';
  exception when object_not_in_prerequisite_state then null;
  end;
end
$immut$;

insert into public.arbor_research_table_reconstructions
(owner_id,project_id,table_key,page_hash,row_count,column_count,row_tolerance_px,column_tolerance_px)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'table-1',repeat('c',64),2,2,8,25)
returning id as table_id \gset

insert into public.arbor_research_table_cells
(owner_id,project_id,table_id,row_index,column_index,cell_text,token_ids,source_refs,x,y,width,height)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 :'table_id',0,0,'Name','["a"]'::jsonb,'["page:1:a"]'::jsonb,10,10,30,10),
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 :'table_id',0,1,'Amount','["b"]'::jsonb,'["page:1:b"]'::jsonb,120,10,40,10),
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 :'table_id',1,0,'Alpha','["c"]'::jsonb,'["page:1:c"]'::jsonb,10,40,30,10),
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 :'table_id',1,1,'$10','["d"]'::jsonb,'["page:1:d"]'::jsonb,120,40,20,10);

insert into public.arbor_research_retrieval_records
(owner_id,project_id,record_key,searchable_text,identifiers,source_refs,text_sha256,embedding_model_ref,embedding_vector)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'retrieval-1','flight schedule for aircraft N550MS','["N550MS"]'::jsonb,'["page:1"]'::jsonb,
 repeat('d',64),'synthetic-vector-v1','[0.95,0.05]'::jsonb);

insert into public.arbor_research_document_family_edges
(owner_id,project_id,edge_key,left_document_key,right_document_key,edge_type,basis,source_refs)
values
('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
 'family-edge-1','email-1','email-2','reply_to','in_reply_to_message_id','["p1","p2"]'::jsonb);

do $assert$
begin
  if (select count(*) from public.arbor_research_ocr_tokens where ocr_receipt_id=(select id from public.arbor_research_ocr_receipts where receipt_key='ocr-1')) <> 2
  then raise exception 'ocr token persistence mismatch'; end if;

  if (select extracted_text from public.arbor_research_ocr_receipts where receipt_key='ocr-1') <> 'J. Example'
  then raise exception 'ocr original was overwritten'; end if;

  if (select corrected_text from public.arbor_research_ocr_reviews where review_key='ocr-review-1') <> 'J. Exemple'
  then raise exception 'ocr correction receipt missing'; end if;

  if (select count(*) from public.arbor_research_table_cells where table_id=(select id from public.arbor_research_table_reconstructions where table_key='table-1')) <> 4
  then raise exception 'table cell persistence mismatch'; end if;

  if not exists(
    select 1 from public.arbor_research_retrieval_records
    where record_key='retrieval-1'
      and search_vector @@ plainto_tsquery('simple','flight aircraft')
      and source_refs @> '["page:1"]'::jsonb
  ) then raise exception 'retrieval source-anchored FTS mismatch'; end if;

  if (select status from public.arbor_research_document_family_edges where edge_key='family-edge-1')
     <> 'explicit_or_deterministic_link'
  then raise exception 'document family edge status mismatch'; end if;
end
$assert$;

select 'CORPUS_INTELLIGENCE_V2_PERSISTENCE=PASS' as result;
