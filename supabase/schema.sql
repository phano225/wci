


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."increment_page_view"("page_id" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update articles set views = views + 1 where id = page_id;
end;
$$;


ALTER FUNCTION "public"."increment_page_view"("page_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_page_view"("page_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.articles
  SET views = views + 1
  WHERE id = page_id;
END;
$$;


ALTER FUNCTION "public"."increment_page_view"("page_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ads" (
    "id" "text" NOT NULL,
    "title" "text",
    "location" "text",
    "type" "text",
    "content" "text",
    "imageUrl" "text",
    "linkUrl" "text",
    "targetUrl" "text",
    "isActive" boolean,
    "active" boolean,
    "views" integer DEFAULT 0,
    "clicks" integer DEFAULT 0,
    "createdAt" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "text" NOT NULL,
    "title" "text",
    "excerpt" "text",
    "content" "text",
    "category" "text",
    "imageUrl" "text",
    "videoUrl" "text",
    "authorId" "text",
    "authorName" "text",
    "authorAvatar" "text",
    "status" "text",
    "views" integer DEFAULT 0,
    "createdAt" timestamp with time zone DEFAULT "now"(),
    "updatedAt" timestamp with time zone DEFAULT "now"(),
    "submittedBy" "text",
    "submittedAt" timestamp with time zone,
    "reviewedBy" "text",
    "reviewedAt" timestamp with time zone,
    "reviewComments" "text",
    "submissionStatus" "text"
);


ALTER TABLE "public"."articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "text" NOT NULL,
    "name" "text",
    "slug" "text"
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "text" NOT NULL,
    "name" "text",
    "email" "text",
    "subject" "text",
    "message" "text",
    "date" timestamp with time zone DEFAULT "now"(),
    "status" "text"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_links" (
    "id" "text" NOT NULL,
    "platform" "text",
    "url" "text",
    "iconClass" "text",
    "bgColor" "text",
    "textColor" "text"
);


ALTER TABLE "public"."social_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "name" "text",
    "role" "text" DEFAULT 'CONTRIBUTOR'::"text",
    "avatar" "text",
    "createdAt" timestamp with time zone DEFAULT "now"(),
    "lastLogin" timestamp with time zone,
    "active" boolean
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" "text" NOT NULL,
    "title" "text",
    "youtubeId" "text",
    "category" "text",
    "duration" "text",
    "createdAt" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ads"
    ADD CONSTRAINT "ads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_links"
    ADD CONSTRAINT "social_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_articles_authorid" ON "public"."articles" USING "btree" ("authorId");



CREATE INDEX "idx_articles_category" ON "public"."articles" USING "btree" ("category");



CREATE INDEX "idx_articles_createdat_desc" ON "public"."articles" USING "btree" ("createdAt" DESC);



CREATE INDEX "idx_articles_status_createdat" ON "public"."articles" USING "btree" ("status", "createdAt" DESC);



CREATE POLICY "Admin ads manage" ON "public"."ads" USING (true);



CREATE POLICY "Admin articles manage" ON "public"."articles" USING (true);



CREATE POLICY "Admin categories manage" ON "public"."categories" USING (true);



CREATE POLICY "Admin socials manage" ON "public"."social_links" USING (true);



CREATE POLICY "Admin users manage" ON "public"."users" USING (true);



CREATE POLICY "Admin videos manage" ON "public"."videos" USING (true);



CREATE POLICY "Ads are viewable by everyone" ON "public"."ads" FOR SELECT USING (true);



CREATE POLICY "Anyone can insert messages" ON "public"."messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "Articles are viewable by everyone" ON "public"."articles" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can delete articles" ON "public"."articles" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete categories" ON "public"."categories" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert articles" ON "public"."articles" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert categories" ON "public"."categories" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can manage ads" ON "public"."ads" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can manage social links" ON "public"."social_links" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can manage videos" ON "public"."videos" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update articles" ON "public"."articles" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update categories" ON "public"."categories" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update messages" ON "public"."messages" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view messages" ON "public"."messages" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Categories are viewable by everyone" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Public Access Ads" ON "public"."ads" USING (true) WITH CHECK (true);



CREATE POLICY "Public Access Articles" ON "public"."articles" USING (true) WITH CHECK (true);



CREATE POLICY "Public Access Categories" ON "public"."categories" USING (true) WITH CHECK (true);



CREATE POLICY "Public Access Messages" ON "public"."messages" USING (true) WITH CHECK (true);



CREATE POLICY "Public Access Socials" ON "public"."social_links" USING (true) WITH CHECK (true);



CREATE POLICY "Public Access Users" ON "public"."users" USING (true) WITH CHECK (true);



CREATE POLICY "Public Access Videos" ON "public"."videos" USING (true) WITH CHECK (true);



CREATE POLICY "Public articles view" ON "public"."articles" FOR SELECT USING (true);



CREATE POLICY "Public users are viewable by everyone" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Social links are viewable by everyone" ON "public"."social_links" FOR SELECT USING (true);



CREATE POLICY "Users can insert their own profile" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Videos are viewable by everyone" ON "public"."videos" FOR SELECT USING (true);



ALTER TABLE "public"."ads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."increment_page_view"("page_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_page_view"("page_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_page_view"("page_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_page_view"("page_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_page_view"("page_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_page_view"("page_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."ads" TO "anon";
GRANT ALL ON TABLE "public"."ads" TO "authenticated";
GRANT ALL ON TABLE "public"."ads" TO "service_role";



GRANT ALL ON TABLE "public"."articles" TO "anon";
GRANT ALL ON TABLE "public"."articles" TO "authenticated";
GRANT ALL ON TABLE "public"."articles" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."social_links" TO "anon";
GRANT ALL ON TABLE "public"."social_links" TO "authenticated";
GRANT ALL ON TABLE "public"."social_links" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































