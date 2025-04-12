-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create players table
CREATE TABLE public.players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create lap_records table
CREATE TABLE public.lap_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    lap_time INTEGER NOT NULL,
    track_id TEXT NOT NULL,
    is_valid BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create racing_lines table
CREATE TABLE public.racing_lines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lap_record_id UUID REFERENCES public.lap_records(id) ON DELETE CASCADE,
    points JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lap_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racing_lines ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations for all users" ON public.players
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for all users" ON public.lap_records
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations for all users" ON public.racing_lines
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.players TO anon;
GRANT ALL ON public.lap_records TO anon;
GRANT ALL ON public.racing_lines TO anon;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 