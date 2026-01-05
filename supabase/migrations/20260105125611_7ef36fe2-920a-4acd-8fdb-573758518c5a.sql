-- Add new values to industry_sector enum
ALTER TYPE crm.industry_sector ADD VALUE IF NOT EXISTS 'DIGITAL_SIGNAGE';

-- Add new value to lead_stage enum
ALTER TYPE crm.lead_stage ADD VALUE IF NOT EXISTS 'RECURRING';

-- Add new value to lead_source enum
ALTER TYPE crm.lead_source ADD VALUE IF NOT EXISTS 'COMMERCIAL';