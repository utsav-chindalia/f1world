-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE public.players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.lap_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    lap_time INTEGER NOT NULL, -- stored in milliseconds
    track_id TEXT NOT NULL,    -- identifier for the track
    is_valid BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.racing_lines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lap_record_id UUID REFERENCES public.lap_records(id) ON DELETE CASCADE,
    points JSONB NOT NULL,     -- array of coordinates representing the racing line
    metadata JSONB DEFAULT '{}', -- additional data like speed at each point, gear changes, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to players table
CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lap_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racing_lines ENABLE ROW LEVEL SECURITY;

-- Policies for players table
CREATE POLICY "Players viewable by everyone" 
    ON public.players 
    FOR SELECT 
    USING (true);

CREATE POLICY "Players can insert their own record" 
    ON public.players 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Players can update their own record" 
    ON public.players 
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policies for lap_records table
CREATE POLICY "Lap records viewable by everyone" 
    ON public.lap_records 
    FOR SELECT 
    USING (true);

CREATE POLICY "Players can insert their own lap records" 
    ON public.lap_records 
    FOR INSERT 
    WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can update their own lap records" 
    ON public.lap_records 
    FOR UPDATE 
    USING (auth.uid() = player_id)
    WITH CHECK (auth.uid() = player_id);

-- Policies for racing_lines table
CREATE POLICY "Racing lines viewable by everyone" 
    ON public.racing_lines 
    FOR SELECT 
    USING (true);

CREATE POLICY "Players can insert their own racing lines" 
    ON public.racing_lines 
    FOR INSERT 
    WITH CHECK (
        auth.uid() = (
            SELECT player_id 
            FROM public.lap_records 
            WHERE id = lap_record_id
        )
    );

CREATE POLICY "Players can update their own racing lines" 
    ON public.racing_lines 
    FOR UPDATE 
    USING (
        auth.uid() = (
            SELECT player_id 
            FROM public.lap_records 
            WHERE id = lap_record_id
        )
    )
    WITH CHECK (
        auth.uid() = (
            SELECT player_id 
            FROM public.lap_records 
            WHERE id = lap_record_id
        )
    );

-- Create indexes for better query performance
CREATE INDEX idx_lap_records_player_id ON public.lap_records(player_id);
CREATE INDEX idx_lap_records_track_id ON public.lap_records(track_id);
CREATE INDEX idx_racing_lines_lap_record_id ON public.racing_lines(lap_record_id); 