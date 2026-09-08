import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Temporary URL for testing.
// We will move this to an environment secret before final deployment.
const ML_API_URL =
  Deno.env.get("ML_API_URL") ?? "";

Deno.serve(async (req) => {
  // Handle browser CORS preflight requests.
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // Create Supabase client using the project's built-in
    // environment variables.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // ---------------------------------------------------
    // Read request
    // ---------------------------------------------------

    const { patientId } = await req.json();

    if (!patientId) {
      return new Response(
        JSON.stringify({
          error: "Patient ID is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ---------------------------------------------------
    // Get patient information
    // ---------------------------------------------------

    const { data: patient, error: patientError } =
      await supabase
        .from("patients")
        .select("id, patient_id, age, gender, admission_time")
        .eq("id", patientId)
        .single();

    if (patientError) {
      throw new Error(
        `Could not fetch patient: ${patientError.message}`
      );
    }

    // ---------------------------------------------------
    // Get the latest 6 vital records
    // ---------------------------------------------------

    const { data: vitals, error: vitalsError } =
      await supabase
        .from("vitals")
        .select(
          "recorded_at, hr, sbp, map, dbp, resp, o2sat, temp"
        )
        .eq("patient_id", patientId)
        .order("recorded_at", {
          ascending: false,
        })
        .limit(6);

    if (vitalsError) {
      throw new Error(
        `Could not fetch vitals: ${vitalsError.message}`
      );
    }

    if (!vitals || vitals.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "No vital-sign data available for prediction. Please record vitals first.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ---------------------------------------------------
    // Keep only vital records containing all seven
    // features required by the trained model.
    // ---------------------------------------------------

    const completeVitals = vitals.filter(
      (vital) =>
        vital.hr !== null &&
        vital.sbp !== null &&
        vital.map !== null &&
        vital.dbp !== null &&
        vital.resp !== null &&
        vital.o2sat !== null &&
        vital.temp !== null
    );

    if (completeVitals.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "The recorded vitals are incomplete. Please provide HR, SBP, MAP, DBP, Resp, O2Sat and Temp.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Oldest → newest for temporal feature engineering.
    const chronologicalVitals = [...completeVitals].reverse();

    // ---------------------------------------------------
    // Calculate ICU hour from admission time
    // ---------------------------------------------------

    const admissionTime = new Date(
      patient.admission_time
    );

    const latestVitalTime = new Date(
      chronologicalVitals[
        chronologicalVitals.length - 1
      ].recorded_at
    );

    const hoursSinceAdmission = Math.max(
      0,
      Math.floor(
        (
          latestVitalTime.getTime() -
          admissionTime.getTime()
        ) /
          (1000 * 60 * 60)
      )
    );

    // ---------------------------------------------------
    // Validate gender
    // ---------------------------------------------------

    if (
      patient.gender !== "Male" &&
      patient.gender !== "Female"
    ) {
      return new Response(
        JSON.stringify({
          error:
            "This XGBoost model currently supports Male and Female gender values.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ---------------------------------------------------
    // Prepare payload for Python XGBoost API
    // ---------------------------------------------------

    const mlPayload = {
      age: Number(patient.age),
      gender: patient.gender,
      hour: hoursSinceAdmission,
      vitals: chronologicalVitals.map((vital) => ({
        recorded_at: vital.recorded_at,
        hr: Number(vital.hr),
        sbp: Number(vital.sbp),
        map: Number(vital.map),
        dbp: Number(vital.dbp),
        resp: Number(vital.resp),
        o2sat: Number(vital.o2sat),
        temp: Number(vital.temp),
      })),
    };

    // ---------------------------------------------------
    // Call the real XGBoost API
    // ---------------------------------------------------

    const mlResponse = await fetch(
      `${ML_API_URL}/predict`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mlPayload),
      }
    );

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();

      throw new Error(
        `XGBoost API returned ${mlResponse.status}: ${errorText}`
      );
    }

    const prediction = await mlResponse.json();

    const riskScore = Number(
      prediction.risk_score
    );

    const alertTier = prediction.alert_tier;

    if (
      !Number.isFinite(riskScore) ||
      !["green", "yellow", "red"].includes(
        alertTier
      )
    ) {
      throw new Error(
        "Invalid prediction returned by XGBoost API."
      );
    }

    // ---------------------------------------------------
    // Store key input values for display.
    //
    // These are NOT SHAP values/contributions.
    // ---------------------------------------------------

    const latest = chronologicalVitals[
      chronologicalVitals.length - 1
    ];

    const topFeatures = {
      "Heart Rate": `${latest.hr} bpm`,
      "MAP": `${Math.round(Number(latest.map))} mmHg`,
      "O2 Saturation": `${latest.o2sat}%`,
    };

    // ---------------------------------------------------
    // Check whether the patient already has an
    // active alert.
    // ---------------------------------------------------

    const { data: existingAlert } =
      await supabase
        .from("alerts")
        .select("id")
        .eq("patient_id", patientId)
        .eq("status", "active")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    // ---------------------------------------------------
    // Update existing alert or create a new one.
    // ---------------------------------------------------

    if (existingAlert) {
      const { error: updateError } =
        await supabase
          .from("alerts")
          .update({
            risk_score: riskScore,
            alert_tier: alertTier,
            top_features: topFeatures,
          })
          .eq("id", existingAlert.id);

      if (updateError) {
        throw new Error(
          `Could not update alert: ${updateError.message}`
        );
      }
    } else {
      const { error: insertError } =
        await supabase
          .from("alerts")
          .insert({
            patient_id: patientId,
            risk_score: riskScore,
            alert_tier: alertTier,
            status: "active",
            top_features: topFeatures,
          });

      if (insertError) {
        throw new Error(
          `Could not create alert: ${insertError.message}`
        );
      }
    }

    // ---------------------------------------------------
    // Return real model prediction to React
    // ---------------------------------------------------

    return new Response(
      JSON.stringify({
        success: true,
        risk_score: riskScore,
        alert_tier: alertTier,
        model:
          "XGBoost (Patient_ID excluded)",
        features_used:
          prediction.features_used ?? 38,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error in predict-sepsis:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});