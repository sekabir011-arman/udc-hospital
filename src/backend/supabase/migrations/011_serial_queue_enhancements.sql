-- Add missing columns to serial_queue_entries for public display and date tracking
alter table public.serial_queue_entries
add column patient_name text,
add column phone text,
add column queue_date date default current_date,
add column arrival_time timestamp with time zone;

-- Create index for date-based queries
create index idx_serial_queue_queue_date on public.serial_queue_entries(queue_date);
