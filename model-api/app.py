from typing import List
from datetime import datetime
import os

import pandas as pd
import xgboost as xgb
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


# ---------------------------------------------------------
# Load trained XGBoost model
# ---------------------------------------------------------

MODEL_PATH = os.getenv(
    "MODEL_PATH",
    "xgb_sepsis_no_patient_id.json"
)

model = xgb.XGBClassifier()
model.load_model(MODEL_PATH)


# ---------------------------------------------------------
# Feature configuration
# ---------------------------------------------------------

VITAL_FEATURES = [
    "HR",
    "SBP",
    "MAP",
    "DBP",
    "Resp",
    "O2Sat",
    "Temp"
]

OTHER_FEATURES = [
    "Hour",
    "Age",
    "Gender"
]

ENGINEERED_FEATURES = (
    [
        feature
        for col in VITAL_FEATURES
        for feature in (
            f"{col}_mean6h",
            f"{col}_std6h",
        )
    ]
    + [f"{col}_delta" for col in VITAL_FEATURES]
    + [f"{col}_trend3h" for col in VITAL_FEATURES]
)

FEATURES = (
    VITAL_FEATURES
    + OTHER_FEATURES
    + ENGINEERED_FEATURES
)


# ---------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------

app = FastAPI(
    title="Sepsis Vigil XGBoost API",
    version="1.0.0"
)


# ---------------------------------------------------------
# Request data models
# ---------------------------------------------------------

class Vital(BaseModel):
    recorded_at: datetime
    hr: float
    sbp: float
    map: float
    dbp: float
    resp: float
    o2sat: float
    temp: float


class PredictionRequest(BaseModel):
    age: int
    gender: str
    hour: int
    vitals: List[Vital]


# ---------------------------------------------------------
# Health check
# ---------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok"
    }


# ---------------------------------------------------------
# Prediction endpoint
# ---------------------------------------------------------

@app.post("/predict")
def predict(req: PredictionRequest):

    # Validate gender
    if req.gender not in {"Male", "Female"}:
        raise HTTPException(
            status_code=400,
            detail="Gender must be Male or Female"
        )

    # Validate vitals
    if not req.vitals:
        raise HTTPException(
            status_code=400,
            detail="At least one vital record is required"
        )

    # -----------------------------------------------------
    # Convert incoming vitals to DataFrame
    # -----------------------------------------------------

    data = pd.DataFrame(
        [v.model_dump() for v in req.vitals]
    )

    # Sort from oldest → newest
    data = (
        data
        .sort_values("recorded_at")
        .reset_index(drop=True)
    )

    # -----------------------------------------------------
    # Convert API field names to training field names
    # -----------------------------------------------------

    data = data.rename(
        columns={
            "hr": "HR",
            "sbp": "SBP",
            "map": "MAP",
            "dbp": "DBP",
            "resp": "Resp",
            "o2sat": "O2Sat",
            "temp": "Temp",
        }
    )

    # -----------------------------------------------------
    # Temporal feature engineering
    #
    # This reproduces the structure used during training:
    # 6-hour mean
    # 6-hour standard deviation
    # hourly delta
    # 3-hour trend
    # -----------------------------------------------------

    for col in VITAL_FEATURES:

        data[f"{col}_mean6h"] = (
            data[col]
            .rolling(
                window=6,
                min_periods=1
            )
            .mean()
        )

        data[f"{col}_std6h"] = (
            data[col]
            .rolling(
                window=6,
                min_periods=1
            )
            .std()
            .fillna(0)
        )

        data[f"{col}_delta"] = (
            data[col]
            .diff()
            .fillna(0)
        )

        data[f"{col}_trend3h"] = (
            data[col]
            .diff()
            .rolling(
                window=3,
                min_periods=1
            )
            .mean()
            .fillna(0)
        )

    # -----------------------------------------------------
    # Use the newest vital record for prediction
    # -----------------------------------------------------

    row = data.iloc[-1].copy()

    # Add patient-level information
    row["Hour"] = req.hour
    row["Age"] = req.age
    row["Gender"] = (
        1 if req.gender == "Male" else 0
    )

    # -----------------------------------------------------
    # Construct exactly the feature order expected
    # by the trained XGBoost model
    # -----------------------------------------------------

    X = pd.DataFrame(
        [[row[feature] for feature in FEATURES]],
        columns=FEATURES
    )

    # -----------------------------------------------------
    # XGBoost prediction
    # -----------------------------------------------------

    probability = float(
        model.predict_proba(X)[0, 1]
    )

    # -----------------------------------------------------
    # Convert probability to alert tier
    # -----------------------------------------------------

    if probability < 0.30:
        alert_tier = "green"

    elif probability < 0.70:
        alert_tier = "yellow"

    else:
        alert_tier = "red"

    # -----------------------------------------------------
    # Return prediction
    # -----------------------------------------------------

    return {
        "risk_score": probability,
        "alert_tier": alert_tier,
        "model": "XGBoost (Patient_ID excluded)",
        "features_used": len(FEATURES)
    }