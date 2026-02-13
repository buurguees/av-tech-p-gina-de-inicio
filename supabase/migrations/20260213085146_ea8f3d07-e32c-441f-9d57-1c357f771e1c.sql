
-- 1. Add NEGOTIATION to project_status enum
ALTER TYPE projects.project_status ADD VALUE IF NOT EXISTS 'NEGOTIATION';
