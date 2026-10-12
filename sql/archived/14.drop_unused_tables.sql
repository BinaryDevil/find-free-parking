-- Drop unused user_submissions table
DROP TABLE IF EXISTS public.user_submissions;

-- Drop submission_status enum if it exists and is not used by other tables
-- (It was only used by user_submissions)
DROP TYPE IF EXISTS submission_status;
