-- Run this to make a user an admin
-- Replace 'yourusername' or 'your@email.com' with your actual username or email

-- Option 1: By username
-- UPDATE users SET role = 'admin' WHERE username = 'yourusername';

-- Option 2: By email
-- UPDATE users SET role = 'admin' WHERE email = 'your@email.com';

-- Option 3: Make the first user admin
UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users);

-- Verify the change
SELECT id, username, email, role FROM users WHERE role IN ('admin', 'moderator');
