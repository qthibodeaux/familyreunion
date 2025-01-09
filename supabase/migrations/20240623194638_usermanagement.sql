-- Profile Table
CREATE TABLE profile (
    id UUID PRIMARY KEY NOT NULL,
    firstname TEXT,
    nickname TEXT,
    lastname TEXT,
    avatar_url TEXT,
    parent UUID REFERENCES profile (id) ON DELETE SET NULL,
    ancestor UUID REFERENCES profile (id) ON DELETE SET NULL,
    sunrise DATE,
    sunset DATE,
    branch INT
);

-- Connection Type Table
CREATE TABLE connection_type (
    id UUID PRIMARY KEY NOT NULL,
    connection_name TEXT NOT NULL
);

-- Connection Table
CREATE TABLE connection (
    profile_1 UUID REFERENCES profile (id) ON DELETE CASCADE NOT NULL,
    profile_2 UUID REFERENCES profile (id) ON DELETE CASCADE NOT NULL,
    connection_type UUID REFERENCES connection_type (id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (profile_1, profile_2, connection_type)
);

-- State Table
CREATE TABLE state (
    id UUID PRIMARY KEY NOT NULL,
    state_name TEXT NOT NULL
);

-- Profile State Table
CREATE TABLE profilestate (
    profile_id UUID REFERENCES profile (id) ON DELETE CASCADE NOT NULL,
    state_id UUID REFERENCES state (id) ON DELETE CASCADE NOT NULL,
    city TEXT,
    PRIMARY KEY (profile_id, state_id)
);

-- Insert Storage Bucket for Avatars
INSERT INTO storage.buckets (id, name) VALUES ('avatars', 'avatars');

-- Function to Handle New User Creation
CREATE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profile (id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for New User Creation
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert Connection Types
INSERT INTO connection_type (id, connection_name) VALUES
    (gen_random_uuid(), 'parent'),
    (gen_random_uuid(), 'spouse'),
    (gen_random_uuid(), 'child');

-- Insert Profiles
INSERT INTO profile (id, firstname, nickname, lastname, sunrise, sunset, branch) VALUES
    (gen_random_uuid(), 'John Henry', NULL, 'Smith', '1885-05-05', '1959-10-24', 0),
    (gen_random_uuid(), 'Birdie Mae', NULL, 'Smith', '1909-03-09', '1968-03-29', 0),
    (gen_random_uuid(), 'Mary', 'Wan', 'Thibodeaux', '1939-06-03', '2024-05-11', 1),
    (gen_random_uuid(), 'Loretta', 'Yada', 'Glover', '1931-05-09', '2003-03-05', 1),
    (gen_random_uuid(), 'Hazel', 'Pooch', 'Williams', '1934-12-25', '2014-05-12', 1),
    (gen_random_uuid(), 'Bobbie Jean', 'Honey', 'Smith', '1941-04-27', '2008-06-19', 1),
    (gen_random_uuid(), 'Joyce', NULL, 'Smith', '1947-04-27', '2010-06-02', 1),
    (gen_random_uuid(), 'Lorene', 'Rene', 'Smith', '1950-01-28', '2018-08-18', 1),
    (gen_random_uuid(), 'Alma', NULL, 'Smith', '1955-12-04', '2003-02-09', 1),
    (gen_random_uuid(), 'Sylvester', NULL, 'Smith', '1929-08-28', '2009-05-12', 1),
    (gen_random_uuid(), 'John', 'Snake', 'Smith', '1932-06-29', '1993-01-23', 1),
    (gen_random_uuid(), 'Ben', NULL, 'Smith', '1936-02-25', '2020-05-27', 1),
    (gen_random_uuid(), 'James', 'Jack', 'Smith', '1943-11-20', '2007-01-06', 1);

-- Insert States
INSERT INTO state (id, state_name) VALUES
    (gen_random_uuid(), 'Alabama'),
    (gen_random_uuid(), 'Alaska'),
    (gen_random_uuid(), 'Arizona'),
    (gen_random_uuid(), 'Arkansas'),
    (gen_random_uuid(), 'California'),
    (gen_random_uuid(), 'Colorado'),
    (gen_random_uuid(), 'Connecticut'),
    (gen_random_uuid(), 'Delaware'),
    (gen_random_uuid(), 'Florida'),
    (gen_random_uuid(), 'Georgia'); -- Add additional states as needed

-- Update Parent Relationships
DO $$
DECLARE
    john_id UUID;
BEGIN
    SELECT id INTO john_id FROM profile WHERE firstname = 'John Henry' AND lastname = 'Smith';

    UPDATE profile
    SET parent = john_id
    WHERE firstname IN ('Mary', 'Loretta', 'Hazel', 'Bobbie', 'Joyce', 'Lorene', 'Alma', 'Sylvester', 'John', 'Ben', 'James');
END $$;

-- Insert Connections for Birdie Mae Smith's Children
DO $$
DECLARE
    birdie_id UUID;
    parent_type_id UUID;
    child_id UUID;
BEGIN
    SELECT id INTO birdie_id FROM profile WHERE firstname = 'Birdie Mae' AND lastname = 'Smith';
    SELECT id INTO parent_type_id FROM connection_type WHERE connection_name = 'child';

    FOR child_id IN
        SELECT id FROM profile WHERE firstname IN ('Mary', 'Loretta', 'Hazel', 'Bobbie', 'Joyce', 'Lorene', 'Alma', 'Sylvester', 'John', 'Ben', 'James')
    LOOP
        INSERT INTO connection (profile_1, profile_2, connection_type)
        VALUES (birdie_id, child_id, parent_type_id);
    END LOOP;
END $$;

-- Access Control for Storage
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar." ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update their own avatar." ON storage.objects
    FOR UPDATE USING ((SELECT auth.uid()) = owner) WITH CHECK (bucket_id = 'avatars');

-- Function 1: Get a limited number of random profiles with basic details
CREATE OR REPLACE FUNCTION get_random_profiles1(p_limit INTEGER)
RETURNS TABLE (
    id UUID,
    firstname TEXT,
    nickname TEXT,
    lastname TEXT,
    avatar_url TEXT,
    sunrise DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, 
    p.firstname, 
    p.nickname, 
    p.lastname, 
    p.avatar_url, 
    p.sunrise
  FROM profile p
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Get 5 random profiles with all columns from the profile table
CREATE OR REPLACE FUNCTION get_random_profiles2()
RETURNS SETOF profile AS $$
  SELECT *
  FROM profile
  ORDER BY RANDOM()
  LIMIT 5;
$$ LANGUAGE sql STABLE;

-- Function 3: Get random profiles with hierarchical details (ancestor, parent)
CREATE OR REPLACE FUNCTION get_random_profiles()
RETURNS TABLE (
    id UUID,
    firstname TEXT,
    lastname TEXT,
    nickname TEXT,
    avatar_url TEXT,
    ancestor_firstname TEXT,
    parent_firstname TEXT,
    sunrise DATE,
    sunset DATE,
    branch INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.firstname,
    p.lastname,
    p.nickname,
    p.avatar_url,
    ancestor.firstname AS ancestor_firstname,
    parent.firstname AS parent_firstname,
    p.sunrise,
    p.sunset,
    p.branch
  FROM profile p
  LEFT JOIN profile ancestor ON p.ancestor = ancestor.id
  LEFT JOIN profile parent ON p.parent = parent.id
  ORDER BY RANDOM()
  LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE;
