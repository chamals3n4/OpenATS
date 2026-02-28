CREATE TYPE user_role AS ENUM (
  'super_admin',     
  'hiring_manager',  
  'interviewer'    
);

CREATE TYPE employment_type AS ENUM (
  'full_time',
  'part_time',
  'contract',
  'internship',
  'freelance'
);

CREATE TYPE salary_type AS ENUM (
  'range',   
  'fixed'    
  -- NULL on the column means "no salary info disclosed"
);

-- Pay cycle for a salary
CREATE TYPE pay_frequency AS ENUM (
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly'
);

CREATE TYPE job_status AS ENUM (
  'draft',
  'inactive',     
  'published',  
  'closed',     
  'archived'
);


CREATE TYPE stage_type AS ENUM (
  'none',       
  'offer',      
  'rejection'
);


CREATE TYPE offer_mode AS ENUM (
  'auto_draft',  
  'auto_send' 
);

CREATE TYPE offer_status AS ENUM (
  'draft',      
  'sent',       
  'pending',   
  'accepted',   
  'declined',   
  'withdrawn'
);

CREATE TYPE question_type AS ENUM (
  'short_answer',    
  'long_answer',     
  'checkbox',       
  'radio',          
  'multiple_choice'
);

CREATE TYPE template_type AS ENUM (
  'offer',              
  'rejection',          
  'assessment_invite',  
  'general'         
);

CREATE TYPE assessment_status AS ENUM (
  'pending',    -- invite sent
  'started',    
  'completed', 
  'expired'   
);


CREATE TYPE cv_analysis_status AS ENUM (
  'pending',  
  'done',     
  'failed'
);

CREATE TABLE company (
  id          SERIAL        PRIMARY KEY,

  name        VARCHAR(255)  NOT NULL,
  email       VARCHAR(255)  NOT NULL,
  website     VARCHAR(500),
  phone       VARCHAR(50),
  address     TEXT,
  description TEXT,

  -- CF R2 URL
  logo_url    VARCHAR(1000),

  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE departments (
  id          SERIAL        PRIMARY KEY,

  company_id  INT           NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  name        VARCHAR(255)  NOT NULL,

  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (company_id, name)  -- duplicating department names not allowed
);

CREATE TABLE users (
  id                  SERIAL        PRIMARY KEY,

  --`sub` claim from the asgardeo jwt
  asgardeo_user_id    VARCHAR(255)  NOT NULL UNIQUE,

  first_name          VARCHAR(100)  NOT NULL,
  last_name           VARCHAR(100)  NOT NULL,
  email               VARCHAR(255)  NOT NULL UNIQUE,

  avatar_url          VARCHAR(1000),

  role                user_role     NOT NULL DEFAULT 'interviewer',

  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE pipeline_stage_templates (
  id           SERIAL       PRIMARY KEY,

  name         VARCHAR(100) NOT NULL UNIQUE,  -- e.g. "screening", "fffer"
  position     INT          NOT NULL,         -- default order; 1 = leftmost on kanban board
  stage_type   stage_type   NOT NULL DEFAULT 'none',

  is_deletable BOOLEAN      NOT NULL DEFAULT TRUE,

  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- default pipeline — seeded once at deployment time
INSERT INTO pipeline_stage_templates (name, position, stage_type, is_deletable) VALUES
  ('Applied',     1, 'none',      FALSE),
  ('Screening',   2, 'none',      TRUE),
  ('Interviewed', 3, 'none',      TRUE),
  ('Offer',       4, 'offer',     TRUE),
  ('Rejected',    5, 'rejection', FALSE);


-- Supported block types:
--   heading | text | button | image | divider | spacer


-- Supported template variables
--   {{candidate_name}} {{job_title}} {{salary}} {{currency}}
--   {{start_date}} {{expiry_date}} {{company_name}}

CREATE TABLE templates (
  id          SERIAL         PRIMARY KEY,

  name        VARCHAR(255)   NOT NULL,
  type        template_type  NOT NULL,

  -- Email subject; supports the same {{variables}} as body_json
  subject     VARCHAR(500)   NOT NULL,

  -- [
  --   { "type": "heading",  "content": "Offer Letter — {{job_title}}" },
  --   { "type": "text",     "content": "Dear {{candidate_name}}," },
  --   { "type": "button",   "label": "Accept Offer", "url": "{{offer_url}}" },
  --   { "type": "divider" },
  --   { "type": "spacer",   "height": 16 }
  -- ]
  body_json   JSONB          NOT NULL DEFAULT '[]',

  created_by  INT            NOT NULL REFERENCES users(id),

  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);


CREATE TABLE jobs (
  id               SERIAL           PRIMARY KEY,

  slug             VARCHAR(255)     NOT NULL UNIQUE,

  title            VARCHAR(255)     NOT NULL,
  department_id    INT              NOT NULL REFERENCES departments(id),
  employment_type  employment_type  NOT NULL,
  location         VARCHAR(255),

  -- WYSIWYG
  description      TEXT,

  -- salary_type NULL  → no salary info
  -- salary_type fixed → salary_fixed required; salary_min/max must be NULL
  -- salary_type range → salary_min + salary_max required; salary_fixed must be NULL
  salary_type      salary_type,
  currency         CHAR(3),        
  pay_frequency    pay_frequency,
  salary_fixed     NUMERIC(12, 2),
  salary_min       NUMERIC(12, 2),
  salary_max       NUMERIC(12, 2),

  status           job_status        NOT NULL DEFAULT 'draft',

  created_by       INT               NOT NULL REFERENCES users(id),

  created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  -- salary consistency guards
  CONSTRAINT chk_salary_range    CHECK (
    salary_type != 'range'  OR (salary_min IS NOT NULL AND salary_max IS NOT NULL)
  ),
  CONSTRAINT chk_salary_fixed    CHECK (
    salary_type != 'fixed'  OR salary_fixed IS NOT NULL
  ),
  CONSTRAINT chk_salary_currency CHECK (
    salary_type IS NULL     OR currency IS NOT NULL
  ),
  CONSTRAINT chk_salary_min_max  CHECK (
    salary_min IS NULL OR salary_max IS NULL OR salary_max >= salary_min
  )
);


CREATE TABLE job_skills (
  id      SERIAL        PRIMARY KEY,
  job_id  INT           NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill   VARCHAR(100)  NOT NULL,

  UNIQUE (job_id, skill)
);


-- IMPORTANT — Drizzle forward-reference note:
--   This table references templates(id). Because templates is defined above
--   in this file, the FK is safe in SQL. In Drizzle, declare both tables first
--   then wire relations() separately to avoid circular import issues.
CREATE TABLE job_pipeline_stages (
  id                     SERIAL       PRIMARY KEY,

  job_id                 INT          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Copied from pipeline_stage_templates.name at job creation; can be renamed per-job
  name                   VARCHAR(100) NOT NULL,

  -- Position within THIS job's pipeline (1 = leftmost kanban column)
  position               INT          NOT NULL,

  stage_type             stage_type   NOT NULL DEFAULT 'none',


  offer_template_id      INT          REFERENCES templates(id) ON DELETE SET NULL,
  offer_mode             offer_mode,
  offer_expiry_days      INT,

  rejection_template_id  INT          REFERENCES templates(id) ON DELETE SET NULL,
  source_template_id     INT          REFERENCES pipeline_stage_templates(id) ON DELETE SET NULL,

  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (job_id, position)
);


CREATE TABLE job_hiring_team (
  id       SERIAL      PRIMARY KEY,

  job_id   INT         NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id  INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (job_id, user_id)
);


CREATE TABLE assessments (
  id           SERIAL        PRIMARY KEY,

  title        VARCHAR(255)  NOT NULL,
  description  TEXT,

  time_limit   INT           NOT NULL,

  pass_score   NUMERIC(5, 2) NOT NULL,

  created_by   INT           NOT NULL REFERENCES users(id),

  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_questions (
  id             SERIAL         PRIMARY KEY,

  assessment_id  INT            NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,

  title          VARCHAR(500)   NOT NULL, 
  description    TEXT,                   

  -- 'short_answer' for free-text; 'multiple_choice' for option-based
  question_type  question_type  NOT NULL,

  points         NUMERIC(6, 2)  NOT NULL DEFAULT 1,

  position       INT            NOT NULL,

  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);


CREATE TABLE assessment_question_options (
  id           SERIAL        PRIMARY KEY,

  question_id  INT           NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,

  label        VARCHAR(500)  NOT NULL,
  is_correct   BOOLEAN       NOT NULL DEFAULT FALSE,

  position     INT           NOT NULL,

  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


CREATE TABLE job_custom_questions (
  id             SERIAL         PRIMARY KEY,

  job_id         INT            NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  title          VARCHAR(500)   NOT NULL,
  question_type  question_type  NOT NULL,
  is_required    BOOLEAN        NOT NULL DEFAULT FALSE,

  position       INT            NOT NULL,

  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);



CREATE TABLE job_custom_question_options (
  id           SERIAL        PRIMARY KEY,

  question_id  INT           NOT NULL REFERENCES job_custom_questions(id) ON DELETE CASCADE,

  label        VARCHAR(500)  NOT NULL,

  -- Optionally flag a correct answer for evaluation purposes
  is_correct   BOOLEAN       NOT NULL DEFAULT FALSE,

  position     INT           NOT NULL,

  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE job_assessment_attachments (
  id                SERIAL      PRIMARY KEY,

  job_id            INT         NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  assessment_id     INT         NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,

  trigger_stage_id  INT         NOT NULL REFERENCES job_pipeline_stages(id) ON DELETE CASCADE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (job_id, trigger_stage_id)
);

CREATE TABLE candidates (
  id                SERIAL        PRIMARY KEY,

  first_name        VARCHAR(100)  NOT NULL,
  last_name         VARCHAR(100)  NOT NULL,
  email             VARCHAR(255)  NOT NULL,
  phone             VARCHAR(50),

  resume_url        VARCHAR(1000),

  job_id            INT           NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,

  current_stage_id  INT           REFERENCES job_pipeline_stages(id) ON DELETE SET NULL,

  applied_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_stage_history (
  id            SERIAL      PRIMARY KEY,

  candidate_id  INT         NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  stage_id      INT         NOT NULL REFERENCES job_pipeline_stages(id) ON DELETE RESTRICT,

  moved_by      INT         REFERENCES users(id) ON DELETE SET NULL,

  moved_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE candidate_custom_answers (
  id           SERIAL      PRIMARY KEY,

  candidate_id INT         NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  question_id  INT         NOT NULL REFERENCES job_custom_questions(id) ON DELETE CASCADE,

  answer_text  TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (candidate_id, question_id)
);

CREATE TABLE candidate_custom_answer_selections (
  id           SERIAL      PRIMARY KEY,

  candidate_id INT         NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  question_id  INT         NOT NULL REFERENCES job_custom_questions(id) ON DELETE CASCADE,
  option_id    INT         NOT NULL REFERENCES job_custom_question_options(id) ON DELETE CASCADE,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (candidate_id, question_id, option_id)
);


CREATE TABLE candidate_assessment_attempts (
  id                      SERIAL             PRIMARY KEY,

  candidate_id            INT                NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  assessment_id           INT                NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,

  -- random token embedded in the invite email URL - crypto.randomBytes(32).toString('hex')
  token                   VARCHAR(255)       NOT NULL UNIQUE,

  status                  assessment_status  NOT NULL DEFAULT 'pending',

  expires_at              TIMESTAMPTZ        NOT NULL,

  started_at              TIMESTAMPTZ,       -- set when candidate opens the assessment
  completed_at            TIMESTAMPTZ,       -- set when candidate submits answers

  score_raw               NUMERIC(8, 2),     -- total points earned
  score_total             NUMERIC(8, 2),     -- snapshot of max possible points at attempt time
  score_percentage        NUMERIC(5, 2),     -- (score_raw / score_total) * 100
  passed                  BOOLEAN,           -- TRUE if score_percentage >= assessments.pass_score

  candidate_name_input    VARCHAR(255),
  candidate_email_input   VARCHAR(255),

  created_at              TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_assessment_answers (
  id            SERIAL       PRIMARY KEY,

  attempt_id    INT          NOT NULL REFERENCES candidate_assessment_attempts(id) ON DELETE CASCADE,
  question_id   INT          NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,

  answer_text   TEXT,

  points_earned NUMERIC(6, 2),

  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (attempt_id, question_id)
);

CREATE TABLE candidate_assessment_answer_selections (
  id         SERIAL      PRIMARY KEY,

  answer_id  INT         NOT NULL REFERENCES candidate_assessment_answers(id) ON DELETE CASCADE,
  option_id  INT         NOT NULL REFERENCES assessment_question_options(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (answer_id, option_id)
);

CREATE TABLE candidate_cv_analysis (
  id               SERIAL             PRIMARY KEY,

  candidate_id     INT                NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id           INT                NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  match_score      NUMERIC(5, 2),

  matched_skills   JSONB              NOT NULL DEFAULT '[]',

  missing_skills   JSONB              NOT NULL DEFAULT '[]',

  extracted_text   TEXT,

  status           cv_analysis_status NOT NULL DEFAULT 'pending',

  error_message    TEXT,

  created_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

  UNIQUE (candidate_id)
);

CREATE TABLE offers (
  id             SERIAL        PRIMARY KEY,

  candidate_id   INT           NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  job_id         INT           NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  template_id    INT           REFERENCES templates(id) ON DELETE SET NULL,

  status         offer_status  NOT NULL DEFAULT 'draft',

  salary         NUMERIC(12, 2),
  currency       CHAR(3),          -- ISO 4217
  pay_frequency  pay_frequency,

  start_date     DATE,             
  expiry_date    DATE,           

  rendered_html  TEXT,
  sent_at        TIMESTAMPTZ, 
  created_by     INT           NOT NULL REFERENCES users(id),

  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


CREATE TABLE email_messages (
  id               SERIAL        PRIMARY KEY,

  candidate_id     INT           NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  sent_by          INT           REFERENCES users(id) ON DELETE SET NULL,

  template_id      INT           REFERENCES templates(id) ON DELETE SET NULL,

  subject          VARCHAR(500)  NOT NULL,
  body_html        TEXT          NOT NULL,

  recipient_email  VARCHAR(255)  NOT NULL,

  sent_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


CREATE TABLE job_chat_messages (
  id           SERIAL      PRIMARY KEY,

  job_id       INT         NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  sender_id    INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  message      TEXT,

  reply_to_id  INT         REFERENCES job_chat_messages(id) ON DELETE SET NULL,

  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  is_deleted   BOOLEAN     NOT NULL DEFAULT FALSE
);


-- indexing

CREATE INDEX idx_users_asgardeo      ON users(asgardeo_user_id);
CREATE INDEX idx_users_email         ON users(email);

CREATE INDEX idx_jobs_slug           ON jobs(slug);
CREATE INDEX idx_jobs_status         ON jobs(status);                      
CREATE INDEX idx_jobs_department     ON jobs(department_id);
CREATE INDEX idx_jobs_created_by     ON jobs(created_by);

CREATE INDEX idx_pipeline_job        ON job_pipeline_stages(job_id);

CREATE INDEX idx_hiring_team_job     ON job_hiring_team(job_id);
CREATE INDEX idx_hiring_team_user    ON job_hiring_team(user_id);

CREATE INDEX idx_templates_type      ON templates(type);

CREATE INDEX idx_aq_assessment       ON assessment_questions(assessment_id);

CREATE INDEX idx_candidates_job      ON candidates(job_id);
CREATE INDEX idx_candidates_stage    ON candidates(current_stage_id);
CREATE INDEX idx_candidates_email    ON candidates(email);
CREATE INDEX idx_candidates_applied  ON candidates(applied_at DESC);      

CREATE INDEX idx_stage_hist_cand     ON candidate_stage_history(candidate_id);
CREATE INDEX idx_stage_hist_stage    ON candidate_stage_history(stage_id);
CREATE INDEX idx_stage_hist_moved_at ON candidate_stage_history(moved_at DESC);

CREATE INDEX idx_attempts_candidate  ON candidate_assessment_attempts(candidate_id);
CREATE INDEX idx_attempts_token      ON candidate_assessment_attempts(token);     
CREATE INDEX idx_attempts_status     ON candidate_assessment_attempts(status);
CREATE INDEX idx_attempts_expires    ON candidate_assessment_attempts(expires_at);  

CREATE INDEX idx_cv_candidate        ON candidate_cv_analysis(candidate_id);
CREATE INDEX idx_cv_job              ON candidate_cv_analysis(job_id);
CREATE INDEX idx_cv_score            ON candidate_cv_analysis(match_score DESC);
CREATE INDEX idx_cv_status           ON candidate_cv_analysis(status);             

CREATE INDEX idx_offers_candidate    ON offers(candidate_id);
CREATE INDEX idx_offers_job          ON offers(job_id);
CREATE INDEX idx_offers_status       ON offers(status);                  
CREATE INDEX idx_offers_sent_at      ON offers(sent_at DESC);             
CREATE INDEX idx_offers_created_at   ON offers(created_at DESC);         

CREATE INDEX idx_emails_candidate    ON email_messages(candidate_id);
CREATE INDEX idx_emails_sent_at      ON email_messages(sent_at DESC);

CREATE INDEX idx_chat_job            ON job_chat_messages(job_id);
CREATE INDEX idx_chat_job_time       ON job_chat_messages(job_id, sent_at DESC);   


-- =============================================================================
-- DRIZZLE ORM IMPLEMENTATION NOTES
-- =============================================================================
--
-- 1. TABLE ORDER / FORWARD REFERENCES
--    templates is defined before job_pipeline_stages in this file so the FK
--    is safe in plain SQL. In Drizzle, if you split tables into separate files,
--    use the relations() helper and be careful about circular imports.
--    Recommended pattern: define all table objects first, then all relations()
--    calls in a separate relations.ts file.
--
-- 2. ENUMS
--    Each CREATE TYPE maps to pgEnum() in Drizzle:
--      export const userRole = pgEnum('user_role', ['super_admin', 'hiring_manager', 'interviewer'])
--    Import the enum into each table definition that uses it.
--
-- 3. JSONB COLUMNS
--    Use jsonb() in Drizzle with a TypeScript type cast:
--      bodyJson: jsonb('body_json').$type<ContentBlock[]>().notNull().default([])
--    Define the ContentBlock union type in a shared types file.
--
-- 4. NUMERIC COLUMNS
--    Drizzle returns numeric() columns as strings by default.
--    Either use .$type<number>() for automatic casting, or parse in the
--    service layer with parseFloat().
--
-- 5. PIPELINE SEEDING
--    The INSERT into pipeline_stage_templates should live in your db:seed script.
--    On job creation, run:
--      INSERT INTO job_pipeline_stages (job_id, name, position, stage_type, source_template_id)
--      SELECT $jobId, name, position, stage_type, id FROM pipeline_stage_templates
--      ORDER BY position
--    Also INSERT the creating user into job_hiring_team in the same transaction.
--
-- 6. OFFER AUTO_SEND GUARD (application layer)
--    Before setting offer_mode = 'auto_send', check:
--      - job.salary_type = 'fixed'  → auto_send allowed
--      - job.salary_type = 'range'  → downgrade to auto_draft
--      - job.salary_type IS NULL    → downgrade to auto_draft
--    Salary pre-fill logic:
--      - fixed  → salary_fixed
--      - range  → (salary_min + salary_max) / 2  (midpoint)
--      - NULL   → leave blank; manager must fill before sending
--
-- 7. ASSESSMENT TOKEN GENERATION (Node.js)
--      import crypto from 'crypto'
--      const token = crypto.randomBytes(32).toString('hex')
--      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
--    Make the expiry window configurable (env var: ASSESSMENT_TOKEN_TTL_DAYS).
--
-- 8. CV ANALYSIS ASYNC FLOW
--    On candidate insert:
--      a) Insert candidate row
--      b) Insert candidate_cv_analysis with status = 'pending'
--      c) Enqueue a background job (e.g. BullMQ) with candidate_id
--    Background job:
--      a) Fetch resume_url from R2
--      b) Extract text from PDF
--      c) Match extracted text against job_skills for that job
--      d) UPDATE candidate_cv_analysis SET status='done', match_score=...,
--             matched_skills=..., missing_skills=..., extracted_text=...
--         or  SET status='failed', error_message=...
--
-- 9. CANDIDATE STAGE HISTORY — ON DELETE RESTRICT
--    candidate_stage_history.stage_id uses ON DELETE RESTRICT.
--    Before deleting a custom pipeline stage, check for history rows and
--    either block the delete with a user-facing error or reassign history
--    rows to a replacement stage first.
--
-- 10. TIME-TO-HIRE QUERY PATTERN
--     SELECT
--       AVG(EXTRACT(EPOCH FROM (
--         (SELECT moved_at FROM candidate_stage_history
--          WHERE candidate_id = c.id AND stage_id IN (
--            SELECT id FROM job_pipeline_stages
--            WHERE stage_type = 'offer' AND job_id = c.job_id
--          )
--          ORDER BY moved_at LIMIT 1)
--         - c.applied_at
--       )) / 86400) AS avg_days_to_hire
--     FROM candidates c
--     WHERE c.job_id IN (SELECT id FROM jobs WHERE department_id = $deptId)