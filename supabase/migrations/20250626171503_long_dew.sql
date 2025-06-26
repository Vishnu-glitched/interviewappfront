/*
  # Delete All Users and Associated Data

  1. Data Cleanup
    - Delete all user profiles
    - Delete all interview responses
    - Delete all chat logs
    - Delete all authentication users

  2. Important Notes
    - This will permanently delete ALL user data
    - This action cannot be undone
    - Use with caution in production environments
*/

-- Delete all user-related data first (due to foreign key constraints)
DELETE FROM user_profiles;
DELETE FROM interview_responses;
DELETE FROM chat_logs;

-- Note: Deleting from auth.users requires special permissions
-- This needs to be run in the Supabase SQL Editor with service role permissions
-- DELETE FROM auth.users;