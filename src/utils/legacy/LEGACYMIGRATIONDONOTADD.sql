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

CREATE TABLE connection (
  profile_1 UUID REFERENCES profile (id) ON DELETE CASCADE NOT NULL,
  profile_2 UUID REFERENCES profile (id) ON DELETE CASCADE NOT NULL,
  connection_type TEXT CHECK (connection_type IN ('parent', 'spouse', 'child')) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending')) NOT NULL,
  requested_by UUID REFERENCES profile (id) ON DELETE SET NULL,
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

-- Insert Profiles
INSERT INTO profile (
  id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch
) VALUES
  (gen_random_uuid(), 'John Henry', NULL, 'Smith', 'john.jpg', '1885-05-05', '1959-10-24', 0),
  (gen_random_uuid(), 'Birdie Mae', NULL, 'Smith', 'birdie.jpg', '1909-03-09', '1968-03-29', 0),
  (gen_random_uuid(), 'Mary', 'Wan', 'Thibodeaux', 'mary.jpg', '1939-06-03', '2024-05-11', 1),
  (gen_random_uuid(), 'Loretta', 'Yada', 'Glover', 'loretta.jpg', '1931-05-09', '2003-03-05', 1),
  (gen_random_uuid(), 'Hazel', 'Pooch', 'Williams', 'hazel.jpg', '1934-12-25', '2014-05-12', 1),
  (gen_random_uuid(), 'Bobbie Jean', 'Honey', 'Smith', 'bobbie.jpg', '1941-04-27', '2008-06-19', 1),
  (gen_random_uuid(), 'Joyce', NULL, 'Smith', 'joyce.jpg', '1947-04-27', '2010-06-02', 1),
  (gen_random_uuid(), 'Lorene', 'Rene', 'Smith', 'lorene.jpg', '1950-01-28', '2018-08-18', 1),
  (gen_random_uuid(), 'Alma', NULL, 'Smith', 'alma.jpg', '1955-12-04', '2003-02-09', 1),
  (gen_random_uuid(), 'Sylvester', NULL, 'Smith', 'sylvester.jpg', '1929-08-28', '2009-05-12', 1),
  (gen_random_uuid(), 'John', 'Snake', 'Smith', 'john_snake.jpg', '1932-06-29', '1993-01-23', 1),
  (gen_random_uuid(), 'Ben', NULL, 'Smith', 'ben.jpg', '1936-02-25', '2020-05-27', 1),
  (gen_random_uuid(), 'James', 'Jack', 'Smith', 'james.jpg', '1943-11-20', '2007-01-06', 1);


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
    (gen_random_uuid(), 'Georgia'),
    (gen_random_uuid(), 'Hawaii'),
    (gen_random_uuid(), 'Idaho'),
    (gen_random_uuid(), 'Illinois'),
    (gen_random_uuid(), 'Indiana'),
    (gen_random_uuid(), 'Iowa'),
    (gen_random_uuid(), 'Kansas'),
    (gen_random_uuid(), 'Kentucky'),
    (gen_random_uuid(), 'Louisiana'),
    (gen_random_uuid(), 'Maine'),
    (gen_random_uuid(), 'Maryland'),
    (gen_random_uuid(), 'Massachusetts'),
    (gen_random_uuid(), 'Michigan'),
    (gen_random_uuid(), 'Minnesota'),
    (gen_random_uuid(), 'Mississippi'),
    (gen_random_uuid(), 'Missouri'),
    (gen_random_uuid(), 'Montana'),
    (gen_random_uuid(), 'Nebraska'),
    (gen_random_uuid(), 'Nevada'),
    (gen_random_uuid(), 'New Hampshire'),
    (gen_random_uuid(), 'New Jersey'),
    (gen_random_uuid(), 'New Mexico'),
    (gen_random_uuid(), 'New York'),
    (gen_random_uuid(), 'North Carolina'),
    (gen_random_uuid(), 'North Dakota'),
    (gen_random_uuid(), 'Ohio'),
    (gen_random_uuid(), 'Oklahoma'),
    (gen_random_uuid(), 'Oregon'),
    (gen_random_uuid(), 'Pennsylvania'),
    (gen_random_uuid(), 'Rhode Island'),
    (gen_random_uuid(), 'South Carolina'),
    (gen_random_uuid(), 'South Dakota'),
    (gen_random_uuid(), 'Tennessee'),
    (gen_random_uuid(), 'Texas'),
    (gen_random_uuid(), 'Utah'),
    (gen_random_uuid(), 'Vermont'),
    (gen_random_uuid(), 'Virginia'),
    (gen_random_uuid(), 'Washington'),
    (gen_random_uuid(), 'West Virginia'),
    (gen_random_uuid(), 'Wisconsin'),
    (gen_random_uuid(), 'Wyoming');

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
    child_id UUID;
BEGIN
    SELECT id INTO birdie_id FROM profile WHERE firstname = 'Birdie Mae' AND lastname = 'Smith';

    FOR child_id IN
        SELECT id FROM profile WHERE firstname IN ('Mary', 'Loretta', 'Hazel', 'Bobbie', 'Joyce', 'Lorene', 'Alma', 'Sylvester', 'John', 'Ben', 'James')
    LOOP
        INSERT INTO connection (profile_1, profile_2, connection_type)
        VALUES (birdie_id, child_id, 'child');
    END LOOP;
END $$;

-- Access Control for Storage
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar." ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update their own avatar." ON storage.objects
    FOR UPDATE USING ((SELECT auth.uid()) = owner) WITH CHECK (bucket_id = 'avatars');

-- Function 3: Get random profiles with hierarchical details (ancestor, parent)
create or replace function get_random_profiles()
returns table (
    id uuid,
    firstname text,
    nickname text,
    lastname text,
    avatar_url text,
    ancestor_name text,
    parent_name text,
    branch integer
)
language sql
as $$
  select
    p.id,
    p.firstname,
    p.nickname,
    p.lastname,
    p.avatar_url,
    a.firstname as ancestor_name,
    pr.firstname as parent_name,
    p.branch
  from profile p
  left join profile a on p.ancestor = a.id
  left join profile pr on p.parent = pr.id
  where p.firstname is not null
  order by random()
  limit 5;
$$;