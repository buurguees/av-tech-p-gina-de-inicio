# ESTRUCTURA DE BASE DE DATOS

**Proyecto:** AV TECH ESDEVENIMENTS SL  
**Fecha de generación:** 2025-01-27

---

## ÍNDICE DE SCHEMAS

- [public](#schema-public)
- [auth](#schema-auth)
- [storage](#schema-storage)
- [crm](#schema-crm)
- [catalog](#schema-catalog)
- [quotes](#schema-quotes)
- [sales](#schema-sales)
- [projects](#schema-projects)
- [audit](#schema-audit)
- [security](#schema-security)

---

## SCHEMA: public

### Tabla: user_roles

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `user_id` (uuid, FK → auth.users.id)
- `role` (app_role enum: admin, comercial, tecnico)
- `created_at` (timestamptz, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `user_roles_user_id_fkey`: user_id → auth.users.id

---

## SCHEMA: auth

### Tabla: users

**RLS:** Habilitado  
**Comentario:** Auth: Stores user login data within a secure schema.

**Columnas:**
- `instance_id` (uuid, nullable)
- `id` (uuid, PK)
- `aud` (varchar, nullable)
- `role` (varchar, nullable)
- `email` (varchar, nullable)
- `encrypted_password` (varchar, nullable)
- `email_confirmed_at` (timestamptz, nullable)
- `invited_at` (timestamptz, nullable)
- `confirmation_token` (varchar, nullable)
- `confirmation_sent_at` (timestamptz, nullable)
- `recovery_token` (varchar, nullable)
- `recovery_sent_at` (timestamptz, nullable)
- `email_change_token_new` (varchar, nullable)
- `email_change` (varchar, nullable)
- `email_change_sent_at` (timestamptz, nullable)
- `last_sign_in_at` (timestamptz, nullable)
- `raw_app_meta_data` (jsonb, nullable)
- `raw_user_meta_data` (jsonb, nullable)
- `is_super_admin` (bool, nullable)
- `created_at` (timestamptz, nullable)
- `updated_at` (timestamptz, nullable)
- `phone` (text, nullable, unique, default: NULL::varchar)
- `phone_confirmed_at` (timestamptz, nullable)
- `phone_change` (text, nullable, default: ''::varchar)
- `phone_change_token` (varchar, nullable, default: ''::varchar)
- `phone_change_sent_at` (timestamptz, nullable)
- `confirmed_at` (timestamptz, generated, nullable, default: LEAST(email_confirmed_at, phone_confirmed_at))
- `email_change_token_current` (varchar, nullable, default: ''::varchar)
- `email_change_confirm_status` (int2, nullable, default: 0, check: >= 0 AND <= 2)
- `banned_until` (timestamptz, nullable)
- `reauthentication_token` (varchar, nullable, default: ''::varchar)
- `reauthentication_sent_at` (timestamptz, nullable)
- `is_sso_user` (bool, default: false) - Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.
- `deleted_at` (timestamptz, nullable)
- `is_anonymous` (bool, default: false)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- Referenciada por múltiples tablas (sessions, mfa_factors, one_time_tokens, oauth_authorizations, identities, oauth_consents, user_roles, contact_messages, logs, authorized_users)

### Tabla: refresh_tokens

**RLS:** Habilitado  
**Comentario:** Auth: Store of tokens used to refresh JWT tokens once they expire.

**Columnas:**
- `instance_id` (uuid, nullable)
- `id` (bigint, PK, default: nextval('auth.refresh_tokens_id_seq'::regclass))
- `token` (varchar, nullable, unique)
- `user_id` (varchar, nullable)
- `revoked` (bool, nullable)
- `created_at` (timestamptz, nullable)
- `updated_at` (timestamptz, nullable)
- `parent` (varchar, nullable)
- `session_id` (uuid, nullable, FK → auth.sessions.id)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `refresh_tokens_session_id_fkey`: session_id → auth.sessions.id

### Tabla: instances

**RLS:** Habilitado  
**Comentario:** Auth: Manages users across multiple sites.

**Columnas:**
- `id` (uuid, PK)
- `uuid` (uuid, nullable)
- `raw_base_config` (text, nullable)
- `created_at` (timestamptz, nullable)
- `updated_at` (timestamptz, nullable)

**Claves Primarias:**
- `id`

### Tabla: audit_log_entries

**RLS:** Habilitado  
**Comentario:** Auth: Audit trail for user actions.

**Columnas:**
- `instance_id` (uuid, nullable)
- `id` (uuid, PK)
- `payload` (json, nullable)
- `created_at` (timestamptz, nullable)
- `ip_address` (varchar, default: ''::varchar)

**Claves Primarias:**
- `id`

### Tabla: schema_migrations

**RLS:** Habilitado  
**Comentario:** Auth: Manages updates to the auth system.

**Columnas:**
- `version` (varchar, PK)

**Claves Primarias:**
- `version`

### Tabla: identities

**RLS:** Habilitado  
**Comentario:** Auth: Stores identities associated to a user.

**Columnas:**
- `provider_id` (text)
- `user_id` (uuid, FK → auth.users.id)
- `identity_data` (jsonb)
- `provider` (text)
- `last_sign_in_at` (timestamptz, nullable)
- `created_at` (timestamptz, nullable)
- `updated_at` (timestamptz, nullable)
- `email` (text, generated, nullable, default: lower((identity_data ->> 'email'::text))) - Auth: Email is a generated column that references the optional email property in the identity_data
- `id` (uuid, PK, default: gen_random_uuid())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `identities_user_id_fkey`: user_id → auth.users.id

### Tabla: sessions

**RLS:** Habilitado  
**Comentario:** Auth: Stores session data associated to a user.

**Columnas:**
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `created_at` (timestamptz, nullable)
- `updated_at` (timestamptz, nullable)
- `factor_id` (uuid, nullable)
- `aal` (aal_level enum: aal1, aal2, aal3, nullable)
- `not_after` (timestamptz, nullable) - Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.
- `refreshed_at` (timestamp, nullable)
- `user_agent` (text, nullable)
- `ip` (inet, nullable)
- `tag` (text, nullable)
- `oauth_client_id` (uuid, nullable, FK → auth.oauth_clients.id)
- `refresh_token_hmac_key` (text, nullable) - Holds a HMAC-SHA256 key used to sign refresh tokens for this session.
- `refresh_token_counter` (bigint, nullable) - Holds the ID (counter) of the last issued refresh token.
- `scopes` (text, nullable, check: char_length(scopes) <= 4096)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `sessions_user_id_fkey`: user_id → auth.users.id
- `sessions_oauth_client_id_fkey`: oauth_client_id → auth.oauth_clients.id

### Tabla: mfa_factors

**RLS:** Habilitado  
**Comentario:** auth: stores metadata about factors

**Columnas:**
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `friendly_name` (text, nullable)
- `factor_type` (factor_type enum: totp, webauthn, phone)
- `status` (factor_status enum: unverified, verified)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `secret` (text, nullable)
- `phone` (text, nullable)
- `last_challenged_at` (timestamptz, nullable, unique)
- `web_authn_credential` (jsonb, nullable)
- `web_authn_aaguid` (uuid, nullable)
- `last_webauthn_challenge_data` (jsonb, nullable) - Stores the latest WebAuthn challenge data including attestation/assertion for customer verification

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `mfa_factors_user_id_fkey`: user_id → auth.users.id

### Tabla: mfa_challenges

**RLS:** Habilitado  
**Comentario:** auth: stores metadata about challenge requests made

**Columnas:**
- `id` (uuid, PK)
- `factor_id` (uuid, FK → auth.mfa_factors.id)
- `created_at` (timestamptz)
- `verified_at` (timestamptz, nullable)
- `ip_address` (inet)
- `otp_code` (text, nullable)
- `web_authn_session_data` (jsonb, nullable)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `mfa_challenges_auth_factor_id_fkey`: factor_id → auth.mfa_factors.id

### Tabla: mfa_amr_claims

**RLS:** Habilitado  
**Comentario:** auth: stores authenticator method reference claims for multi factor authentication

**Columnas:**
- `session_id` (uuid, FK → auth.sessions.id)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `authentication_method` (text)
- `id` (uuid, PK)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `mfa_amr_claims_session_id_fkey`: session_id → auth.sessions.id

### Tabla: sso_providers

**RLS:** Habilitado  
**Comentario:** Auth: Manages SSO identity provider information; see saml_providers for SAML.

**Columnas:**
- `id` (uuid, PK)
- `resource_id` (text, nullable, check: resource_id = NULL::text OR char_length(resource_id) > 0) - Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.
- `created_at` (timestamptz, nullable)
- `updated_at` (timestamptz, nullable)
- `disabled` (bool, nullable)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- Referenciada por: sso_domains, saml_relay_states, saml_providers

### Tabla: sso_domains

**RLS:** Habilitado  
**Comentario:** Auth: Manages SSO email address domain mapping to an SSO Identity Provider.

**Columnas:**
- `id` (uuid, PK)
- `sso_provider_id` (uuid, FK → auth.sso_providers.id)
- `domain` (text, check: char_length(domain) > 0)
- `created_at` (timestamptz, nullable)
- `updated_at` (timestamptz, nullable)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `sso_domains_sso_provider_id_fkey`: sso_provider_id → auth.sso_providers.id

### Tabla: saml_providers

**RLS:** Habilitado  
**Comentario:** Auth: Manages SAML Identity Provider connections.

**Columnas:**
- `id` (uuid, PK)
- `sso_provider_id` (uuid, FK → auth.sso_providers.id)
- `entity_id` (text, unique, check: char_length(entity_id) > 0)
- `metadata_xml` (text, check: char_length(metadata_xml) > 0)
- `metadata_url` (text, nullable, check: metadata_url = NULL::text OR char_length(metadata_url) > 0)
- `attribute_mapping` (jsonb, nullable)
- `created_at` (timestamptz, nullable)
- `updated_at` (timestamptz, nullable)
- `name_id_format` (text, nullable)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `saml_providers_sso_provider_id_fkey`: sso_provider_id → auth.sso_providers.id

### Tabla: saml_relay_states

**RLS:** Habilitado  
**Comentario:** Auth: Contains SAML Relay State information for each Service Provider initiated login.

**Columnas:**
- `id` (uuid, PK)
- `sso_provider_id` (uuid, FK → auth.sso_providers.id)
- `request_id` (text, check: char_length(request_id) > 0)
- `for_email` (text, nullable)
- `redirect_to` (text, nullable)
- `created_at` (timestamptz, nullable)
- `updated_at` (timestamptz, nullable)
- `flow_state_id` (uuid, nullable, FK → auth.flow_state.id)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `saml_relay_states_sso_provider_id_fkey`: sso_provider_id → auth.sso_providers.id
- `saml_relay_states_flow_state_id_fkey`: flow_state_id → auth.flow_state.id

### Tabla: flow_state

**RLS:** Habilitado  
**Comentario:** stores metadata for pkce logins

**Columnas:**
- `id` (uuid, PK)
- `user_id` (uuid, nullable)
- `auth_code` (text)
- `code_challenge_method` (code_challenge_method enum: s256, plain)
- `code_challenge` (text)
- `provider_type` (text)
- `provider_access_token` (text, nullable)
- `provider_refresh_token` (text, nullable)
- `created_at` (timestamptz, nullable)
- `updated_at` (timestamptz, nullable)
- `authentication_method` (text)
- `auth_code_issued_at` (timestamptz, nullable)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- Referenciada por: saml_relay_states

### Tabla: one_time_tokens

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `token_type` (one_time_token_type enum: confirmation_token, reauthentication_token, recovery_token, email_change_token_new, email_change_token_current, phone_change_token)
- `token_hash` (text, check: char_length(token_hash) > 0)
- `relates_to` (text)
- `created_at` (timestamp, default: now())
- `updated_at` (timestamp, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `one_time_tokens_user_id_fkey`: user_id → auth.users.id

### Tabla: oauth_clients

**RLS:** Deshabilitado

**Columnas:**
- `id` (uuid, PK)
- `client_secret_hash` (text, nullable)
- `registration_type` (oauth_registration_type enum: dynamic, manual)
- `redirect_uris` (text)
- `grant_types` (text)
- `client_name` (text, nullable, check: char_length(client_name) <= 1024)
- `client_uri` (text, nullable, check: char_length(client_uri) <= 2048)
- `logo_uri` (text, nullable, check: char_length(logo_uri) <= 2048)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())
- `deleted_at` (timestamptz, nullable)
- `client_type` (oauth_client_type enum: public, confidential, default: 'confidential'::auth.oauth_client_type)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- Referenciada por: oauth_consents, sessions, oauth_authorizations

### Tabla: oauth_authorizations

**RLS:** Deshabilitado

**Columnas:**
- `id` (uuid, PK)
- `authorization_id` (text, unique)
- `client_id` (uuid, FK → auth.oauth_clients.id)
- `user_id` (uuid, nullable, FK → auth.users.id)
- `redirect_uri` (text, check: char_length(redirect_uri) <= 2048)
- `scope` (text, check: char_length(scope) <= 4096)
- `state` (text, nullable, check: char_length(state) <= 4096)
- `resource` (text, nullable, check: char_length(resource) <= 2048)
- `code_challenge` (text, nullable, check: char_length(code_challenge) <= 128)
- `code_challenge_method` (code_challenge_method enum: s256, plain, nullable)
- `response_type` (oauth_response_type enum: code, default: 'code'::auth.oauth_response_type)
- `status` (oauth_authorization_status enum: pending, approved, denied, expired, default: 'pending'::auth.oauth_authorization_status)
- `authorization_code` (text, nullable, unique, check: char_length(authorization_code) <= 255)
- `created_at` (timestamptz, default: now())
- `expires_at` (timestamptz, default: (now() + '00:03:00'::interval))
- `approved_at` (timestamptz, nullable)
- `nonce` (text, nullable, check: char_length(nonce) <= 255)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `oauth_authorizations_user_id_fkey`: user_id → auth.users.id
- `oauth_authorizations_client_id_fkey`: client_id → auth.oauth_clients.id

### Tabla: oauth_consents

**RLS:** Deshabilitado

**Columnas:**
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users.id)
- `client_id` (uuid, FK → auth.oauth_clients.id)
- `scopes` (text, check: char_length(scopes) <= 2048)
- `granted_at` (timestamptz, default: now())
- `revoked_at` (timestamptz, nullable)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `oauth_consents_user_id_fkey`: user_id → auth.users.id
- `oauth_consents_client_id_fkey`: client_id → auth.oauth_clients.id

### Tabla: oauth_client_states

**RLS:** Deshabilitado  
**Comentario:** Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.

**Columnas:**
- `id` (uuid, PK)
- `provider_type` (text)
- `code_verifier` (text, nullable)
- `created_at` (timestamptz)

**Claves Primarias:**
- `id`

---

## SCHEMA: storage

### Tabla: migrations

**RLS:** Habilitado

**Columnas:**
- `id` (integer, PK)
- `name` (varchar, unique)
- `hash` (varchar)
- `executed_at` (timestamp, nullable, default: CURRENT_TIMESTAMP)

**Claves Primarias:**
- `id`

### Tabla: buckets

**RLS:** Habilitado

**Columnas:**
- `id` (text, PK)
- `name` (text)
- `owner` (uuid, nullable) - Field is deprecated, use owner_id instead
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())
- `public` (bool, nullable, default: false)
- `avif_autodetection` (bool, nullable, default: false)
- `file_size_limit` (bigint, nullable)
- `allowed_mime_types` (text[], nullable)
- `owner_id` (text, nullable)
- `type` (buckettype enum: STANDARD, ANALYTICS, VECTOR, default: 'STANDARD'::storage.buckettype)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- Referenciada por: prefixes, objects, s3_multipart_uploads, s3_multipart_uploads_parts

### Tabla: objects

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `bucket_id` (text, nullable, FK → storage.buckets.id)
- `name` (text, nullable)
- `owner` (uuid, nullable) - Field is deprecated, use owner_id instead
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())
- `last_accessed_at` (timestamptz, nullable, default: now())
- `metadata` (jsonb, nullable)
- `path_tokens` (text[], generated, nullable, default: string_to_array(name, '/'::text))
- `version` (text, nullable)
- `owner_id` (text, nullable)
- `user_metadata` (jsonb, nullable)
- `level` (integer, nullable)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `objects_bucketId_fkey`: bucket_id → storage.buckets.id

### Tabla: s3_multipart_uploads

**RLS:** Habilitado

**Columnas:**
- `id` (text, PK)
- `in_progress_size` (bigint, default: 0)
- `upload_signature` (text)
- `bucket_id` (text, FK → storage.buckets.id)
- `key` (text)
- `version` (text)
- `owner_id` (text, nullable)
- `created_at` (timestamptz, default: now())
- `user_metadata` (jsonb, nullable)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `s3_multipart_uploads_bucket_id_fkey`: bucket_id → storage.buckets.id

### Tabla: s3_multipart_uploads_parts

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `upload_id` (text, FK → storage.s3_multipart_uploads.id)
- `size` (bigint, default: 0)
- `part_number` (integer)
- `bucket_id` (text, FK → storage.buckets.id)
- `key` (text)
- `etag` (text)
- `owner_id` (text, nullable)
- `version` (text)
- `created_at` (timestamptz, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `s3_multipart_uploads_parts_upload_id_fkey`: upload_id → storage.s3_multipart_uploads.id
- `s3_multipart_uploads_parts_bucket_id_fkey`: bucket_id → storage.buckets.id

### Tabla: prefixes

**RLS:** Habilitado

**Columnas:**
- `bucket_id` (text, FK → storage.buckets.id)
- `name` (text)
- `level` (integer, generated, default: storage.get_level(name))
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())

**Claves Primarias:**
- `bucket_id`, `name`, `level`

**Claves Foráneas:**
- `prefixes_bucketId_fkey`: bucket_id → storage.buckets.id

### Tabla: buckets_analytics

**RLS:** Habilitado

**Columnas:**
- `name` (text)
- `type` (buckettype enum: STANDARD, ANALYTICS, VECTOR, default: 'ANALYTICS'::storage.buckettype)
- `format` (text, default: 'ICEBERG'::text)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())
- `id` (uuid, PK, default: gen_random_uuid())
- `deleted_at` (timestamptz, nullable)

**Claves Primarias:**
- `id`

### Tabla: buckets_vectors

**RLS:** Habilitado

**Columnas:**
- `id` (text, PK)
- `type` (buckettype enum: STANDARD, ANALYTICS, VECTOR, default: 'VECTOR'::storage.buckettype)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- Referenciada por: vector_indexes

### Tabla: vector_indexes

**RLS:** Habilitado

**Columnas:**
- `id` (text, PK, default: gen_random_uuid())
- `name` (text)
- `bucket_id` (text, FK → storage.buckets_vectors.id)
- `data_type` (text)
- `dimension` (integer)
- `distance_metric` (text)
- `metadata_configuration` (jsonb, nullable)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `vector_indexes_bucket_id_fkey`: bucket_id → storage.buckets_vectors.id

---

## SCHEMA: crm

### Tabla: contact_messages

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `nombre` (text)
- `empresa` (text, nullable)
- `email` (text)
- `telefono` (text, nullable)
- `tipo_solicitud` (text, check: tipo_solicitud = ANY (ARRAY['presupuesto'::text, 'visita'::text]))
- `tipo_espacio` (text, nullable, check: tipo_espacio = ANY (ARRAY['retail'::text, 'corporativo'::text, 'evento'::text, 'otro'::text]))
- `mensaje` (text, nullable)
- `created_at` (timestamptz, default: now())
- `ip_address` (inet, nullable)
- `user_agent` (text, nullable)
- `status` (text, default: 'nuevo'::text, check: status = ANY (ARRAY['nuevo'::text, 'contactado'::text, 'en_proceso'::text, 'cerrado'::text, 'descartado'::text]))
- `assigned_to` (uuid, nullable, FK → auth.users.id)
- `notas_internas` (text, nullable)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `contact_messages_assigned_to_fkey`: assigned_to → auth.users.id

### Tabla: lead_sources

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `code` (text, unique)
- `display_name` (text)
- `description` (text, nullable)
- `is_active` (bool, nullable, default: true)
- `cost_per_lead` (numeric, nullable)
- `conversion_rate` (numeric, nullable)
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())

**Claves Primarias:**
- `id`

### Tabla: clients

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `company_name` (text)
- `contact_phone` (text)
- `contact_email` (text, check: contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$'::text)
- `tax_id` (text, nullable, unique)
- `legal_name` (text, nullable)
- `billing_address` (text, nullable)
- `billing_city` (text, nullable)
- `billing_province` (text, nullable)
- `billing_postal_code` (text, nullable)
- `billing_country` (text, nullable, default: 'ES'::text)
- `website` (text, nullable)
- `instagram_handle` (text, nullable)
- `tiktok_handle` (text, nullable)
- `linkedin_url` (text, nullable)
- `number_of_locations` (integer, nullable, default: 1, check: number_of_locations >= 1)
- `industry_sector` (industry_sector enum: RETAIL, HOSPITALITY, GYM, OFFICE, EVENTS, EDUCATION, HEALTHCARE, OTHER, DIGITAL_SIGNAGE, nullable)
- `approximate_budget` (numeric, nullable, check: approximate_budget IS NULL OR approximate_budget >= 0::numeric)
- `urgency` (urgency_level enum: LOW, MEDIUM, HIGH, URGENT, nullable)
- `target_objectives` (text[], nullable)
- `lead_stage` (lead_stage enum: NEW, CONTACTED, MEETING, PROPOSAL, NEGOTIATION, WON, LOST, PAUSED, RECURRING, default: 'NEW'::crm.lead_stage)
- `lead_source` (lead_source enum: WEBSITE, INSTAGRAM, REFERRAL, OUTBOUND, TRADE_SHOW, PARTNER, LINKEDIN, OTHER, COMMERCIAL, nullable)
- `profile_completeness_score` (integer, nullable, default: 30, check: profile_completeness_score >= 0 AND profile_completeness_score <= 100)
- `assigned_to` (uuid, nullable, FK → internal.authorized_users.id)
- `next_follow_up_date` (date, nullable)
- `estimated_close_date` (date, nullable)
- `lost_reason` (text, nullable)
- `notes` (text, nullable)
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())
- `created_by` (uuid, nullable, FK → internal.authorized_users.id)
- `deleted_at` (timestamptz, nullable)
- `client_number` (text, nullable, unique)
- `latitude` (numeric, nullable)
- `longitude` (numeric, nullable)
- `full_address` (text, nullable)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `clients_assigned_to_fkey`: assigned_to → internal.authorized_users.id
- `clients_created_by_fkey`: created_by → internal.authorized_users.id
- Referenciada por: contacts, interactions, client_notes, invoices, projects

### Tabla: contacts

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `client_id` (uuid, FK → crm.clients.id)
- `full_name` (text)
- `job_title` (text, nullable)
- `email` (text, nullable)
- `phone` (text, nullable)
- `is_primary` (bool, nullable, default: false)
- `contact_type` (contact_type enum: DECISION_MAKER, TECHNICAL, FINANCIAL, ADMINISTRATIVE, nullable)
- `notes` (text, nullable)
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `contacts_client_id_fkey`: client_id → crm.clients.id

### Tabla: interactions

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `client_id` (uuid, FK → crm.clients.id)
- `interaction_type` (interaction_type enum: CALL, EMAIL, MEETING, VISIT, WHATSAPP, OTHER)
- `interaction_date` (timestamptz)
- `duration_minutes` (integer, nullable, check: duration_minutes IS NULL OR duration_minutes >= 0 AND duration_minutes <= 480)
- `subject` (text, nullable)
- `notes` (text, nullable)
- `outcome` (interaction_outcome enum: POSITIVE, NEUTRAL, NEGATIVE, FOLLOW_UP_NEEDED, nullable)
- `next_action` (text, nullable)
- `created_by` (uuid, FK → internal.authorized_users.id)
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `interactions_client_id_fkey`: client_id → crm.clients.id
- `interactions_created_by_fkey`: created_by → internal.authorized_users.id

### Tabla: client_notes

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `client_id` (uuid, FK → crm.clients.id)
- `note_type` (text, check: note_type = ANY (ARRAY['manual'::text, 'status_change'::text, 'reassignment'::text, 'creation'::text]))
- `content` (text)
- `previous_status` (text, nullable)
- `new_status` (text, nullable)
- `previous_assignee_id` (uuid, nullable)
- `previous_assignee_name` (text, nullable)
- `new_assignee_id` (uuid, nullable)
- `new_assignee_name` (text, nullable)
- `user_id` (uuid)
- `user_name` (text)
- `created_at` (timestamptz, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `client_notes_client_id_fkey`: client_id → crm.clients.id

### Tabla: location

**RLS:** Habilitado  
**Comentario:** Puntos de Canvassing marcados por comerciales en el mapa. Cada punto está asociado únicamente al usuario que lo crea.

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `created_by` (uuid, FK → internal.authorized_users.id) - Usuario que creó el punto. Solo este usuario puede verlo (excepto admin/manager).
- `status` (canvassing_status enum: CB, CX, GB, NH, NI, OTH, DK, RNT, INT, APP) - Estado del lead según el pin seleccionado (CB, CX, GB, NH, NI, OTH, DK, RNT, INT, APP, PRES, NEG)
- `address` (text, nullable)
- `city` (text, nullable)
- `province` (text, nullable)
- `postal_code` (text, nullable)
- `country` (text, nullable, default: 'ES'::text)
- `latitude` (numeric)
- `longitude` (numeric)
- `location_references` (text, nullable)
- `company_name` (text)
- `business_type` (business_type enum: RETAIL, RESTAURANT, HOTEL, OFFICE, SHOPPING_MALL, GYM, CLINIC, DEALERSHIP, SHOWROOM, WAREHOUSE, EDUCATION, OTHER, nullable)
- `business_size_sqm` (numeric, nullable, check: business_size_sqm IS NULL OR business_size_sqm > 0::numeric)
- `business_floors` (integer, nullable, check: business_floors IS NULL OR business_floors > 0)
- `business_hours` (text, nullable)
- `years_in_operation` (integer, nullable, check: years_in_operation IS NULL OR years_in_operation >= 0)
- `contact_first_name` (text, nullable)
- `contact_last_name` (text, nullable)
- `contact_position` (text, nullable)
- `contact_phone_primary` (text, nullable)
- `contact_phone_secondary` (text, nullable)
- `contact_email_primary` (text, nullable, check: contact_email_primary IS NULL OR contact_email_primary ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$'::text)
- `preferred_contact_method` (contact_method enum: PHONE, EMAIL, SMS, WHATSAPP, nullable)
- `best_contact_time` (contact_time enum: MORNING, AFTERNOON, EVENING, nullable)
- `is_decision_maker` (bool, nullable, default: false)
- `secondary_contact_name` (text, nullable)
- `secondary_contact_phone` (text, nullable)
- `priority` (canvassing_priority enum: LOW, MEDIUM, HIGH, default: 'MEDIUM'::crm.canvassing_priority)
- `lead_score` (integer, nullable, check: lead_score >= 0 AND lead_score <= 100)
- `lead_source` (text, nullable)
- `campaign_id` (uuid, nullable)
- `assigned_to` (uuid, nullable, FK → internal.authorized_users.id)
- `team_id` (uuid, nullable)
- `av_solutions_required` (av_solution_type[], nullable) - Enum: DIGITAL_SIGNAGE, LED_INTERIOR, LED_EXTERIOR, VIDEOWALLS, DIGITAL_TOTEMS, DIGITAL_MENUS, SOUND_SYSTEM, BACKGROUND_MUSIC, PUBLIC_ADDRESS, PRO_AUDIO, AMBIENT_SOUND, CCTV, SECURITY_CAMERAS, RECORDING_SYSTEM, ACCESS_CONTROL, VIDEOCONFERENCE, MEETING_ROOMS, VC_EQUIPMENT, PRO_LIGHTING, LED_LIGHTING, ARCH_LIGHTING, LIGHTING_CONTROL, PROJECTION, PROJECTORS, PROJECTION_SCREENS, AUTOMATION, COMMERCIAL_SMART, CENTRAL_CONTROL, TECHNICAL_SERVICE, MAINTENANCE, INSTALLATIONS, TECH_SUPPORT
- `solution_details` (text, nullable)
- `number_of_screens` (integer, nullable)
- `equipment_locations` (text, nullable)
- `estimated_budget_range` (text, nullable)
- `project_urgency` (text, nullable)
- `has_current_av_installation` (bool, nullable, default: false)
- `current_provider` (text, nullable)
- `installation_age_years` (integer, nullable)
- `current_installation_problems` (text, nullable)
- `has_maintenance_contract` (bool, nullable, default: false)
- `maintenance_contract_provider` (text, nullable)
- `maintenance_contract_end_date` (date, nullable)
- `has_requested_competitor_quotes` (bool, nullable, default: false)
- `competitors_contacted` (text, nullable)
- `interest_level` (integer, nullable, check: interest_level >= 1 AND interest_level <= 10)
- `purchase_phase` (purchase_phase enum: INITIAL_RESEARCH, COMPARING_OPTIONS, READY_TO_DECIDE, NEEDS_APPROVAL, nullable)
- `main_objections` (text[], nullable)
- `objections_other` (text, nullable)
- `economic_decision_maker_identified` (bool, nullable, default: false)
- `approval_process` (text, nullable)
- `appointment_date` (date, nullable)
- `appointment_time` (time, nullable)
- `appointment_type` (appointment_type enum: FIRST_VISIT, FOLLOW_UP, CLOSING, INSTALLATION, nullable)
- `appointment_location` (text, nullable)
- `callback_date` (date, nullable)
- `callback_time` (time, nullable)
- `reminder_enabled` (bool, nullable, default: false)
- `reminder_time_before` (text, nullable)
- `photos` (text[], nullable)
- `videos` (text[], nullable)
- `documents` (text[], nullable)
- `audio_recordings` (text[], nullable)
- `screenshots` (text[], nullable)
- `technical_service_type` (technical_service_type enum: NEW_INSTALLATION, PREVENTIVE_MAINTENANCE, REPAIR, UPGRADE, TECH_SUPPORT, nullable)
- `maintenance_frequency` (maintenance_frequency enum: MONTHLY, QUARTERLY, ANNUAL, ON_DEMAND, nullable)
- `proposed_maintenance_contract` (bool, nullable, default: false)
- `maintenance_contract_value` (numeric, nullable)
- `existing_equipment` (text, nullable)
- `has_active_warranties` (bool, nullable, default: false)
- `warranty_end_date` (date, nullable)
- `local_access_info` (text, nullable)
- `tags` (text[], nullable)
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())
- `modified_by` (uuid, nullable, FK → internal.authorized_users.id)
- `visit_count` (integer, nullable, default: 0)
- `total_time_invested_minutes` (integer, nullable, default: 0)
- `days_since_first_contact` (integer, nullable)
- `days_in_current_status` (integer, nullable)
- `response_rate` (numeric, nullable)
- `status_history` (jsonb, nullable) - Historial JSON de cambios de estado: [{"status": "CB", "previous_status": "NH", "date": "2024-01-15T10:00:00Z", "user_id": "uuid", "user_name": "Nombre", "reason": "Motivo"}]

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `location_created_by_fkey`: created_by → internal.authorized_users.id
- `location_assigned_to_fkey`: assigned_to → internal.authorized_users.id
- `location_modified_by_fkey`: modified_by → internal.authorized_users.id
- Referenciada por: location_notes

### Tabla: location_notes

**RLS:** Habilitado  
**Comentario:** Sistema de notas para ubicaciones de Canvassing. Similar al sistema de notas de clientes.

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `location_id` (uuid, FK → crm.location.id)
- `note_type` (location_note_type enum: VISIT, PHONE_CALL, EMAIL, WHATSAPP, MEETING, FOLLOW_UP, INCIDENT, INTERNAL, default: 'INTERNAL'::crm.location_note_type)
- `content` (text)
- `attachments` (text[], nullable)
- `created_by` (uuid, FK → internal.authorized_users.id)
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())
- `edited_at` (timestamptz, nullable)
- `edited_by` (uuid, nullable, FK → internal.authorized_users.id)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `location_notes_location_id_fkey`: location_id → crm.location.id
- `location_notes_created_by_fkey`: created_by → internal.authorized_users.id
- `location_notes_edited_by_fkey`: edited_by → internal.authorized_users.id

---

## SCHEMA: catalog

### Tabla: categories

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `name` (text)
- `slug` (text, unique)
- `description` (text, nullable)
- `parent_id` (uuid, nullable, FK → catalog.categories.id)
- `sort_order` (integer, nullable, default: 0)
- `is_active` (bool, nullable, default: true)
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `categories_parent_id_fkey`: parent_id → catalog.categories.id
- Referenciada por: products

### Tabla: tax_rates

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `name` (text)
- `rate` (numeric, check: rate >= 0::numeric AND rate <= 100::numeric)
- `is_default` (bool, nullable, default: false)
- `is_active` (bool, nullable, default: true)
- `country` (text, nullable, default: 'ES'::text)
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- Referenciada por: products

### Tabla: products

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `sku` (text, unique)
- `name` (text)
- `description` (text, nullable)
- `product_type` (product_type enum: PRODUCT, SERVICE, BUNDLE, default: 'PRODUCT'::catalog.product_type)
- `category_id` (uuid, nullable, FK → catalog.categories.id)
- `unit` (unit_type enum: ud, m2, ml, hora, jornada, mes, kg, default: 'ud'::catalog.unit_type)
- `cost_price` (numeric, nullable, check: cost_price IS NULL OR cost_price >= 0::numeric)
- `sale_price` (numeric, check: sale_price >= 0::numeric)
- `tax_rate_id` (uuid, nullable, FK → catalog.tax_rates.id)
- `margin_percentage` (numeric, nullable)
- `track_stock` (bool, nullable, default: false)
- `stock_quantity` (integer, nullable, default: 0, check: stock_quantity >= 0)
- `min_stock_alert` (integer, nullable)
- `erp_product_id` (text, nullable)
- `erp_synced_at` (timestamptz, nullable)
- `is_active` (bool, nullable, default: true)
- `is_featured` (bool, nullable, default: false)
- `specifications` (jsonb, nullable, default: '{}'::jsonb)
- `images` (jsonb, nullable, default: '[]'::jsonb)
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())
- `created_by` (uuid, nullable, FK → internal.authorized_users.id)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `products_category_id_fkey`: category_id → catalog.categories.id
- `products_tax_rate_id_fkey`: tax_rate_id → catalog.tax_rates.id
- `products_created_by_fkey`: created_by → internal.authorized_users.id
- Referenciada por: product_bundles

### Tabla: product_bundles

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `bundle_product_id` (uuid, FK → catalog.products.id)
- `component_product_id` (uuid, FK → catalog.products.id)
- `quantity` (numeric, default: 1, check: quantity > 0::numeric)
- `created_at` (timestamptz, nullable, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `product_bundles_bundle_product_id_fkey`: bundle_product_id → catalog.products.id
- `product_bundles_component_product_id_fkey`: component_product_id → catalog.products.id

### Tabla: erp_sync_log

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `sync_type` (text)
- `started_at` (timestamptz, nullable, default: now())
- `completed_at` (timestamptz, nullable)
- `status` (text, default: 'RUNNING'::text)
- `records_processed` (integer, nullable, default: 0)
- `records_created` (integer, nullable, default: 0)
- `records_updated` (integer, nullable, default: 0)
- `records_failed` (integer, nullable, default: 0)
- `error_details` (jsonb, nullable)
- `initiated_by` (uuid, nullable, FK → internal.authorized_users.id)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `erp_sync_log_initiated_by_fkey`: initiated_by → internal.authorized_users.id

---

## SCHEMA: quotes

### Tabla: quotes

**RLS:** Habilitado  
**Comentario:** Tabla principal de presupuestos. Único punto de verdad para quotes.

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `quote_number` (text, unique)
- `client_id` (uuid, FK → crm.clients.id)
- `project_name` (text, nullable)
- `order_number` (text, nullable)
- `status` (quote_status enum: DRAFT, SENT, APPROVED, REJECTED, EXPIRED, INVOICED, default: 'DRAFT'::quotes.quote_status)
- `subtotal` (numeric, default: 0)
- `tax_rate` (numeric, default: 21.00)
- `tax_amount` (numeric, default: 0)
- `total` (numeric, default: 0)
- `valid_until` (date, nullable)
- `notes` (text, nullable)
- `created_by` (uuid, nullable, FK → internal.authorized_users.id)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())
- `project_id` (uuid, nullable, FK → projects.projects.id)
- `provisional_number` (text, nullable)
- `assigned_to` (uuid, nullable) - UUID del usuario comercial asignado al presupuesto (referencia a auth.users).
- `issue_date` (date, nullable) - Fecha de emisión. Se establece automáticamente al cambiar de DRAFT a SENT.

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `quotes_project_id_fkey`: project_id → projects.projects.id
- Referenciada por: projects, quote_lines, invoices

### Tabla: quote_lines

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `quote_id` (uuid, FK → quotes.quotes.id)
- `line_order` (integer, default: 1)
- `concept` (text)
- `description` (text, nullable)
- `quantity` (numeric, default: 1)
- `unit_price` (numeric, default: 0)
- `tax_rate` (numeric, default: 21.00)
- `discount_percent` (numeric, nullable, default: 0)
- `subtotal` (numeric, generated, nullable, default: ((quantity * unit_price) * ((1)::numeric - (COALESCE(discount_percent, (0)::numeric) / (100)::numeric))))
- `tax_amount` (numeric, generated, nullable, default: ((((quantity * unit_price) * ((1)::numeric - (COALESCE(discount_percent, (0)::numeric) / (100)::numeric))) * tax_rate) / (100)::numeric))
- `total` (numeric, generated, nullable, default: (((quantity * unit_price) * ((1)::numeric - (COALESCE(discount_percent, (0)::numeric) / (100)::numeric))) * ((1)::numeric + (tax_rate / (100)::numeric))))
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `quote_lines_quote_id_fkey`: quote_id → quotes.quotes.id

---

## SCHEMA: sales

### Tabla: invoice_sequences

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `year` (integer, unique)
- `last_number` (integer, default: 0)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**Claves Primarias:**
- `id`

### Tabla: invoices

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `invoice_number` (text, nullable, unique)
- `source_quote_id` (uuid, nullable, FK → quotes.quotes.id)
- `client_id` (uuid, FK → crm.clients.id)
- `project_id` (uuid, nullable, FK → projects.projects.id)
- `project_name` (text, nullable)
- `status` (text, default: 'DRAFT'::text, check: status = ANY (ARRAY['DRAFT'::text, 'ISSUED'::text, 'SENT'::text, 'PAID'::text, 'OVERDUE'::text, 'CANCELLED'::text]))
- `issue_date` (date, default: CURRENT_DATE)
- `due_date` (date, nullable)
- `notes` (text, nullable)
- `created_by` (uuid, nullable, FK → internal.authorized_users.id)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())
- `invoice_hash` (text, nullable, unique)
- `subtotal` (numeric, nullable, default: 0)
- `tax_amount` (numeric, nullable, default: 0)
- `total` (numeric, nullable, default: 0)
- `valid_until` (date, nullable)
- `order_number` (text, nullable)
- `preliminary_number` (text, nullable)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `invoices_client_id_fkey`: client_id → crm.clients.id
- `invoices_project_id_fkey`: project_id → projects.projects.id
- `invoices_source_quote_id_fkey`: source_quote_id → quotes.quotes.id
- Referenciada por: invoice_lines

### Tabla: invoice_lines

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `invoice_id` (uuid, FK → sales.invoices.id)
- `concept` (text)
- `description` (text, nullable)
- `quantity` (numeric, default: 1)
- `unit_price` (numeric, default: 0)
- `tax_rate` (numeric, default: 21)
- `discount_percent` (numeric, default: 0)
- `line_order` (integer, default: 0)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `invoice_lines_invoice_id_fkey`: invoice_id → sales.invoices.id

---

## SCHEMA: projects

### Tabla: projects

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `project_number` (text, unique)
- `project_type` (project_type enum: CUSTOMER_ORDER, AV_PROJECT, INSTALLATION)
- `title` (text)
- `client_id` (uuid, nullable, FK → crm.clients.id)
- `location_id` (uuid, nullable)
- `quote_id` (uuid, nullable, FK → quotes.quotes.id)
- `status` (project_status enum: PLANNED, IN_PROGRESS, PAUSED, COMPLETED, CANCELLED, default: 'PLANNED'::projects.project_status)
- `priority` (priority_level enum: LOW, MEDIUM, HIGH, URGENT, default: 'MEDIUM'::projects.priority_level)
- `start_date` (date, nullable)
- `end_date` (date, nullable)
- `actual_start_date` (date, nullable)
- `actual_end_date` (date, nullable)
- `assigned_to` (uuid, nullable, FK → internal.authorized_users.id)
- `assigned_team` (uuid[], nullable)
- `estimated_hours` (numeric, nullable)
- `actual_hours` (numeric, nullable, default: 0)
- `budget` (numeric, nullable, check: budget IS NULL OR budget >= 0::numeric)
- `description` (text, nullable)
- `internal_notes` (text, nullable)
- `created_by` (uuid, FK → internal.authorized_users.id)
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())
- `deleted_at` (timestamptz, nullable)
- `project_city` (text, nullable)
- `client_order_number` (text, nullable)
- `local_name` (text, nullable)
- `project_name` (text, nullable)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `projects_client_id_fkey`: client_id → crm.clients.id
- `projects_quote_id_fkey`: quote_id → quotes.quotes.id
- `projects_assigned_to_fkey`: assigned_to → internal.authorized_users.id
- `projects_created_by_fkey`: created_by → internal.authorized_users.id
- Referenciada por: project_documents, quotes, av_projects, project_tasks, customer_orders, invoices

### Tabla: customer_orders

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `project_id` (uuid, unique, FK → projects.projects.id)
- `customer_order_number` (text, unique)
- `installation_date` (date)
- `installation_time_start` (time, nullable)
- `installation_time_end` (time, nullable)
- `installation_checklist` (jsonb, nullable, default: '[]'::jsonb)
- `access_requirements` (text, nullable)
- `special_conditions` (text, nullable)
- `delivery_address` (text, nullable)
- `contact_person_onsite` (text, nullable)
- `contact_phone_onsite` (text, nullable)
- `post_installation_notes` (text, nullable)
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `customer_orders_project_id_fkey`: project_id → projects.projects.id

### Tabla: av_projects

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `project_id` (uuid, unique, FK → projects.projects.id)
- `internal_project_code` (text, nullable, unique)
- `customer_project_reference` (text, nullable)
- `project_category` (project_category enum: IMMERSIVE_ROOM, RETAIL_EXPERIENCE, CORPORATE_AV, EVENT, SIGNAGE, CUSTOM, nullable)
- `design_phase_status` (phase_status enum: PENDING, IN_PROGRESS, APPROVED, REVISION_NEEDED, COMPLETED, default: 'PENDING'::projects.phase_status)
- `design_approved_at` (timestamptz, nullable)
- `production_phase_status` (phase_status enum: PENDING, IN_PROGRESS, APPROVED, REVISION_NEEDED, COMPLETED, default: 'PENDING'::projects.phase_status)
- `production_completed_at` (timestamptz, nullable)
- `installation_phase_status` (phase_status enum: PENDING, IN_PROGRESS, APPROVED, REVISION_NEEDED, COMPLETED, default: 'PENDING'::projects.phase_status)
- `installation_completed_at` (timestamptz, nullable)
- `commissioning_phase_status` (phase_status enum: PENDING, IN_PROGRESS, APPROVED, REVISION_NEEDED, COMPLETED, default: 'PENDING'::projects.phase_status)
- `commissioning_completed_at` (timestamptz, nullable)
- `technical_specifications` (jsonb, nullable, default: '{}'::jsonb)
- `equipment_list` (jsonb, nullable, default: '[]'::jsonb)
- `warranty_until` (date, nullable)
- `maintenance_contract` (bool, nullable, default: false)
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `av_projects_project_id_fkey`: project_id → projects.projects.id

### Tabla: project_tasks

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `project_id` (uuid, FK → projects.projects.id)
- `parent_task_id` (uuid, nullable, FK → projects.project_tasks.id)
- `title` (text)
- `description` (text, nullable)
- `assigned_to` (uuid, nullable, FK → internal.authorized_users.id)
- `status` (task_status enum: TODO, IN_PROGRESS, REVIEW, COMPLETED, BLOCKED, default: 'TODO'::projects.task_status)
- `priority` (priority_level enum: LOW, MEDIUM, HIGH, URGENT, default: 'MEDIUM'::projects.priority_level)
- `due_date` (date, nullable)
- `estimated_hours` (numeric, nullable)
- `actual_hours` (numeric, nullable, default: 0)
- `completion_percentage` (integer, nullable, default: 0, check: completion_percentage >= 0 AND completion_percentage <= 100)
- `blocked_reason` (text, nullable)
- `completed_at` (timestamptz, nullable)
- `created_by` (uuid, FK → internal.authorized_users.id)
- `created_at` (timestamptz, nullable, default: now())
- `updated_at` (timestamptz, nullable, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `project_tasks_project_id_fkey`: project_id → projects.projects.id
- `project_tasks_parent_task_id_fkey`: parent_task_id → projects.project_tasks.id
- `project_tasks_assigned_to_fkey`: assigned_to → internal.authorized_users.id
- `project_tasks_created_by_fkey`: created_by → internal.authorized_users.id

### Tabla: project_documents

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `project_id` (uuid, FK → projects.projects.id)
- `document_type` (document_type enum: DESIGN, TECHNICAL_DRAWING, PHOTO, VIDEO, MANUAL, CERTIFICATE, OTHER)
- `file_name` (text)
- `file_path` (text)
- `file_size_bytes` (bigint, nullable, check: file_size_bytes IS NULL OR file_size_bytes > 0)
- `mime_type` (text, nullable)
- `uploaded_by` (uuid, nullable, FK → internal.authorized_users.id)
- `created_at` (timestamptz, nullable, default: now())

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `project_documents_project_id_fkey`: project_id → projects.projects.id
- `project_documents_uploaded_by_fkey`: uploaded_by → internal.authorized_users.id

---

## SCHEMA: audit

### Tabla: logs

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `action` (text)
- `table_name` (text)
- `record_id` (uuid, nullable)
- `user_id` (uuid, nullable, FK → auth.users.id)
- `user_email` (text, nullable)
- `created_at` (timestamptz, default: now())
- `ip_address` (inet, nullable)
- `user_agent` (text, nullable)
- `old_data` (jsonb, nullable)
- `new_data` (jsonb, nullable)
- `metadata` (jsonb, nullable)

**Claves Primarias:**
- `id`

**Claves Foráneas:**
- `logs_user_id_fkey`: user_id → auth.users.id

### Tabla: audit_log

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `timestamp` (timestamptz, default: now())
- `user_id` (uuid)
- `action` (audit_action enum: CREATE, UPDATE, DELETE, STATUS_CHANGE, REASSIGN, VIEW_SENSITIVE)
- `table_name` (text)
- `record_id` (uuid, nullable)
- `changed_fields` (jsonb, nullable)
- `ip_address` (inet, nullable)
- `user_agent` (text, nullable)

**Claves Primarias:**
- `id`

### Tabla: sequence_counters

**RLS:** Habilitado

**Columnas:**
- `prefix` (text)
- `year` (integer, check: year >= 2024 AND year <= 2100)
- `current_number` (integer, default: 0, check: current_number >= 0 AND current_number < 100000)
- `last_generated_at` (timestamptz, nullable)

**Claves Primarias:**
- `prefix`, `year`

### Tabla: events

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `event_type` (text)
- `event_category` (text)
- `severity` (text, default: 'info'::text, check: severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'critical'::text]))
- `user_id` (uuid, nullable)
- `user_email` (text, nullable)
- `user_name` (text, nullable)
- `resource_type` (text, nullable)
- `resource_id` (text, nullable)
- `action` (text)
- `details` (jsonb, nullable, default: '{}'::jsonb)
- `ip_address` (inet, nullable)
- `user_agent` (text, nullable)
- `session_id` (text, nullable)
- `created_at` (timestamptz, default: now())

**Claves Primarias:**
- `id`

---

## SCHEMA: security

### Tabla: login_attempts

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `identifier` (text)
- `identifier_type` (text, check: identifier_type = ANY (ARRAY['email'::text, 'ip'::text]))
- `attempted_at` (timestamptz, default: now())
- `success` (bool, default: false)
- `user_agent` (text, nullable)
- `ip_address` (inet, nullable)

**Claves Primarias:**
- `id`

### Tabla: otp_codes

**RLS:** Habilitado

**Columnas:**
- `id` (uuid, PK, default: gen_random_uuid())
- `user_email` (text)
- `code` (text)
- `expires_at` (timestamptz)
- `verified` (bool, nullable, default: false)
- `attempts` (integer, nullable, default: 0)
- `max_attempts` (integer, nullable, default: 3)
- `created_at` (timestamptz, nullable, default: now())
- `ip_address` (inet, nullable)
- `user_agent` (text, nullable)

**Claves Primarias:**
- `id`

---

## NOTAS ADICIONALES

### Enums Personalizados

**app_role** (public): admin, comercial, tecnico

**aal_level** (auth): aal1, aal2, aal3

**factor_type** (auth): totp, webauthn, phone

**factor_status** (auth): unverified, verified

**one_time_token_type** (auth): confirmation_token, reauthentication_token, recovery_token, email_change_token_new, email_change_token_current, phone_change_token

**oauth_registration_type** (auth): dynamic, manual

**oauth_client_type** (auth): public, confidential

**oauth_response_type** (auth): code

**oauth_authorization_status** (auth): pending, approved, denied, expired

**code_challenge_method** (auth): s256, plain

**buckettype** (storage): STANDARD, ANALYTICS, VECTOR

**industry_sector** (crm): RETAIL, HOSPITALITY, GYM, OFFICE, EVENTS, EDUCATION, HEALTHCARE, OTHER, DIGITAL_SIGNAGE

**urgency_level** (crm): LOW, MEDIUM, HIGH, URGENT

**lead_stage** (crm): NEW, CONTACTED, MEETING, PROPOSAL, NEGOTIATION, WON, LOST, PAUSED, RECURRING

**lead_source** (crm): WEBSITE, INSTAGRAM, REFERRAL, OUTBOUND, TRADE_SHOW, PARTNER, LINKEDIN, OTHER, COMMERCIAL

**canvassing_status** (crm): CB, CX, GB, NH, NI, OTH, DK, RNT, INT, APP

**canvassing_priority** (crm): LOW, MEDIUM, HIGH

**business_type** (crm): RETAIL, RESTAURANT, HOTEL, OFFICE, SHOPPING_MALL, GYM, CLINIC, DEALERSHIP, SHOWROOM, WAREHOUSE, EDUCATION, OTHER

**contact_method** (crm): PHONE, EMAIL, SMS, WHATSAPP

**contact_time** (crm): MORNING, AFTERNOON, EVENING

**contact_type** (crm): DECISION_MAKER, TECHNICAL, FINANCIAL, ADMINISTRATIVE

**interaction_type** (crm): CALL, EMAIL, MEETING, VISIT, WHATSAPP, OTHER

**interaction_outcome** (crm): POSITIVE, NEUTRAL, NEGATIVE, FOLLOW_UP_NEEDED

**purchase_phase** (crm): INITIAL_RESEARCH, COMPARING_OPTIONS, READY_TO_DECIDE, NEEDS_APPROVAL

**appointment_type** (crm): FIRST_VISIT, FOLLOW_UP, CLOSING, INSTALLATION

**technical_service_type** (crm): NEW_INSTALLATION, PREVENTIVE_MAINTENANCE, REPAIR, UPGRADE, TECH_SUPPORT

**maintenance_frequency** (crm): MONTHLY, QUARTERLY, ANNUAL, ON_DEMAND

**location_note_type** (crm): VISIT, PHONE_CALL, EMAIL, WHATSAPP, MEETING, FOLLOW_UP, INCIDENT, INTERNAL

**av_solution_type** (crm): DIGITAL_SIGNAGE, LED_INTERIOR, LED_EXTERIOR, VIDEOWALLS, DIGITAL_TOTEMS, DIGITAL_MENUS, SOUND_SYSTEM, BACKGROUND_MUSIC, PUBLIC_ADDRESS, PRO_AUDIO, AMBIENT_SOUND, CCTV, SECURITY_CAMERAS, RECORDING_SYSTEM, ACCESS_CONTROL, VIDEOCONFERENCE, MEETING_ROOMS, VC_EQUIPMENT, PRO_LIGHTING, LED_LIGHTING, ARCH_LIGHTING, LIGHTING_CONTROL, PROJECTION, PROJECTORS, PROJECTION_SCREENS, AUTOMATION, COMMERCIAL_SMART, CENTRAL_CONTROL, TECHNICAL_SERVICE, MAINTENANCE, INSTALLATIONS, TECH_SUPPORT

**product_type** (catalog): PRODUCT, SERVICE, BUNDLE

**unit_type** (catalog): ud, m2, ml, hora, jornada, mes, kg

**quote_status** (quotes): DRAFT, SENT, APPROVED, REJECTED, EXPIRED, INVOICED

**project_type** (projects): CUSTOMER_ORDER, AV_PROJECT, INSTALLATION

**project_status** (projects): PLANNED, IN_PROGRESS, PAUSED, COMPLETED, CANCELLED

**priority_level** (projects): LOW, MEDIUM, HIGH, URGENT

**project_category** (projects): IMMERSIVE_ROOM, RETAIL_EXPERIENCE, CORPORATE_AV, EVENT, SIGNAGE, CUSTOM

**phase_status** (projects): PENDING, IN_PROGRESS, APPROVED, REVISION_NEEDED, COMPLETED

**task_status** (projects): TODO, IN_PROGRESS, REVIEW, COMPLETED, BLOCKED

**document_type** (projects): DESIGN, TECHNICAL_DRAWING, PHOTO, VIDEO, MANUAL, CERTIFICATE, OTHER

**audit_action** (audit): CREATE, UPDATE, DELETE, STATUS_CHANGE, REASSIGN, VIEW_SENSITIVE

---

**Fin del documento**
