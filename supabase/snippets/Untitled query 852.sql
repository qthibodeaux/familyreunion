-- ==========================================================
-- MASTER TEST MIGRATION: 200 Profiles + Updated Social Rules
-- ==========================================================

-- 1. FRESH START: Wipe existing data (CLEAN TEST STATE)
TRUNCATE public.profile, public.guestbook_post, public.media, public.milestone, public.notification, public.connection CASCADE;

-- 2. UPDATE SECURITY POLICIES (LOGIC UPDATES)

-- Add missing columns to profile if they don't exist
ALTER TABLE public.profile ADD COLUMN IF NOT EXISTS location TEXT;

-- A. Allow users to post on their own guestbook (Status Updates)
DROP POLICY IF EXISTS "Authenticated users can write guestbook posts" ON public.guestbook_post;
CREATE POLICY "Authenticated users can write guestbook posts" ON public.guestbook_post
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = author_id
        -- Restriction removed: User CAN now post on their own wall (profile_id == author_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.profile WHERE id = profile_id AND is_locked = TRUE
        )
    );

-- B. Allow Profile Owners to Delete/Hide posts made by others on their wall
DROP POLICY IF EXISTS "Users can delete posts on their own wall or their own posts" ON public.guestbook_post;
CREATE POLICY "Users can delete posts on their own wall or their own posts" ON public.guestbook_post
    FOR DELETE USING (
        auth.uid() = author_id OR auth.uid() = profile_id
    );

-- C. Allow Authors/Owners to update is_broadcast (The "Unhide from Feed" feature)
DROP POLICY IF EXISTS "Users can update broadcast status" ON public.guestbook_post;
CREATE POLICY "Users can update broadcast status" ON public.guestbook_post
    FOR UPDATE USING (
        auth.uid() = author_id OR auth.uid() = profile_id
    ) WITH CHECK (
        auth.uid() = author_id OR auth.uid() = profile_id
    );

-- D. Media rule updates (Owners can remove other people's uploads/broadcasts)
DROP POLICY IF EXISTS "Users can manage media on their profile" ON public.media;
CREATE POLICY "Users can manage media on their profile" ON public.media
    FOR ALL USING (
        auth.uid() = uploader_id OR auth.uid() = profile_id
    );

-- E. Milestone rule updates (Profile owners can manage milestones)
DROP POLICY IF EXISTS "Users can manage milestones on their profile" ON public.milestone;
CREATE POLICY "Users can manage milestones on their profile" ON public.milestone
    FOR ALL USING (
        auth.uid() = profile_id
    );

-- 3. SEED DATA GENERATION (200 PROFILES)
-- We use a DO block to generate mass profiles and connections

DO $$
DECLARE
    v_branch1_ids UUID[];
    v_new_profile_id UUID;
    v_branch_int INTEGER;
    v_sample_pics TEXT[] := ARRAY['IMG_1814.JPG', 'IMG_1815.JPG', 'IMG_1829.JPG', 'IMG_1832.JPG', 'IMG_1835.JPG', 'IMG_1860.JPG', 'IMG_1861.JPG', 'IMG_1871.JPG', 'IMG_1896.JPG', 'IMG_1909.JPG', 'IMG_1929.JPG', 'IMG_1945.JPG', 'IMG_1950.JPG', 'IMG_1991.JPG', 'IMG_1993.JPG', 'IMG_2001.JPG', 'IMG_2005.JPG', 'IMG_2008.JPG', 'IMG_2011.JPG', 'IMG_2032.JPG', 'IMG_2033.JPG', 'IMG_2060.JPG', 'IMG_2067.JPG', 'IMG_2074.JPG', 'IMG_2083.JPG', 'IMG_2120.PNG', 'IMG_2308.JPG', 'IXVI5202.JPEG'];
    v_locations TEXT[] := ARRAY['Atlanta, GA', 'Chicago, IL', 'Los Angeles, CA', 'Houston, TX', 'Detroit, MI', 'New York, NY', 'Miami, FL', 'Oakland, CA'];
    v_first_names TEXT[] := ARRAY['James', 'Sarah', 'Malik', 'Ebony', 'Tyrone', 'Aisha', 'Darnell', 'Kia', 'Xavier', 'Latoya', 'Andre', 'Imani', 'Marcus', 'Tamika', 'Terrence', 'Keisha', 'Jermaine', 'Nia', 'Desmond', 'Tanisha'];
    v_last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    v_parent_id UUID;
    i INTEGER;
BEGIN
    -- [A] Re-insert the 11 "Core" Branch 1 Ancestors (The Foundations)
    FOR i IN 1..11 LOOP
        INSERT INTO public.profile (id, firstname, lastname, branch, avatar_url, location)
        VALUES (
            gen_random_uuid(),
            v_first_names[1 + (i % 20)], 
            'Foundation', 
            1, -- These are the Branch 1 founders
            '/samplepics/' || v_sample_pics[1 + (i % 28)],
            'Legacy Home'
        ) RETURNING id INTO v_new_profile_id;
        v_branch1_ids := array_append(v_branch1_ids, v_new_profile_id);
    END LOOP;

    -- [B] Generate 200 Descendants (Branches 2-11)
    FOR i IN 1..200 LOOP
        -- Randomly pick a "Parent" from Branch 1 to start, or from previously created descendants
        IF i < 50 THEN
            v_parent_id := v_branch1_ids[1 + (i % 11)];
            v_branch_int := 2; -- Children of Branch 1 are Branch 2
        ELSIF i < 120 THEN
            SELECT id, branch INTO v_parent_id, v_branch_int FROM public.profile 
            WHERE branch = 2 ORDER BY random() LIMIT 1;
            v_branch_int := 3; -- Children of Branch 2 are Branch 3
        ELSE
            SELECT id, branch INTO v_parent_id, v_branch_int FROM public.profile 
            WHERE branch >= 3 ORDER BY random() LIMIT 1;
            v_branch_int := v_branch_int + 1; -- Keep ticking up
        END IF;

        INSERT INTO public.profile (
            id,
            firstname, 
            lastname, 
            nickname,
            branch, 
            ancestor,
            avatar_url, 
            location,
            sunrise
        )
        VALUES (
            gen_random_uuid(),
            v_first_names[1 + ((i*3) % 20)], 
            v_last_names[1 + ((i*7) % 10)], 
            'Seed ' || i,
            v_branch_int, 
            v_parent_id,
            '/samplepics/' || v_sample_pics[1 + (i % 28)],
            v_locations[1 + (i % 8)],
            (NOW() - (random() * interval '60 years'))
        ) RETURNING id INTO v_new_profile_id;

        -- [C] Seed Guestbook Posts for these Fake Users (Some Broadcasted, Some Not)
        INSERT INTO public.guestbook_post (profile_id, author_id, content, is_broadcast, created_at)
        VALUES (
            v_new_profile_id,
            (SELECT id FROM public.profile WHERE id != v_new_profile_id ORDER BY random() LIMIT 1),
            'Welcome to the family tree! This is seed post #' || i,
            (i % 3 = 0), -- Every 3rd post is broadcasted
            NOW() - (random() * interval '30 days')
        );

        -- [D] Seed some Media (Photos)
        IF i % 5 = 0 THEN
            INSERT INTO public.media (profile_id, uploader_id, file_path, caption, decade, is_broadcast)
            VALUES (
                v_new_profile_id,
                v_new_profile_id,
                '/samplepics/' || v_sample_pics[1 + ((i+5) % 28)],
                'Memory from the ' || (ARRAY['1990s', '2000s', 'Today'])[1 + (i % 3)],
                (ARRAY['1990s', '2000s', 'Today'])[1 + (i % 3)],
                TRUE -- Most media is broadcasted in this test
            );
        END IF;

        -- [E] Seed some Milestones
        IF i % 10 = 0 THEN
            INSERT INTO public.milestone (profile_id, category, title, event_date, location_text, is_broadcast)
            VALUES (
                v_new_profile_id,
                (ARRAY['school', 'career', 'family', 'travel'])[1 + (i % 4)],
                'Big Milestone for ' || v_first_names[1 + ((i*3) % 20)],
                (NOW() - (random() * interval '5 years'))::DATE,
                v_locations[1 + (i % 8)],
                TRUE
            );
        END IF;
    END LOOP;
END $$;

