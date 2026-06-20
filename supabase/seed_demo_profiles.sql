-- Demo Seed Data for Family Reunion Testing
-- This is for test/development only. The main baseline migration already seeds
-- the core founder and first-branch records.

INSERT INTO public.profile (id, firstname, lastname, nickname, avatar_url, branch, sunrise, sunset)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'Demo John', 'Smith', 'J', 'john.jpg', 0, '1920-05-05', '1985-10-24'),
  ('00000000-0000-4000-8000-000000000002', 'Demo Alma', 'Smith', 'A', 'alma.jpg', 1, '1955-12-03', '2003-02-08'),
  ('00000000-0000-4000-8000-000000000003', 'Demo Ben', 'Smith', 'B', 'ben.jpg', 1, '1950-06-15', '2010-04-22'),
  ('00000000-0000-4000-8000-000000000004', 'Demo Bobbie', 'Smith', 'Bobby', 'bobbie.jpg', 1, '1948-03-20', '2005-09-11'),
  ('00000000-0000-4000-8000-000000000005', 'Demo Hazel', 'Smith', 'H', 'hazel.jpg', 1, '1952-08-10', '2008-12-05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connection (profile_1, profile_2, connection_type, status)
VALUES
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'child', 'active'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'child', 'active'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', 'child', 'active'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', 'child', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO public.profilestate (profile_id, city, state_id)
VALUES
  ('00000000-0000-4000-8000-000000000002', 'Memphis', (SELECT id FROM public.state WHERE state_name = 'Tennessee' LIMIT 1)),
  ('00000000-0000-4000-8000-000000000003', 'Nashville', (SELECT id FROM public.state WHERE state_name = 'Tennessee' LIMIT 1)),
  ('00000000-0000-4000-8000-000000000005', 'Jackson', (SELECT id FROM public.state WHERE state_name = 'Mississippi' LIMIT 1))
ON CONFLICT DO NOTHING;
