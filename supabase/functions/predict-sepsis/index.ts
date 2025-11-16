import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { patientId } = await req.json();

    if (!patientId) {
      return new Response(
        JSON.stringify({ error: 'Patient ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recent vitals (last 6 hours)
    const { data: vitals, error: vitalsError } = await supabaseClient
      .from('vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(6);

    if (vitalsError) throw vitalsError;

    // Fetch recent labs
    const { data: labs, error: labsError } = await supabaseClient
      .from('labs')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(1);

    if (labsError) throw labsError;

    if (!vitals || vitals.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No vitals data available for prediction' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MOCK PREDICTION MODEL
    // In production, replace this with your trained XGBoost model
    const mockRiskScore = calculateMockRiskScore(vitals, labs?.[0]);

    // Determine alert tier
    let alertTier: 'green' | 'yellow' | 'red';
    if (mockRiskScore < 0.3) {
      alertTier = 'green';
    } else if (mockRiskScore < 0.7) {
      alertTier = 'yellow';
    } else {
      alertTier = 'red';
    }

    // Extract top contributing features (mock SHAP values)
    const topFeatures = extractTopFeatures(vitals[0], labs?.[0]);

    // Create or update alert
    const { data: existingAlert } = await supabaseClient
      .from('alerts')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingAlert) {
      // Update existing alert
      const { error: updateError } = await supabaseClient
        .from('alerts')
        .update({
          risk_score: mockRiskScore,
          alert_tier: alertTier,
          top_features: topFeatures,
        })
        .eq('id', existingAlert.id);

      if (updateError) throw updateError;
    } else {
      // Create new alert
      const { error: insertError } = await supabaseClient
        .from('alerts')
        .insert({
          patient_id: patientId,
          risk_score: mockRiskScore,
          alert_tier: alertTier,
          status: 'active',
          top_features: topFeatures,
        });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        risk_score: mockRiskScore,
        alert_tier: alertTier,
        top_features: topFeatures,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in predict-sepsis function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Mock risk calculation based on vital sign abnormalities
function calculateMockRiskScore(vitals: any[], latestLab: any): number {
  const latestVitals = vitals[0];
  let riskScore = 0.1; // Base risk

  // Check vital signs for abnormalities
  if (latestVitals.hr < 60 || latestVitals.hr > 100) riskScore += 0.15;
  if (latestVitals.o2sat < 95) riskScore += 0.2;
  if (latestVitals.temp < 97 || latestVitals.temp > 100.4) riskScore += 0.15;
  if (latestVitals.resp < 12 || latestVitals.resp > 20) riskScore += 0.15;
  if (latestVitals.map < 65 || latestVitals.map > 110) riskScore += 0.2;

  // Check for trending abnormalities (comparing last 3 hours)
  if (vitals.length >= 3) {
    const hrTrend = (vitals[0].hr - vitals[2].hr) / vitals[2].hr;
    const mapTrend = (vitals[0].map - vitals[2].map) / vitals[2].map;
    
    if (Math.abs(hrTrend) > 0.2) riskScore += 0.1;
    if (Math.abs(mapTrend) > 0.15) riskScore += 0.15;
  }

  // Lab values
  if (latestLab) {
    if (latestLab.lactate && latestLab.lactate > 2) riskScore += 0.2;
    if (latestLab.wbc && (latestLab.wbc < 4 || latestLab.wbc > 12)) riskScore += 0.1;
    if (latestLab.creatinine && latestLab.creatinine > 1.2) riskScore += 0.1;
  }

  return Math.min(riskScore, 0.99);
}

// Extract top contributing features (mock SHAP values)
function extractTopFeatures(latestVitals: any, latestLab: any) {
  const features: any = {};

  if (latestVitals.hr) features['Heart Rate'] = `${latestVitals.hr} bpm`;
  if (latestVitals.map) features['MAP'] = `${latestVitals.map.toFixed(0)} mmHg`;
  if (latestVitals.o2sat) features['O2 Saturation'] = `${latestVitals.o2sat}%`;
  if (latestVitals.temp) features['Temperature'] = `${latestVitals.temp}°F`;
  
  if (latestLab?.lactate) features['Lactate'] = `${latestLab.lactate} mmol/L`;
  if (latestLab?.wbc) features['WBC'] = `${latestLab.wbc} K/uL`;

  return features;
}