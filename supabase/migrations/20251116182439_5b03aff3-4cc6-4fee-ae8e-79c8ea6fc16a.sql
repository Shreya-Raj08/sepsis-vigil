-- Create enum for alert tiers
CREATE TYPE alert_tier AS ENUM ('green', 'yellow', 'red');

-- Create enum for alert status
CREATE TYPE alert_status AS ENUM ('active', 'under_investigation', 'confirmed', 'rejected');

-- Patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT UNIQUE NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  admission_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vitals table (hourly recordings)
CREATE TABLE vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hr NUMERIC,
  o2sat NUMERIC,
  temp NUMERIC,
  resp NUMERIC,
  sbp NUMERIC,
  dbp NUMERIC,
  map NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Labs table
CREATE TABLE labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fio2 NUMERIC,
  ph NUMERIC,
  paco2 NUMERIC,
  creatinine NUMERIC,
  bun NUMERIC,
  lactate NUMERIC,
  platelets NUMERIC,
  wbc NUMERIC,
  hgb NUMERIC,
  potassium NUMERIC,
  calcium NUMERIC,
  glucose NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alerts table
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  risk_score NUMERIC NOT NULL,
  alert_tier alert_tier NOT NULL,
  status alert_status NOT NULL DEFAULT 'active',
  top_features JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Interventions table (clinician actions)
CREATE TABLE interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public access for ICU staff - adjust based on your auth requirements)
CREATE POLICY "Enable read access for all users" ON patients FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON patients FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON vitals FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON vitals FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON labs FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON labs FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON alerts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON alerts FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON interventions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON interventions FOR INSERT WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_vitals_patient_id ON vitals(patient_id);
CREATE INDEX idx_vitals_recorded_at ON vitals(recorded_at);
CREATE INDEX idx_labs_patient_id ON labs(patient_id);
CREATE INDEX idx_labs_recorded_at ON labs(recorded_at);
CREATE INDEX idx_alerts_patient_id ON alerts(patient_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_interventions_alert_id ON interventions(alert_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for alerts table
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;