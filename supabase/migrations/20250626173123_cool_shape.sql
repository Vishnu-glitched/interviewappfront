/*
  # Delete All Authentication Users

  1. Data Cleanup
    - Delete all user profiles (cascade will handle related data)
    - Delete all authentication users from auth.users table
    - This requires service role permissions

  2. Important Notes
    - This will permanently delete ALL user accounts
    - This action cannot be undone
    - All related data will be deleted due to CASCADE constraints
*/

-- First delete all public user data (this will cascade to related tables)
DELETE FROM public.user_profiles;
DELETE FROM public.interview_responses;
DELETE FROM public.chat_logs;

-- Delete all authentication users
-- This requires service role permissions and will delete all user accounts
DELETE FROM auth.users;

-- Optional: Reset any sequences if needed
-- ALTER SEQUENCE IF EXISTS some_sequence RESTART WITH 1;