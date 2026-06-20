-- Demo Seed Data for Family Reunion Testing
-- This is for test/development only - delete before production

-- Insert demo profiles (Branch 1 = First Branch elders)
INSERT INTO profile (id, firstname, lastname, nickname, avatar_url, branch, sunrise, sunset, created_at, updated_at)
VALUES 
  ('demo-alma', 'Alma', 'Smith', 'A', 'alma.jpg', 1, '1955-12-03', '2003-02-08', NOW(), NOW()),
  ('demo-ben', 'Ben', 'Smith', 'B', 'ben.jpg', 1, '1950-06-15', '2010-04-22', NOW(), NOW()),
  ('demo-bobbie', 'Bobbie', 'Smith', 'Bobby', 'bobbie.jpg', 1, '1948-03-20', '2005-09-11', NOW(), NOW()),
  ('demo-hazel', 'Hazel', 'Smith', 'H', 'hazel.jpg', 1, '1952-08-10', '2008-12-05', NOW(), NOW()),
  ('demo-james', 'James', 'Smith', 'Jim', 'james.jpg', 1, '1953-11-02', '2012-07-19', NOW(), NOW()),
  ('demo-john', 'John', 'Smith', 'J', 'john.jpg', 0, '1920-05-05', '1985-10-24', NOW(), NOW()),
  ('demo-joyce', 'Joyce', 'Smith', 'Joy', 'joyce.jpg', 1, '1955-01-14', '2004-06-30', NOW(), NOW()),
  ('demo-lorene', 'Lorene', 'Smith', 'Lori', 'lorene.jpg', 1, '1951-07-22', '2009-03-15', NOW(), NOW()),
  ('demo-loretta', 'Loretta', 'Smith', 'Lorry', 'loretta.jpg', 1, '1949-09-08', '2007-11-28', NOW(), NOW()),
  ('demo-mary', 'Mary', 'Smith', 'M', 'mary.jpg', 1, '1954-02-17', '2006-08-09', NOW(), NOW()),
  ('demo-sylvester', 'Sylvester', 'Smith', 'Syl', 'sylvester.jpg', 1, '1929-08-27', '2009-05-11', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert demo connections (parent-child relationships for tree structure)
INSERT INTO connection (profile_1, profile_2, connection_type, created_at, updated_at)
VALUES 
  -- John (founder) to some children
  ('demo-john', 'demo-sylvester', 'child', NOW(), NOW()),
  ('demo-john', 'demo-lorene', 'child', NOW(), NOW()),
  -- Create some sibling connections
  ('demo-alma', 'demo-ben', 'sibling', NOW(), NOW()),
  ('demo-bobbie', 'demo-hazel', 'sibling', NOW(), NOW()),
  ('demo-james', 'demo-joyce', 'sibling', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert demo state data for profiles
INSERT INTO profilestate (profile_id, city, state_id, created_at, updated_at)
VALUES 
  ('demo-alma', 'Memphis', (SELECT id FROM state WHERE state_name = 'Tennessee'), NOW(), NOW()),
  ('demo-ben', 'Nashville', (SELECT id FROM state WHERE state_name = 'Tennessee'), NOW(), NOW()),
  ('demo-lorene', 'Jackson', (SELECT id FROM state WHERE state_name = 'Mississippi'), NOW(), NOW())
ON CONFLICT DO NOTHING;
