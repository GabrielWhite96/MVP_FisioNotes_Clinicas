-- Google Calendar sync (physiotherapist only, one-way TeleFisio → Google)

CREATE TABLE google_calendar_connections (
  physiotherapist_id UUID PRIMARY KEY REFERENCES physiotherapists(id) ON DELETE CASCADE,
  google_account_email TEXT,
  refresh_token_enc TEXT NOT NULL,
  access_token_enc TEXT,
  access_token_expires_at TIMESTAMPTZ,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE google_oauth_states (
  state TEXT PRIMARY KEY,
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_google_oauth_states_expires ON google_oauth_states (expires_at);

CREATE TABLE appointment_google_events (
  appointment_id UUID PRIMARY KEY REFERENCES appointments(id) ON DELETE CASCADE,
  google_event_id TEXT,
  google_calendar_id TEXT NOT NULL DEFAULT 'primary',
  sync_status TEXT NOT NULL DEFAULT 'synced'
    CHECK (sync_status IN ('synced', 'pending', 'error')),
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_google_events_status
  ON appointment_google_events (sync_status)
  WHERE sync_status <> 'synced';

ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_google_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users may only see non-secret connection status for themselves.
-- Token columns are revoked from authenticated (service role bypasses RLS).
REVOKE ALL ON google_calendar_connections FROM anon, authenticated;
GRANT SELECT (
  physiotherapist_id,
  google_account_email,
  calendar_id,
  sync_enabled,
  connected_at,
  updated_at
) ON google_calendar_connections TO authenticated;
GRANT DELETE ON google_calendar_connections TO authenticated;

CREATE POLICY "google_calendar_connections_select_own"
  ON google_calendar_connections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM physiotherapists p
      WHERE p.id = google_calendar_connections.physiotherapist_id
        AND p.profile_id = auth.uid()
    )
  );

CREATE POLICY "google_calendar_connections_delete_own"
  ON google_calendar_connections
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM physiotherapists p
      WHERE p.id = google_calendar_connections.physiotherapist_id
        AND p.profile_id = auth.uid()
    )
  );

-- OAuth states: service role only (explicit deny for API roles)
REVOKE ALL ON google_oauth_states FROM anon, authenticated;

CREATE POLICY "google_oauth_states_no_select"
  ON google_oauth_states FOR SELECT TO authenticated, anon USING (false);

CREATE POLICY "google_oauth_states_no_write"
  ON google_oauth_states FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

CREATE POLICY "appointment_google_events_select_own"
  ON appointment_google_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM appointments a
      JOIN physiotherapists p ON p.id = a.physiotherapist_id
      WHERE a.id = appointment_google_events.appointment_id
        AND p.profile_id = auth.uid()
    )
  );

GRANT SELECT ON appointment_google_events TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON appointment_google_events FROM anon, authenticated;
