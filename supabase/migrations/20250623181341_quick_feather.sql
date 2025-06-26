/*
  # Create interview responses table

  1. New Tables
    - `interview_responses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `question` (text, the interview question)
      - `answer_text` (text, user's answer)
      - `structure_score` (integer, scoring for structure)
      - `clarity_score` (integer, scoring for clarity)
      - `tone_score` (integer, scoring for tone)
      - `issues` (jsonb, detected issues in the response)
      - `suggestions` (jsonb, improvement suggestions)
      - `created_at` (timestamptz, when the response was created)

  2. Security
    - Enable RLS on `interview_responses` table
    - Add policy for authenticated users to read their own data
    - Add policy for authenticated users to insert their own data
*/

CREATE TABLE IF NOT EXISTS interview_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  answer_text text NOT NULL,
  structure_score integer DEFAULT 0,
  clarity_score integer DEFAULT 0,
  tone_score integer DEFAULT 0,
  issues jsonb DEFAULT '[]'::jsonb,
  suggestions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interview_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own interview responses"
  ON interview_responses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interview responses"
  ON interview_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_interview_responses_user_id_created_at 
  ON interview_responses(user_id, created_at DESC);