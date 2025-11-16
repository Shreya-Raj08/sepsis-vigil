# ICU Sepsis Alert System - Deployment Guide

## Overview
This is a full-stack ICU sepsis alert system built with React, TypeScript, and Lovable Cloud (Supabase). It provides real-time patient monitoring, ML-based sepsis risk prediction, and clinical workflow management.

## Features Implemented
✅ Patient admission management  
✅ Hourly vitals ingestion (HR, O2Sat, Temp, Resp, SBP, DBP)  
✅ Automatic MAP calculation from blood pressure  
✅ Lab results tracking (FiO2, pH, PaCO2, Creatinine, BUN, Lactate, etc.)  
✅ Mock ML prediction system (ready for XGBoost integration)  
✅ Color-coded alert tiers (Green/Yellow/Red)  
✅ Real-time alert notifications  
✅ Clinician action workflow (investigate/confirm/reject)  
✅ Intervention documentation  
✅ Black-themed medical-grade UI  
✅ Responsive design for desktop/tablet  

## Backend Architecture

### Database Tables
- **patients**: Patient demographics and admission data
- **vitals**: Hourly vital sign recordings
- **labs**: Laboratory test results
- **alerts**: Sepsis risk alerts with ML predictions
- **interventions**: Clinician actions and documentation

### Edge Functions
- **predict-sepsis**: ML-based risk scoring endpoint

## Replacing the Mock ML Model with XGBoost

The current system uses a mock prediction model. To integrate your trained XGBoost model:

### Step 1: Prepare Your Model
1. Export your trained XGBoost model:
```python
import xgboost as xgb
model.save_model('sepsis_model.json')  # Use JSON format for Deno
```

### Step 2: Update the Edge Function
Navigate to `supabase/functions/predict-sepsis/index.ts` and replace the `calculateMockRiskScore` function:

```typescript
// Import XGBoost for Deno
import { XGBoost } from "https://deno.land/x/xgboost_deno/mod.ts";

// Load your model
const model = await XGBoost.load("./sepsis_model.json");

function calculateRealRiskScore(vitals: any[], latestLab: any): number {
  // Extract features matching your training data
  const features = {
    hr_mean_6h: calculateMean(vitals, 'hr'),
    hr_std_6h: calculateStd(vitals, 'hr'),
    map_mean_6h: calculateMean(vitals, 'map'),
    // ... add all features from your model
  };

  // Convert to array matching your model's expected input
  const featureArray = Object.values(features);
  
  // Get prediction
  const prediction = model.predict([featureArray]);
  return prediction[0];
}
```

### Step 3: Feature Engineering
Add preprocessing functions to match your training pipeline:

```typescript
function calculateMean(data: any[], field: string): number {
  const values = data.map(d => d[field]).filter(v => v !== null);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateStd(data: any[], field: string): number {
  const values = data.map(d => d[field]).filter(v => v !== null);
  const mean = calculateMean(data, field);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculate3HourTrend(data: any[], field: string): number {
  if (data.length < 3) return 0;
  return (data[0][field] - data[2][field]) / data[2][field];
}
```

### Step 4: SHAP Integration (Optional)
For real feature importance:

```typescript
import { SHAP } from "https://deno.land/x/shap_deno/mod.ts";

const explainer = new SHAP.TreeExplainer(model);
const shapValues = explainer.shapValues(featureArray);

// Extract top 3 contributors
const topFeatures = Object.entries(features)
  .map(([name, value], idx) => ({ name, value, importance: Math.abs(shapValues[idx]) }))
  .sort((a, b) => b.importance - a.importance)
  .slice(0, 3);
```

## Automatic Prediction Triggers

To run predictions automatically (every hour), add a cron job:

### Option 1: Database Trigger
Create a PostgreSQL function that runs on vitals insert:

```sql
CREATE OR REPLACE FUNCTION trigger_sepsis_prediction()
RETURNS TRIGGER AS $$
BEGIN
  -- Call edge function via HTTP (using pg_net extension)
  PERFORM net.http_post(
    url := 'https://your-project.functions.supabase.co/predict-sepsis',
    body := jsonb_build_object('patientId', NEW.patient_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vitals_prediction_trigger
AFTER INSERT ON vitals
FOR EACH ROW
EXECUTE FUNCTION trigger_sepsis_prediction();
```

### Option 2: External Cron Service
Use a service like GitHub Actions or a server cron job to call the prediction endpoint hourly.

## Data Preprocessing Requirements

Your XGBoost model should expect these features (adjust based on your training):

### Vitals Features
- Rolling 6-hour means: HR, O2Sat, Temp, Resp, MAP
- Rolling 6-hour std deviations
- 3-hour deltas and trends

### Lab Features
- Latest values: FiO2, pH, PaCO2, Creatinine, BUN, Lactate, Platelets, WBC, Hgb, Potassium, Calcium, Glucose

### Derived Features
- MAP (already calculated in vitals table)
- Time since admission
- Age group categories

## Alert Threshold Calibration

Update the tier thresholds in `predict-sepsis/index.ts` based on your model's performance:

```typescript
// Current thresholds (adjust based on your validation metrics)
if (riskScore < 0.3) {
  alertTier = 'green';   // Low risk
} else if (riskScore < 0.7) {
  alertTier = 'yellow';  // Moderate risk
} else {
  alertTier = 'red';     // High risk
}
```

## Testing the ML Integration

1. Admit a test patient
2. Record hourly vitals with some abnormal values
3. Click "Calculate Sepsis Risk"
4. Verify alert generation and feature importance display

## Security Considerations

✅ Row-Level Security (RLS) enabled on all tables  
✅ CORS configured for edge functions  
✅ Input validation on all endpoints  
⚠️ Consider adding authentication for production use  

## Future Enhancements

- [ ] Integrate real XGBoost model
- [ ] Add authentication system for clinicians
- [ ] Implement EHR export (PDF/JSON)
- [ ] Add data visualization charts (using Recharts)
- [ ] Set up automated hourly predictions
- [ ] Add audit logging
- [ ] Implement push notifications (browser/mobile)

## Support

For questions about Lovable Cloud:
- Documentation: https://docs.lovable.dev/features/cloud
- AI Features: https://docs.lovable.dev/features/ai

## License

Built with Lovable - AI-powered full-stack development platform