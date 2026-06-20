-- migration: add_feedback.sql
-- Create the feedback table to store user-submitted bugs, suggestions, questions, and compliments.

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profile(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('bug', 'suggestion', 'question', 'compliment', 'other')),
    message TEXT NOT NULL CHECK (length(message) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone (authenticated or anonymous guests) can submit feedback
CREATE POLICY "Anyone can submit feedback" ON public.feedback
    FOR INSERT WITH CHECK (true);

-- Policy: Only admin users can read feedback entries
CREATE POLICY "Admins can view feedback" ON public.feedback
    FOR SELECT USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.profile 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Grant appropriate permissions to anonymous and authenticated users
GRANT INSERT ON public.feedback TO anon, authenticated;
GRANT SELECT ON public.feedback TO authenticated;
