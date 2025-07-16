/*
# Fix websites table foreign key relationship

1. Changes
   - Update websites.owner_id to reference user_profiles(id) instead of auth.users(id)
   - This enables proper joins between user_profiles and websites tables

2. Security
   - Maintain existing RLS policies
   - No changes to security model
*/

-- Update the websites table to reference user_profiles instead of auth.users
ALTER TABLE websites DROP CONSTRAINT IF EXISTS websites_owner_id_fkey;
ALTER TABLE websites ADD CONSTRAINT websites_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES user_profiles(id) ON DELETE CASCADE;