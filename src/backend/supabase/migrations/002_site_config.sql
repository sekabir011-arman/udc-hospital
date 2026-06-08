-- Site Configuration Table
-- Stores the front page configuration (hero, about, footer, emergency contacts)

create table public.site_config (
  id uuid primary key default uuid_generate_v4(),
  section text not null, -- 'heroSection', 'aboutSection', 'footerSection', 'emergencyContacts'
  config jsonb not null, -- Full config for this section
  updated_by uuid references public.users(id) on delete set null, -- Who made the last change
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Ensure only one active config per section
  unique(section)
);

create trigger trg_site_config_updated_at
before update on public.site_config
for each row execute function public.set_updated_at();

-- Create indexes
create index idx_site_config_section on public.site_config(section);
create index idx_site_config_updated_at on public.site_config(updated_at desc);

-- Audit Log Table
-- Tracks all changes to site configuration with full history

create table public.config_audit_log (
  id uuid primary key default uuid_generate_v4(),
  section text not null, -- Which section was changed
  action text not null, -- 'update' or 'reset'
  old_value jsonb, -- Previous value
  new_value jsonb not null, -- New value
  changed_by uuid not null references public.users(id) on delete cascade, -- Admin who made change
  change_reason text, -- Optional reason/description
  ip_address text, -- IP address of the admin
  user_agent text, -- Browser/client info
  created_at timestamp with time zone default now()
);

-- Create indexes for audit log
create index idx_config_audit_log_section on public.config_audit_log(section);
create index idx_config_audit_log_changed_by on public.config_audit_log(changed_by);
create index idx_config_audit_log_created_at on public.config_audit_log(created_at desc);

-- Seed default site configuration
insert into public.site_config (section, config) values
  (
    'heroSection',
    '{
      "taglineEn": "Dr. Arman Kabir'\''s Care",
      "taglineBn": "ডা. আরমান কবিরের চেম্বার",
      "subheadingEn": "Advanced Healthcare With a Human Touch",
      "subheadingBn": "মানবিক স্পর্শে উন্নত স্বাস্থ্যসেবা",
      "heroTaglineEn": "Healing with Trust and Compassion",
      "heroTaglineBn": "বিশ্বাস ও সহানুভূতির সাথে নিরাময়",
      "heroDescriptionEn": "Expert diagnosis, compassionate treatment, and trusted care for every stage of life.",
      "heroDescriptionBn": "জীবনের প্রতিটি পর্যায়ে বিশেষজ্ঞ রোগ নির্ণয়, সহানুভূতিশীল চিকিৎসা ও বিশ্বস্ত সেবা।",
      "cta1Label": "Book Appointment",
      "cta2Label": "Emergency"
    }'::jsonb
  ),
  (
    'aboutSection',
    '{
      "visible": true,
      "clinicNameEn": "Dr. Arman Kabir'\''s Care",
      "clinicNameBn": "ডা. আরমান কবিরের চেম্বার",
      "descriptionEn": "Comprehensive patient management and medical education serving patients and students across Bangladesh.",
      "descriptionBn": "বাংলাদেশ জুড়ে রোগী ও শিক্ষার্থীদের জন্য পূর্ণাঙ্গ রোগী ব্যবস্থাপনা ও চিকিৎসা শিক্ষা।",
      "yearsExperience": 10,
      "patientCount": "500+",
      "doctorCount": 2,
      "specialties": ["Internal Medicine", "Respiratory Medicine", "Diabetes & Endocrinology", "General Practice"],
      "affiliations": ["BSMMU", "DMCH", "Dhaka Medical College", "National Institute of Diseases of Chest & Hospital"]
    }'::jsonb
  ),
  (
    'footerSection',
    '{
      "addressEn": "Dhaka, Bangladesh",
      "addressBn": "ঢাকা, বাংলাদেশ",
      "phone": "+880-1751-959262",
      "email": "dr.armankabir011@gmail.com",
      "openingHours": "Sat–Thu: 9 AM – 8 PM",
      "copyrightText": "Dr. Arman Kabir'\''s Care. All rights reserved.",
      "socialLinks": []
    }'::jsonb
  ),
  (
    'emergencyContacts',
    '{
      "contacts": [
        {
          "doctorName": "Dr. Arman Kabir",
          "whatsappNumber": "8801751959262",
          "prefilledMessage": "Hello Dr. Arman, I need an emergency consultation."
        },
        {
          "doctorName": "Dr. Samia Shikder",
          "whatsappNumber": "8801957212210",
          "prefilledMessage": "Hello Dr. Samia, I need an emergency consultation."
        }
      ]
    }'::jsonb
  )
on conflict (section) do nothing;
