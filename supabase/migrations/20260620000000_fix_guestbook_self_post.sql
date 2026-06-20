-- migration: fix_guestbook_self_post.sql
-- Remove the self-posting restriction from the guestbook_post INSERT policy

DROP POLICY IF EXISTS "Authenticated users can write guestbook posts" ON public.guestbook_post;

CREATE POLICY "Authenticated users can write guestbook posts" ON public.guestbook_post
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = author_id
        AND NOT EXISTS (
            SELECT 1 FROM public.profile WHERE id = profile_id AND is_locked = TRUE
        )
    );
