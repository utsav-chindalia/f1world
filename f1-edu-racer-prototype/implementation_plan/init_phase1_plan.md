# F1 Racing Educator - Initialization & Phase 1 Implementation Plan
> Direct Supabase Integration & Project Setup

## Initial Setup Checklist

### 1. Development Environment Setup
- [ ] Install required tools:
  ```bash
  npm install @supabase/supabase-js
  npm install -g supabase
  ```
- [ ] Configure VSCode extensions:
  - Supabase
  - Prettier
  - ESLint
  - TypeScript

### 2. Version Control Setup
- [ ] Create new branch: `feature/racing-lines-supabase`
- [ ] Update .gitignore:
  ```
  .env
  .env.local
  .env.development
  .env.production
  ```
- [ ] Create PR template for feature reviews

## Phase 1: Project Setup [Week 1]

### Day 1-2: Supabase Project Setup

#### 1. Create Supabase Project
- [ ] Create new project in Supabase dashboard
- [ ] Note down project credentials:
  ```
  VITE_SUPABASE_URL=your_project_url
  VITE_SUPABASE_ANON_KEY=your_anon_key
  ```

#### 2. Database Schema Setup
```sql
-- Create tables
create table public.players (
  id uuid default uuid_generate_v4() primary key,
  username text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.lap_records (
  id uuid default uuid_generate_v4() primary key,
  player_id uuid references public.players(id),
  lap_time integer not null,
  is_valid boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.racing_lines (
  id uuid default uuid_generate_v4() primary key,
  lap_record_id uuid references public.lap_records(id),
  points jsonb not null,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

#### 3. Database Policies
```sql
-- Players table policies
alter table public.players enable row level security;
create policy "Players viewable by everyone" on public.players for select using (true);
create policy "Players can insert their own record" on public.players for insert with check (auth.uid() = id);

-- Lap records policies
alter table public.lap_records enable row level security;
create policy "Lap records viewable by everyone" on public.lap_records for select using (true);
create policy "Players can insert their own lap records" on public.lap_records for insert with check (auth.uid() = player_id);

-- Racing lines policies
alter table public.racing_lines enable row level security;
create policy "Racing lines viewable by everyone" on public.racing_lines for select using (true);
create policy "Players can insert their own racing lines" on public.racing_lines for insert with check (
  auth.uid() = (select player_id from public.lap_records where id = lap_record_id)
);
```

### Day 3-4: Project Structure Setup

#### 1. Create Directory Structure
```bash
mkdir -p src/lib/supabase
mkdir -p src/services
mkdir -p src/hooks
mkdir -p src/components/Leaderboard
mkdir -p src/components/RacingLine
mkdir -p supabase/migrations
mkdir -p supabase/seed
```

#### 2. Initialize Supabase and Migrations
```bash
# Initialize Supabase
supabase init

# Create initial migration
supabase migration new initial_schema

# Add initial schema to migration file
cat << EOF > supabase/migrations/[timestamp]_initial_schema.sql
-- Create tables
create table public.players (
  id uuid default uuid_generate_v4() primary key,
  username text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.lap_records (
  id uuid default uuid_generate_v4() primary key,
  player_id uuid references public.players(id),
  lap_time integer not null,
  is_valid boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.racing_lines (
  id uuid default uuid_generate_v4() primary key,
  lap_record_id uuid references public.lap_records(id),
  points jsonb not null,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS policies
alter table public.players enable row level security;
create policy "Players viewable by everyone" on public.players for select using (true);
create policy "Players can insert their own record" on public.players for insert with check (auth.uid() = id);

alter table public.lap_records enable row level security;
create policy "Lap records viewable by everyone" on public.lap_records for select using (true);
create policy "Players can insert their own lap records" on public.lap_records for insert with check (auth.uid() = player_id);

alter table public.racing_lines enable row level security;
create policy "Racing lines viewable by everyone" on public.racing_lines for select using (true);
create policy "Players can insert their own racing lines" on public.racing_lines for insert with check (
  auth.uid() = (select player_id from public.lap_records where id = lap_record_id)
);
EOF

# Create seed data migration
supabase migration new seed_data

# Add seed data to migration file
cat << EOF > supabase/migrations/[timestamp]_seed_data.sql
-- Add sample data for development
INSERT INTO public.players (id, username) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'test_user_1'),
  ('00000000-0000-0000-0000-000000000002', 'test_user_2');
EOF
```

#### 3. Migration Management
- [ ] Document migration commands:
  ```bash
  # Apply migrations
  supabase db reset  # Reset and run all migrations
  supabase migration up  # Run pending migrations
  
  # Create new migration
  supabase migration new migration_name
  
  # Verify migration status
  supabase db status
  ```
- [ ] Set up migration CI/CD workflow
- [ ] Create migration testing procedure
- [ ] Document rollback procedures

### Day 5-7: Development Setup & Initial Testing

#### 1. Update Package.json
- [ ] Add required dependencies:
  ```json
  {
    "dependencies": {
      "@supabase/supabase-js": "^2.x.x",
      "zustand": "^4.x.x"
    }
  }
  ```

#### 2. Setup Development Tools
- [ ] Configure ESLint
- [ ] Setup Prettier
- [ ] Add TypeScript (optional)
- [ ] Configure test environment

#### 3. Initial Integration Testing
- [ ] Test Supabase connection
- [ ] Verify database access
- [ ] Test authentication flow
- [ ] Validate real-time capabilities

## Testing Requirements for Phase 1

### Unit Tests
- [ ] Supabase client connection
- [ ] Database schema validation
- [ ] Policy verification
- [ ] Environment configuration

### Integration Tests
- [ ] Authentication flow
- [ ] Database operations
- [ ] Real-time subscriptions
- [ ] Data validation

## Documentation for Phase 1

### Technical Documentation
- [ ] Database schema
- [ ] Environment setup
- [ ] Development workflow
- [ ] Testing procedures

### Setup Instructions
- [ ] Local development setup
- [ ] Environment configuration
- [ ] Testing setup
- [ ] Troubleshooting guide

## Success Criteria for Phase 1

### Technical Requirements
- [ ] Supabase project configured
- [ ] Database schema implemented
- [ ] Policies set up correctly
- [ ] Local development working

### Validation Steps
1. Test database connections
2. Verify policy enforcement
3. Confirm real-time capabilities
4. Check environment configurations
5. Validate data flow

## Next Steps After Phase 1
1. Begin feature implementation
2. Set up authentication system
3. Create basic UI components
4. Implement real-time subscriptions

## Notes
- Keep track of all credentials securely
- Document any deviations from plan
- Regular commits with clear messages
- Test each component thoroughly 