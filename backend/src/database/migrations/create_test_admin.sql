-- Create a test admin user
-- Username: admin
-- Email: admin@chess.com
-- Password: admin123

INSERT INTO users (username, email, password_hash, role, rating)
VALUES (
  'admin',
  'admin@chess.com',
  '$2b$10$waH28FSGO48Ui1.B4SvAaOSRInf8mPXB9YlkKuJOEiD6dNIlKmMqe',
  'admin',
  1500
);

-- Verify the user was created
SELECT id, username, email, role, rating FROM users WHERE username = 'admin';
