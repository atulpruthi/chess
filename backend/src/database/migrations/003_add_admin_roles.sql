-- Migration: Add admin roles and permissions system
-- Created: 2026-02-01

-- Add role column to users table
ALTER TABLE users 
ADD COLUMN role VARCHAR(20) DEFAULT 'user' NOT NULL;

-- Add index on role for faster queries
CREATE INDEX idx_users_role ON users(role);

-- Create admin_logs table to track admin actions
CREATE TABLE admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- 'user', 'game', 'comment', etc.
    target_id INTEGER,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at);

-- Create banned_users table
CREATE TABLE banned_users (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    banned_by INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    banned_until TIMESTAMP, -- NULL for permanent ban
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX idx_banned_users_user_id ON banned_users(user_id);

-- Insert a default admin user (update this after running)
-- You can manually update an existing user to admin:
-- UPDATE users SET role = 'admin' WHERE email = 'your@email.com';

COMMENT ON COLUMN users.role IS 'User role: user, moderator, admin';
COMMENT ON TABLE admin_logs IS 'Tracks all administrative actions';
COMMENT ON TABLE banned_users IS 'Stores banned users information';
