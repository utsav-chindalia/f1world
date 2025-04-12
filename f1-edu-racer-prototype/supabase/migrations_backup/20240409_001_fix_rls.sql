-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable insert/update for all users" ON public.players;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.players;

-- Make sure RLS is enabled
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for all users
CREATE POLICY "Allow all operations for all users" ON public.players
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Grant necessary permissions to the anon role
GRANT ALL ON public.players TO anon;
GRANT USAGE ON SCHEMA public TO anon; 