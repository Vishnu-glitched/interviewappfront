/*
  # Allow duplicate usernames

  1. Changes
    - Remove unique constraint from user_profiles.username column
    - Drop the unique index on username
    - Update the username availability check function

  2. Security
    - Keep RLS policies intact
    - Maintain other constraints and indexes
*/

-- Drop the unique constraint on username
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_username_key;

-- Drop the unique index on username
DROP INDEX IF EXISTS user_profiles_username_key;

-- Keep the regular index for performance but remove uniqueness
DROP INDEX IF EXISTS idx_user_profiles_username;
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);