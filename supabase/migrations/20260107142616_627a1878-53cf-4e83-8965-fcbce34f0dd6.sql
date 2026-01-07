-- Add INSTALLATION to the project_type enum
ALTER TYPE projects.project_type ADD VALUE IF NOT EXISTS 'INSTALLATION';