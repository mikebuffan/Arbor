-- Firefly pre-Milestone 1B Storage-policy baseline captured read-only on
-- 2026-08-23 with Supabase CLI 2.115.0 from project ncpdlyakrzfvobmwzbon.
--
-- The full storage schema dump also contained Supabase-managed tables, types,
-- functions, owners, and grants. Those platform objects are intentionally not
-- treated as Arbor-owned migration history. This baseline contains only the
-- eight live Arbor chat-attachment policies on storage.objects. The matching
-- private bucket configuration is represented in supabase/config.toml.

CREATE POLICY "chat attachments delete approved own objects" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'chat-attachments'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text") AND (EXISTS ( SELECT 1
   FROM "public"."chat_attachments" "a"
  WHERE (("a"."storage_bucket" = "objects"."bucket_id") AND ("a"."storage_path" = "objects"."name") AND ("a"."user_id" = "auth"."uid"()) AND ("a"."deleted_at" IS NULL))))));

CREATE POLICY "chat attachments delete own files" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'chat-attachments'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));

CREATE POLICY "chat attachments insert approved own objects" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'chat-attachments'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text") AND (EXISTS ( SELECT 1
   FROM "public"."chat_attachments" "a"
  WHERE (("a"."storage_bucket" = "objects"."bucket_id") AND ("a"."storage_path" = "objects"."name") AND ("a"."user_id" = "auth"."uid"()) AND ("a"."status" = 'pending'::"text") AND ("a"."deleted_at" IS NULL) AND ("a"."upload_intent_expires_at" > "now"()) AND (EXISTS ( SELECT 1
           FROM "public"."projects" "p"
          WHERE (("p"."id" = "a"."project_id") AND ("p"."user_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
           FROM "public"."conversations" "c"
          WHERE (("c"."id" = "a"."conversation_id") AND ("c"."user_id" = "auth"."uid"()) AND ("c"."project_id" = "a"."project_id")))))))));

CREATE POLICY "chat attachments insert own files" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'chat-attachments'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));

CREATE POLICY "chat attachments select approved own objects" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'chat-attachments'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text") AND (EXISTS ( SELECT 1
   FROM "public"."chat_attachments" "a"
  WHERE (("a"."storage_bucket" = "objects"."bucket_id") AND ("a"."storage_path" = "objects"."name") AND ("a"."user_id" = "auth"."uid"()) AND ("a"."status" = ANY (ARRAY['pending'::"text", 'uploaded'::"text"])) AND ("a"."deleted_at" IS NULL) AND (EXISTS ( SELECT 1
           FROM "public"."projects" "p"
          WHERE (("p"."id" = "a"."project_id") AND ("p"."user_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
           FROM "public"."conversations" "c"
          WHERE (("c"."id" = "a"."conversation_id") AND ("c"."user_id" = "auth"."uid"()) AND ("c"."project_id" = "a"."project_id")))))))));

CREATE POLICY "chat attachments select own files" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'chat-attachments'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));

CREATE POLICY "chat attachments update approved own objects" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'chat-attachments'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text") AND (EXISTS ( SELECT 1
   FROM "public"."chat_attachments" "a"
  WHERE (("a"."storage_bucket" = "objects"."bucket_id") AND ("a"."storage_path" = "objects"."name") AND ("a"."user_id" = "auth"."uid"()) AND ("a"."status" = ANY (ARRAY['pending'::"text", 'uploaded'::"text"])) AND ("a"."deleted_at" IS NULL)))))) WITH CHECK ((("bucket_id" = 'chat-attachments'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));

CREATE POLICY "chat attachments update own files" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'chat-attachments'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"))) WITH CHECK ((("bucket_id" = 'chat-attachments'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));
