/*
  # Create Interview Coach Database Tables

  1. New Tables
    - `interview_responses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `question` (text)
      - `answer_text` (text)
      - `structure_score` (integer, default 0)
      - `clarity_score` (integer, default 0)
      - `tone_score` (integer, default 0)
      - `issues` (jsonb, default empty array)
      - `suggestions` (jsonb, default empty array)
      - `created_at` (timestamp)
    - `chat_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `message` (text)
      - `response` (text)
      - `timestamp` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read/insert their own data

  3. Performance
    - Add indexes for efficient querying by user_id and timestamps
*/

-- Create interview_responses table
CREATE TABLE IF NOT EXISTS interview_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question text NOT NULL,
  answer_text text NOT NULL,
  structure_score integer DEFAULT 0,
  clarity_score integer DEFAULT 0,
  tone_score integer DEFAULT 0,
  issues jsonb DEFAULT '[]'::jsonb,
  suggestions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create chat_logs table
CREATE TABLE IF NOT EXISTS chat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL,
  response text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Add foreign key constraints with conditional checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'interview_responses_user_id_fkey'
    AND table_name = 'interview_responses'
  ) THEN
    ALTER TABLE interview_responses 
    ADD CONSTRAINT interview_responses_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_logs_user_id_fkey'
    AND table_name = 'chat_logs'
  ) THEN
    ALTER TABLE chat_logs 
    ADD CONSTRAINT chat_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE interview_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for interview_responses with conditional checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'interview_responses' 
    AND policyname = 'Users can read own interview responses'
  ) THEN
    CREATE POLICY "Users can read own interview responses"
      ON interview_responses
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'interview_responses' 
    AND policyname = 'Users can insert own interview responses'
  ) THEN
    CREATE POLICY "Users can insert own interview responses"
      ON interview_responses
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create RLS policies for chat_logs with conditional checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_logs' 
    AND policyname = 'Users can read own chat logs'
  ) THEN
    CREATE POLICY "Users can read own chat logs"
      ON chat_logs
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_logs' 
    AND policyname = 'Users can insert own chat logs'
  ) THEN
    CREATE POLICY "Users can insert own chat logs"
      ON chat_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create performance indexes with conditional checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_interview_responses_user_id_created_at'
  ) THEN
    CREATE INDEX idx_interview_responses_user_id_created_at 
      ON interview_responses (user_id, created_at DESC);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_chat_logs_user_id_timestamp'
  ) THEN
    CREATE INDEX idx_chat_logs_user_id_timestamp 
      ON chat_logs (user_id, timestamp DESC);
  END IF;
END $$;