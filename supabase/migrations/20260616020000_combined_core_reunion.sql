-- migration: combined_core_reunion.sql
-- Merges the baseline user management schemas, seed profiles, and core reunion v2 features into a single schema.

-- 1. Create base tables
CREATE TABLE IF NOT EXISTS public.profile (
    id UUID PRIMARY KEY NOT NULL,
    firstname TEXT,
    nickname TEXT,
    lastname TEXT,
    avatar_url TEXT,
    parent UUID REFERENCES public.profile (id) ON DELETE SET NULL,
    ancestor UUID REFERENCES public.profile (id) ON DELETE SET NULL,
    sunrise DATE,
    sunset DATE,
    branch INT,
    email TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    lock_media_comments BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_email ON public.profile (email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.connection (
    profile_1 UUID REFERENCES public.profile (id) ON DELETE CASCADE NOT NULL,
    profile_2 UUID REFERENCES public.profile (id) ON DELETE CASCADE NOT NULL,
    connection_type TEXT CHECK (connection_type IN ('parent', 'spouse', 'child')) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending')) NOT NULL,
    requested_by UUID REFERENCES public.profile (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (profile_1, profile_2, connection_type)
);

CREATE TABLE IF NOT EXISTS public.state (
    id UUID PRIMARY KEY NOT NULL,
    state_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profilestate (
    profile_id UUID REFERENCES public.profile (id) ON DELETE CASCADE NOT NULL,
    state_id UUID REFERENCES public.state (id) ON DELETE CASCADE NOT NULL,
    city TEXT,
    PRIMARY KEY (profile_id, state_id)
);

-- 2. Create core feature tables
CREATE TABLE IF NOT EXISTS public.milestone (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('school', 'career', 'sports', 'family', 'adventures', 'memories', 'travel', 'military', 'faith', 'other')),
    subcategory TEXT,
    title TEXT NOT NULL,
    event_date DATE,
    location_text TEXT,
    photo_url TEXT,
    notes TEXT,
    likes_count INTEGER NOT NULL DEFAULT 0,
    is_broadcast BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guestbook_post (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(TRIM(content)) BETWEEN 1 AND 240),
    location TEXT,
    event_date DATE,
    likes_count INTEGER NOT NULL DEFAULT 0,
    is_reported BOOLEAN NOT NULL DEFAULT FALSE,
    is_broadcast BOOLEAN NOT NULL DEFAULT FALSE,
    tagged_profiles UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guestbook_tagged_profiles ON public.guestbook_post USING GIN(tagged_profiles);

CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    caption TEXT,
    decade TEXT NOT NULL CHECK (decade IN ('1980s and older', '1990s', '2000s', '2010s', 'Today')),
    media_type TEXT NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    is_reported BOOLEAN NOT NULL DEFAULT FALSE,
    is_broadcast BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.media_comment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    is_reported BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profile_relationship (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL CHECK (relation_type IN ('mute', 'block')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.report (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('milestone', 'media', 'guestbook_post', 'media_comment')),
    target_id UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profile(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('bug', 'suggestion', 'question', 'compliment', 'other')),
    message TEXT NOT NULL CHECK (LENGTH(TRIM(message)) BETWEEN 1 AND 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('milestone', 'media', 'guestbook_post')),
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS public.notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('like_milestone', 'like_media', 'comment_media', 'new_guestbook_post', 'like_guestbook_post')),
    target_id UUID NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guestbook_post ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profilestate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_relationship ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 4. Insert baseline avatars storage bucket (safe bypass)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Create core auth / relation checking helper functions
CREATE OR REPLACE FUNCTION public.can_edit_profile(profile_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    target_email TEXT;
    target_sunset DATE;
BEGIN
    IF user_id = profile_id THEN
        RETURN TRUE;
    END IF;

    SELECT email, sunset INTO target_email, target_sunset
    FROM public.profile
    WHERE id = profile_id;

    IF NOT EXISTS (
        SELECT 1 FROM public.connection
        WHERE (profile_1 = user_id AND profile_2 = profile_id)
           OR (profile_1 = profile_id AND profile_2 = user_id)
    ) THEN
        RETURN FALSE;
    END IF;

    IF target_sunset IS NOT NULL OR target_email IS NULL OR target_email = '' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_blocked_by_family(viewer_id UUID, target_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    parent_1_id UUID;
    spouse_id UUID;
    is_target_unclaimed BOOLEAN;
BEGIN
    IF viewer_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.profile_relationship 
        WHERE blocker_id = target_profile_id AND blocked_id = viewer_id AND relation_type = 'block'
    ) THEN
        RETURN TRUE;
    END IF;

    SELECT parent, (email IS NULL OR email = '' OR sunset IS NOT NULL)
    INTO parent_1_id, is_target_unclaimed
    FROM public.profile 
    WHERE id = target_profile_id;

    SELECT profile_2 INTO spouse_id 
    FROM public.connection 
    WHERE profile_1 = target_profile_id AND connection_type = 'spouse' LIMIT 1;

    IF is_target_unclaimed = TRUE THEN
        IF parent_1_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profile_relationship 
            WHERE blocker_id = parent_1_id AND blocked_id = viewer_id AND relation_type = 'block'
        ) THEN
            RETURN TRUE;
        END IF;

        IF spouse_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profile_relationship 
            WHERE blocker_id = spouse_id AND blocked_id = viewer_id AND relation_type = 'block'
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Row Level Security Policies

-- A. Profile Policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profile
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create profiles" ON public.profile
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update profiles they have permission for" ON public.profile
    FOR UPDATE
    USING (public.can_edit_profile(id, auth.uid()))
    WITH CHECK (
        public.can_edit_profile(id, auth.uid())
        OR parent = auth.uid()
        OR ancestor = auth.uid()
    );

CREATE POLICY "Users can delete unclaimed, living profiles" ON public.profile
    FOR DELETE
    USING (
        auth.role() = 'authenticated'
        AND email IS NULL
        AND sunset IS NULL
        AND (branch IS NULL OR branch > 1)
    );

-- B. Connection Policies
CREATE POLICY "Connections are viewable by everyone" ON public.connection
    FOR SELECT USING (
        status = 'active'
        OR auth.uid() = profile_1
        OR auth.uid() = profile_2
    );

CREATE POLICY "Users can insert connections" ON public.connection
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND (
            profile_1 = auth.uid() 
            OR profile_2 = auth.uid()
            OR public.can_edit_profile(profile_1, auth.uid())
            OR public.can_edit_profile(profile_2, auth.uid())
        )
    );

CREATE POLICY "Users can update connections" ON public.connection
    FOR UPDATE
    USING (
        profile_1 = auth.uid() 
        OR profile_2 = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profile p 
            WHERE (p.id = profile_1 OR p.id = profile_2) AND p.email IS NULL
        )
    )
    WITH CHECK (
        profile_1 = auth.uid() 
        OR profile_2 = auth.uid()
    );

CREATE POLICY "Users can delete connections" ON public.connection
    FOR DELETE
    USING (
        profile_1 = auth.uid() 
        OR profile_2 = auth.uid()
        OR public.can_edit_profile(profile_1, auth.uid())
        OR public.can_edit_profile(profile_2, auth.uid())
    );

-- C. Milestone Policies
CREATE POLICY "Anyone can read milestones" ON public.milestone
    FOR SELECT USING (
        NOT public.is_blocked_by_family(auth.uid(), profile_id)
    );

CREATE POLICY "Authenticated users can insert milestones for profiles they can edit" ON public.milestone
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND public.can_edit_profile(profile_id, auth.uid())
    );

CREATE POLICY "Authenticated users can update milestones for profiles they can edit" ON public.milestone
    FOR UPDATE USING (
        auth.role() = 'authenticated'
        AND public.can_edit_profile(profile_id, auth.uid())
    )
    WITH CHECK (
        public.can_edit_profile(profile_id, auth.uid())
    );

CREATE POLICY "Authenticated users can delete milestones from profiles they can edit" ON public.milestone
    FOR DELETE USING (
        auth.role() = 'authenticated'
        AND public.can_edit_profile(profile_id, auth.uid())
    );

-- D. Guestbook Policies
CREATE POLICY "Anyone can read guestbook posts" ON public.guestbook_post
    FOR SELECT USING (
        NOT public.is_blocked_by_family(auth.uid(), profile_id)
        AND (
            NOT is_reported
            OR (
                auth.role() = 'authenticated'
                AND EXISTS (
                    SELECT 1 FROM public.profile 
                    WHERE id = auth.uid() AND is_admin = TRUE
                )
            )
        )
    );

CREATE POLICY "Authenticated users can write guestbook posts" ON public.guestbook_post
    FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) = author_id
        AND EXISTS (
            SELECT 1
            FROM public.profile target
            WHERE target.id = profile_id
              AND target.is_locked = FALSE
        )
    );

CREATE POLICY "Users can delete their own guestbook posts" ON public.guestbook_post
    FOR DELETE TO authenticated
    USING (
        (SELECT auth.uid()) = author_id
    );

CREATE POLICY "Users can update their own guestbook posts" ON public.guestbook_post
    FOR UPDATE TO authenticated
    USING (
        (SELECT auth.uid()) = author_id
    )
    WITH CHECK (
        (SELECT auth.uid()) = author_id
    );

-- E. Media Policies
CREATE POLICY "Anyone can read media" ON public.media
    FOR SELECT USING (
        NOT public.is_blocked_by_family(auth.uid(), profile_id)
        AND (
            NOT is_reported
            OR (
                auth.role() = 'authenticated'
                AND EXISTS (
                    SELECT 1 FROM public.profile 
                    WHERE id = auth.uid() AND is_admin = TRUE
                )
            )
        )
    );

CREATE POLICY "Authenticated users can upload media for profiles they can edit" ON public.media
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND public.can_edit_profile(profile_id, auth.uid())
        AND auth.uid() = uploader_id
    );

CREATE POLICY "Authenticated users can delete media from profiles they can edit" ON public.media
    FOR DELETE USING (
        auth.role() = 'authenticated'
        AND public.can_edit_profile(profile_id, auth.uid())
    );

-- F. Media Comment Policies
CREATE POLICY "Anyone can read media comments" ON public.media_comment
    FOR SELECT USING (
        (
            NOT is_reported
            OR (
                auth.role() = 'authenticated'
                AND EXISTS (
                    SELECT 1 FROM public.profile 
                    WHERE id = auth.uid() AND is_admin = TRUE
                )
            )
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.media m
            WHERE m.id = media_id
              AND (
                  public.is_blocked_by_family(auth.uid(), m.profile_id)
                  OR public.is_blocked_by_family(auth.uid(), author_id)
              )
        )
    );

CREATE POLICY "Authenticated users can write comments" ON public.media_comment
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = author_id
    );

CREATE POLICY "Users can delete their own comments or comments on their media" ON public.media_comment
    FOR DELETE USING (
        auth.role() = 'authenticated'
        AND (
            auth.uid() = author_id
            OR public.can_edit_profile((SELECT profile_id FROM public.media WHERE id = media_id), auth.uid())
        )
    );

-- G. Likes Policies
CREATE POLICY "Anyone can read likes" ON public.likes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add likes" ON public.likes
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = user_id
    );

CREATE POLICY "Users can remove their own likes" ON public.likes
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- H. Notification Policies
CREATE POLICY "Users can view their own notifications" ON public.notification
    FOR SELECT USING (
        auth.role() = 'authenticated'
        AND auth.uid() = recipient_id
    );

CREATE POLICY "Users can update their own notifications" ON public.notification
    FOR UPDATE USING (
        auth.role() = 'authenticated'
        AND auth.uid() = recipient_id
    )
    WITH CHECK (
        auth.uid() = recipient_id
    );

-- H2. Profile Relationship Policies
CREATE POLICY "Users can view their own relationships" ON public.profile_relationship
    FOR SELECT USING (
        auth.role() = 'authenticated'
        AND (auth.uid() = blocker_id OR auth.uid() = blocked_id)
    );

CREATE POLICY "Users can manage their own relationships" ON public.profile_relationship
    FOR ALL USING (
        auth.role() = 'authenticated'
        AND auth.uid() = blocker_id
    ) WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = blocker_id
    );

-- H3. Content Report Policies
CREATE POLICY "Admins can view all reports" ON public.report
    FOR SELECT USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.profile 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "Authenticated users can submit reports" ON public.report
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = reporter_id
    );

-- H4. Feedback Policies
CREATE POLICY "Anyone can submit feedback" ON public.feedback
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view feedback" ON public.feedback
    FOR SELECT USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.profile
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- I. State Policies
CREATE POLICY "States are viewable by everyone" ON public.state
    FOR SELECT USING (true);

-- J. Profile State Policies
CREATE POLICY "Profile states are viewable by everyone" ON public.profilestate
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert profile states they can edit" ON public.profilestate
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND public.can_edit_profile(profile_id, auth.uid())
    );

CREATE POLICY "Authenticated users can update profile states they can edit" ON public.profilestate
    FOR UPDATE USING (
        auth.role() = 'authenticated'
        AND public.can_edit_profile(profile_id, auth.uid())
    )
    WITH CHECK (
        public.can_edit_profile(profile_id, auth.uid())
    );

CREATE POLICY "Authenticated users can delete profile states they can edit" ON public.profilestate
    FOR DELETE USING (
        auth.role() = 'authenticated'
        AND public.can_edit_profile(profile_id, auth.uid())
    );

-- 7. Trigger Functions and Automated Workflows

-- A. Like Counter Trigger
CREATE OR REPLACE FUNCTION public.handle_like_counter()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.target_type = 'guestbook_post' THEN
            UPDATE public.guestbook_post SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
        ELSIF NEW.target_type = 'media' THEN
            UPDATE public.media SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
        ELSIF NEW.target_type = 'milestone' THEN
            UPDATE public.milestone SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_type = 'guestbook_post' THEN
            UPDATE public.guestbook_post SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.target_id;
        ELSIF OLD.target_type = 'media' THEN
            UPDATE public.media SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.target_id;
        ELSIF OLD.target_type = 'milestone' THEN
            UPDATE public.milestone SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.target_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_added_or_removed
    AFTER INSERT OR DELETE ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_like_counter();

-- B. Media Comment Counter Trigger
CREATE OR REPLACE FUNCTION public.handle_media_comment_counter()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.media SET comments_count = comments_count + 1 WHERE id = NEW.media_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.media SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.media_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_media_comment_added_or_removed
    AFTER INSERT OR DELETE ON public.media_comment
    FOR EACH ROW EXECUTE FUNCTION public.handle_media_comment_counter();

-- C. Like Notification Trigger
CREATE OR REPLACE FUNCTION public.handle_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_owner_id UUID;
    action_val TEXT;
BEGIN
    IF NEW.target_type = 'milestone' THEN
        SELECT profile_id INTO target_owner_id FROM public.milestone WHERE id = NEW.target_id;
        action_val := 'like_milestone';
    ELSIF NEW.target_type = 'media' THEN
        SELECT profile_id INTO target_owner_id FROM public.media WHERE id = NEW.target_id;
        action_val := 'like_media';
    ELSIF NEW.target_type = 'guestbook_post' THEN
        SELECT profile_id INTO target_owner_id FROM public.guestbook_post WHERE id = NEW.target_id;
        action_val := 'like_guestbook_post';
    END IF;

    IF target_owner_id IS NOT NULL AND target_owner_id != NEW.user_id THEN
        INSERT INTO public.notification (recipient_id, actor_id, action_type, target_id)
        VALUES (target_owner_id, NEW.user_id, action_val, NEW.target_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_added
    AFTER INSERT ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_like_notification();

-- D. Unlike Notification Trigger
CREATE OR REPLACE FUNCTION public.handle_unlike_notification()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.notification
    WHERE actor_id = OLD.user_id
      AND target_id = OLD.target_id
      AND action_type IN ('like_milestone', 'like_media', 'like_guestbook_post');
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_removed
    AFTER DELETE ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_unlike_notification();

-- E. Guestbook Wall Post Notification Trigger
CREATE OR REPLACE FUNCTION public.handle_guestbook_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.profile_id != NEW.author_id THEN
        INSERT INTO public.notification (recipient_id, actor_id, action_type, target_id)
        VALUES (NEW.profile_id, NEW.author_id, 'new_guestbook_post', NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_guestbook_post_added
    AFTER INSERT ON public.guestbook_post
    FOR EACH ROW EXECUTE FUNCTION public.handle_guestbook_notification();

-- F. Media Comment Notification Trigger
CREATE OR REPLACE FUNCTION public.handle_media_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_owner_id UUID;
BEGIN
    SELECT profile_id INTO target_owner_id FROM public.media WHERE id = NEW.media_id;

    IF target_owner_id IS NOT NULL AND target_owner_id != NEW.author_id THEN
        INSERT INTO public.notification (recipient_id, actor_id, action_type, target_id)
        VALUES (target_owner_id, NEW.author_id, 'comment_media', NEW.media_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_media_comment_added
    AFTER INSERT ON public.media_comment
    FOR EACH ROW EXECUTE FUNCTION public.handle_media_comment_notification();

-- G. Media Comment Notification Delete Trigger
CREATE OR REPLACE FUNCTION public.handle_comment_deleted_notification()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.notification
    WHERE actor_id = OLD.author_id
      AND target_id = OLD.media_id
      AND action_type = 'comment_media';
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_media_comment_removed
    AFTER DELETE ON public.media_comment
    FOR EACH ROW EXECUTE FUNCTION public.handle_comment_deleted_notification();

-- H. Cascade Orphan Cleanup Triggers
CREATE OR REPLACE FUNCTION public.handle_milestone_deleted_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.notification WHERE target_id = OLD.id AND action_type = 'like_milestone';
    DELETE FROM public.likes WHERE target_id = OLD.id AND target_type = 'milestone';
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_milestone_deleted_cleanup
    AFTER DELETE ON public.milestone
    FOR EACH ROW EXECUTE FUNCTION public.handle_milestone_deleted_cleanup();

CREATE OR REPLACE FUNCTION public.handle_media_deleted_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.notification WHERE target_id = OLD.id AND action_type IN ('like_media', 'comment_media');
    DELETE FROM public.likes WHERE target_id = OLD.id AND target_type = 'media';
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_media_deleted_cleanup
    AFTER DELETE ON public.media
    FOR EACH ROW EXECUTE FUNCTION public.handle_media_deleted_cleanup();

CREATE OR REPLACE FUNCTION public.handle_guestbook_post_deleted_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.notification WHERE target_id = OLD.id AND action_type IN ('new_guestbook_post', 'like_guestbook_post');
    DELETE FROM public.likes WHERE target_id = OLD.id AND target_type = 'guestbook_post';
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_guestbook_post_deleted_cleanup
    AFTER DELETE ON public.guestbook_post
    FOR EACH ROW EXECUTE FUNCTION public.handle_guestbook_post_deleted_cleanup();

-- I. Content Reporting Flag Trigger
CREATE OR REPLACE FUNCTION public.handle_report_added()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.target_type = 'guestbook_post' THEN
        UPDATE public.guestbook_post SET is_reported = TRUE WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'media' THEN
        UPDATE public.media SET is_reported = TRUE WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'media_comment' THEN
        UPDATE public.media_comment SET is_reported = TRUE WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_report_added
    AFTER INSERT ON public.report
    FOR EACH ROW EXECUTE FUNCTION public.handle_report_added();

-- 8. Seed Datasets (Profiles, States, & Base Connections)

-- A. States list
INSERT INTO public.state (id, state_name) VALUES
    (gen_random_uuid(), 'Alabama'), (gen_random_uuid(), 'Alaska'), (gen_random_uuid(), 'Arizona'),
    (gen_random_uuid(), 'Arkansas'), (gen_random_uuid(), 'California'), (gen_random_uuid(), 'Colorado'),
    (gen_random_uuid(), 'Connecticut'), (gen_random_uuid(), 'Delaware'), (gen_random_uuid(), 'Florida'),
    (gen_random_uuid(), 'Georgia'), (gen_random_uuid(), 'Hawaii'), (gen_random_uuid(), 'Idaho'),
    (gen_random_uuid(), 'Illinois'), (gen_random_uuid(), 'Indiana'), (gen_random_uuid(), 'Iowa'),
    (gen_random_uuid(), 'Kansas'), (gen_random_uuid(), 'Kentucky'), (gen_random_uuid(), 'Louisiana'),
    (gen_random_uuid(), 'Maine'), (gen_random_uuid(), 'Maryland'), (gen_random_uuid(), 'Massachusetts'),
    (gen_random_uuid(), 'Michigan'), (gen_random_uuid(), 'Minnesota'), (gen_random_uuid(), 'Mississippi'),
    (gen_random_uuid(), 'Missouri'), (gen_random_uuid(), 'Montana'), (gen_random_uuid(), 'Nebraska'),
    (gen_random_uuid(), 'Nevada'), (gen_random_uuid(), 'New Hampshire'), (gen_random_uuid(), 'New Jersey'),
    (gen_random_uuid(), 'New Mexico'), (gen_random_uuid(), 'New York'), (gen_random_uuid(), 'North Carolina'),
    (gen_random_uuid(), 'North Dakota'), (gen_random_uuid(), 'Ohio'), (gen_random_uuid(), 'Oklahoma'),
    (gen_random_uuid(), 'Oregon'), (gen_random_uuid(), 'Pennsylvania'), (gen_random_uuid(), 'Rhode Island'),
    (gen_random_uuid(), 'South Carolina'), (gen_random_uuid(), 'South Dakota'), (gen_random_uuid(), 'Tennessee'),
    (gen_random_uuid(), 'Texas'), (gen_random_uuid(), 'Utah'), (gen_random_uuid(), 'Vermont'),
    (gen_random_uuid(), 'Virginia'), (gen_random_uuid(), 'Washington'), (gen_random_uuid(), 'West Virginia'),
    (gen_random_uuid(), 'Wisconsin'), (gen_random_uuid(), 'Wyoming')
ON CONFLICT DO NOTHING;

-- B. Baseline profiles (Roots + Branch 1 Children)
-- Seed Profile UUID variables
DO $$
DECLARE
    john_id UUID := gen_random_uuid();
    birdie_id UUID := gen_random_uuid();
    mary_id UUID := gen_random_uuid();
    loretta_id UUID := gen_random_uuid();
    hazel_id UUID := gen_random_uuid();
    bobbie_id UUID := gen_random_uuid();
    joyce_id UUID := gen_random_uuid();
    lorene_id UUID := gen_random_uuid();
    alma_id UUID := gen_random_uuid();
    sylvester_id UUID := gen_random_uuid();
    john_snake_id UUID := gen_random_uuid();
    ben_id UUID := gen_random_uuid();
    james_id UUID := gen_random_uuid();
BEGIN
    -- Founders
    INSERT INTO public.profile (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch)
    VALUES (john_id, 'John Henry', NULL, 'Smith', 'john.jpg', '1885-05-05', '1959-10-24', 0);
    
    INSERT INTO public.profile (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch)
    VALUES (birdie_id, 'Birdie Mae', NULL, 'Smith', 'birdie.jpg', '1909-03-09', '1968-03-29', 0);

    -- Branch 1 children
    INSERT INTO public.profile (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch, parent)
    VALUES (mary_id, 'Mary', 'Wan', 'Thibodeaux', 'mary.jpg', '1939-06-03', '2024-05-11', 1, john_id);
    
    INSERT INTO public.profile (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch, parent)
    VALUES (loretta_id, 'Loretta', 'Yada', 'Glover', 'loretta.jpg', '1931-05-09', '2003-03-05', 1, john_id);
    
    INSERT INTO public.profile (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch, parent)
    VALUES (hazel_id, 'Hazel', 'Pooch', 'Williams', 'hazel.jpg', '1934-12-25', '2014-05-12', 1, john_id);
    
    INSERT INTO public.profile (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch, parent)
    VALUES (bobbie_id, 'Bobbie Jean', 'Honey', 'Smith', 'bobbie.jpg', '1941-04-27', '2008-06-19', 1, john_id);
    
    INSERT INTO public.profile (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch, parent)
    VALUES (joyce_id, 'Joyce', NULL, 'Smith', 'joyce.jpg', '1947-04-27', '2010-06-02', 1, john_id);
    
    INSERT INTO public.profile (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch, parent)
    VALUES (lorene_id, 'Lorene', 'Rene', 'Smith', 'lorene.jpg', '1950-01-28', '2018-08-18', 1, john_id);
    
    INSERT INTO public.profile (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch, parent)
    VALUES (alma_id, 'Alma', NULL, 'Smith', 'alma.jpg', '1955-12-04', '2003-02-09', 1, john_id);
    
    INSERT INTO public.profile (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch, parent)
    VALUES (sylvester_id, 'Sylvester', NULL, 'Smith', 'sylvester.jpg', '1929-08-28', '2009-05-12', 1, john_id);
    
    INSERT INTO public.profile (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch, parent)
    VALUES (john_snake_id, 'John', 'Snake', 'Smith', 'john_snake.jpg', '1932-06-29', '1993-01-23', 1, john_id);
    
    INSERT INTO public.profile (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch, parent)
    VALUES (ben_id, 'Ben', NULL, 'Smith', 'ben.jpg', '1936-02-25', '2020-05-27', 1, john_id);
    
    INSERT INTO public.profile (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch, parent)
    VALUES (james_id, 'James', 'Jack', 'Smith', 'james.jpg', '1943-11-20', '2007-01-06', 1, john_id);

    -- Connections for Birdie Mae (Mother-Child relationships)
    INSERT INTO public.connection (profile_1, profile_2, connection_type, status)
    VALUES (birdie_id, mary_id, 'child', 'active'),
           (birdie_id, loretta_id, 'child', 'active'),
           (birdie_id, hazel_id, 'child', 'active'),
           (birdie_id, bobbie_id, 'child', 'active'),
           (birdie_id, joyce_id, 'child', 'active'),
           (birdie_id, lorene_id, 'child', 'active'),
           (birdie_id, alma_id, 'child', 'active'),
           (birdie_id, sylvester_id, 'child', 'active'),
           (birdie_id, john_snake_id, 'child', 'active'),
           (birdie_id, ben_id, 'child', 'active'),
           (birdie_id, james_id, 'child', 'active');

    -- Spouse connection between founders
    INSERT INTO public.connection (profile_1, profile_2, connection_type, status)
    VALUES (john_id, birdie_id, 'spouse', 'active');
END $$;

-- 9. Storage Buckets and Policies for Feature tables

-- A. Buckets Initialization
INSERT INTO storage.buckets (id, name, public)
VALUES ('milestones', 'milestones', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-media', 'profile-media', true)
ON CONFLICT (id) DO NOTHING;

-- B. Milestone Storage Policies
CREATE POLICY "Users can list milestone images only for profiles they can edit" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'milestones'
        AND auth.role() = 'authenticated'
        AND public.can_edit_profile(split_part(name, '/', 1)::uuid, auth.uid())
    );

CREATE POLICY "Users can upload milestone images for profiles they can edit" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'milestones'
        AND auth.role() = 'authenticated'
        AND public.can_edit_profile(split_part(name, '/', 1)::uuid, auth.uid())
    );

CREATE POLICY "Users can update milestone images for profiles they can edit" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'milestones'
        AND auth.role() = 'authenticated'
        AND public.can_edit_profile(split_part(name, '/', 1)::uuid, auth.uid())
    ) WITH CHECK (
        bucket_id = 'milestones'
        AND auth.role() = 'authenticated'
        AND public.can_edit_profile(split_part(name, '/', 1)::uuid, auth.uid())
    );

CREATE POLICY "Users can delete milestone images for profiles they can edit" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'milestones'
        AND auth.role() = 'authenticated'
        AND public.can_edit_profile(split_part(name, '/', 1)::uuid, auth.uid())
    );

-- C. Profile Media (Photos & Videos) Storage Policies
CREATE POLICY "Media files are viewable by everyone" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-media');

CREATE POLICY "Users can upload media files for profiles they can edit" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-media'
        AND auth.role() = 'authenticated'
        AND public.can_edit_profile(split_part(name, '/', 1)::uuid, auth.uid())
    );

CREATE POLICY "Users can delete media files for profiles they can edit" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'profile-media'
        AND auth.role() = 'authenticated'
        AND public.can_edit_profile(split_part(name, '/', 1)::uuid, auth.uid())
    );

-- D. Avatar Storage Policies (Clean Overwrite)
DROP POLICY IF EXISTS "Avatar images are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatar for themselves or direct relations" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatar for themselves or direct relations" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatar for themselves or direct relations" ON storage.objects;

CREATE POLICY "Avatar images are viewable by everyone" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatar for themselves or direct relations" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
        AND public.can_edit_profile(split_part(name, '.', 1)::uuid, auth.uid())
    );

CREATE POLICY "Users can update avatar for themselves or direct relations" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
        AND public.can_edit_profile(split_part(name, '.', 1)::uuid, auth.uid())
    ) WITH CHECK (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
        AND public.can_edit_profile(split_part(name, '.', 1)::uuid, auth.uid())
    );

CREATE POLICY "Users can delete avatar for themselves or direct relations" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
        AND public.can_edit_profile(split_part(name, '.', 1)::uuid, auth.uid())
    );

-- 10. Base privileges for API and Client usage
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profilestate TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestone TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guestbook_post TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_comment TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_relationship TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report TO anon, authenticated;
GRANT INSERT ON public.feedback TO anon, authenticated;
GRANT SELECT ON public.feedback TO authenticated;
GRANT SELECT ON public.state TO anon, authenticated;

-- 11. Create family_broadcast_queue view for unified feed queries
CREATE OR REPLACE VIEW public.family_broadcast_queue AS
SELECT 
  m.id::text AS queue_id,
  m.id AS item_id,
  'milestone' AS item_type,
  m.profile_id,
  p.firstname AS author_firstname,
  p.lastname AS author_lastname,
  p.avatar_url AS author_avatar_url,
  p.branch AS author_branch,
  p.is_locked AS author_is_locked,
  m.title AS display_title,
  m.notes AS display_body,
  m.category AS item_tag,
  m.photo_url AS file_path,
  m.created_at,
  m.is_broadcast,
  NULL::uuid AS target_profile_id,
  NULL::text AS target_firstname,
  NULL::text AS target_lastname,
  NULL::boolean AS target_is_locked
FROM public.milestone m
LEFT JOIN public.profile p ON m.profile_id = p.id
WHERE m.is_broadcast = true

UNION ALL

SELECT 
  md.id::text AS queue_id,
  md.id AS item_id,
  'media' AS item_type,
  md.profile_id,
  p.firstname AS author_firstname,
  p.lastname AS author_lastname,
  p.avatar_url AS author_avatar_url,
  p.branch AS author_branch,
  p.is_locked AS author_is_locked,
  md.caption AS display_title,
  NULL::text AS display_body,
  md.decade AS item_tag,
  md.file_path,
  md.created_at,
  md.is_broadcast,
  NULL::uuid AS target_profile_id,
  NULL::text AS target_firstname,
  NULL::text AS target_lastname,
  NULL::boolean AS target_is_locked
FROM public.media md
LEFT JOIN public.profile p ON md.profile_id = p.id
WHERE md.is_broadcast = true

UNION ALL

SELECT 
  g.id::text AS queue_id,
  g.id AS item_id,
  'guestbook' AS item_type,
  g.author_id AS profile_id,
  p_author.firstname AS author_firstname,
  p_author.lastname AS author_lastname,
  p_author.avatar_url AS author_avatar_url,
  p_author.branch AS author_branch,
  p_author.is_locked AS author_is_locked,
  g.content AS display_title,
  g.location AS display_body,
  'tribute'::text AS item_tag,
  NULL AS file_path,
  g.created_at,
  g.is_broadcast,
  g.profile_id AS target_profile_id,
  p_target.firstname AS target_firstname,
  p_target.lastname AS target_lastname,
  p_target.is_locked AS target_is_locked
FROM public.guestbook_post g
LEFT JOIN public.profile p_author ON g.author_id = p_author.id
LEFT JOIN public.profile p_target ON g.profile_id = p_target.id
WHERE g.is_broadcast = true AND g.is_reported = false;

GRANT SELECT ON public.family_broadcast_queue TO anon, authenticated;
