import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Activity, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import VitalsInput from "@/components/VitalsInput";
import PredictSepsisButton from "@/components/PredictSepsisButton";

interface Patient {
  id: string;
  patient_id: string;
  age: number;
  gender: string;
  admission_time: string;
}

interface Alert {
  id: string;
  risk_score: number;
  alert_tier: 'green' | 'yellow' | 'red';
  status: string;
  top_features: any;
  created_at: string;
}

interface Vitals {
  id: string;
  recorded_at: string;
  hr: number;
  o2sat: number;
  temp: number;
  resp: number;
  sbp: number;
  dbp: number;
  map: number;
}

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [vitals, setVitals] = useState<Vitals[]>([]);
  const [interventionNotes, setInterventionNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPatientData();
    }
  }, [id]);

  const fetchPatientData = async () => {
    try {
      // Fetch patient details
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Fetch alerts
      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });
      setAlerts(alertsData || []);

      // Fetch vitals
      const { data: vitalsData } = await supabase
        .from('vitals')
        .select('*')
        .eq('patient_id', id)
        .order('recorded_at', { ascending: false })
        .limit(24);
      setVitals(vitalsData || []);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast({
        title: "Error loading patient",
        description: "Could not load patient information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAlertAction = async (alertId: string, action: 'active' | 'under_investigation' | 'confirmed' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ status: action })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Alert updated",
        description: `Alert marked as ${action.replace('_', ' ')}`,
      });

      fetchPatientData();
    } catch (error: any) {
      toast({
        title: "Error updating alert",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddIntervention = async (alertId: string) => {
    if (!interventionNotes.trim()) {
      toast({
        title: "Notes required",
        description: "Please enter intervention notes",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from('interventions').insert({
        alert_id: alertId,
        patient_id: id!,
        action: 'intervention_documented',
        notes: interventionNotes,
        created_by: 'Clinician', // In real app, use actual user
      });

      if (error) throw error;

      toast({
        title: "Intervention recorded",
        description: "Clinical intervention has been documented",
      });

      setInterventionNotes("");
      fetchPatientData();
    } catch (error: any) {
      toast({
        title: "Error recording intervention",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getAlertBadge = (tier: 'green' | 'yellow' | 'red') => {
    const styles = {
      green: 'bg-alert-green/20 text-alert-green border-alert-green/30',
      yellow: 'bg-alert-yellow/20 text-alert-yellow border-alert-yellow/30',
      red: 'bg-alert-red/20 text-alert-red border-alert-red/30',
    };

    return (
      <Badge className={`${styles[tier]} text-lg px-4 py-1`} variant="outline">
        {tier.toUpperCase()} RISK
      </Badge>
    );
  };

  const getVitalStatus = (value: number, normal: { min: number; max: number }) => {
    if (value < normal.min || value > normal.max) {
      return 'text-vital-critical';
    }
    return 'text-vital-normal';
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground">Loading patient data...</div>
    </div>;
  }

  if (!patient) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground">Patient not found</div>
    </div>;
  }

  const latestAlert = alerts[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                Patient {patient.patient_id}
              </h1>
              <p className="text-sm text-muted-foreground">
                {patient.age}y, {patient.gender} • Admitted {new Date(patient.admission_time).toLocaleString()}
              </p>
            </div>
            {latestAlert && getAlertBadge(latestAlert.alert_tier)}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Alerts & Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Alert */}
            {latestAlert && (
              <Card className="p-6 border-border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-alert-red" />
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Active Alert</h2>
                      <p className="text-sm text-muted-foreground">
                        Risk Score: {latestAlert.risk_score.toFixed(3)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={latestAlert.status === 'active' ? 'default' : 'secondary'}>
                    {latestAlert.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                {latestAlert.top_features && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-foreground mb-2">Top Contributing Features:</h3>
                    <div className="space-y-2">
                      {Object.entries(latestAlert.top_features).slice(0, 3).map(([feature, value]: [string, any]) => (
                        <div key={feature} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{feature}:</span>
                          <span className="text-foreground font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mb-4">
                  <Button
                    variant="secondary"
                    onClick={() => handleAlertAction(latestAlert.id, 'under_investigation')}
                    disabled={latestAlert.status !== 'active'}
                  >
                    Mark Under Investigation
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => handleAlertAction(latestAlert.id, 'confirmed')}
                    disabled={latestAlert.status === 'confirmed'}
                  >
                    Confirm Sepsis
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAlertAction(latestAlert.id, 'rejected')}
                    disabled={latestAlert.status === 'rejected'}
                  >
                    Reject
                  </Button>
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-medium text-foreground mb-2">Document Intervention</h3>
                  <Textarea
                    value={interventionNotes}
                    onChange={(e) => setInterventionNotes(e.target.value)}
                    placeholder="Enter clinical notes and interventions..."
                    className="mb-2 bg-secondary border-border"
                    rows={3}
                  />
                  <Button onClick={() => handleAddIntervention(latestAlert.id)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Record Intervention
                  </Button>
                </div>
              </Card>
            )}

            {/* Vitals Timeline */}
            <Card className="p-6 border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">Recent Vitals (Last 24 Hours)</h2>
              <div className="space-y-4">
                {vitals.map((vital) => (
                  <div key={vital.id} className="border border-border rounded-lg p-4 bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-3">
                      {new Date(vital.recorded_at).toLocaleString()}
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">HR:</span>{' '}
                        <span className={getVitalStatus(vital.hr, { min: 60, max: 100 })}>
                          {vital.hr} bpm
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">O2Sat:</span>{' '}
                        <span className={getVitalStatus(vital.o2sat, { min: 95, max: 100 })}>
                          {vital.o2sat}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Temp:</span>{' '}
                        <span className={getVitalStatus(vital.temp, { min: 97, max: 99 })}>
                          {vital.temp}°F
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Resp:</span>{' '}
                        <span className={getVitalStatus(vital.resp, { min: 12, max: 20 })}>
                          {vital.resp}/min
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">BP:</span>{' '}
                        <span className="text-foreground">
                          {vital.sbp}/{vital.dbp}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">MAP:</span>{' '}
                        <span className={getVitalStatus(vital.map, { min: 70, max: 100 })}>
                          {vital.map.toFixed(0)} mmHg
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {vitals.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No vitals recorded yet</p>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-4">
            <VitalsInput patientId={patient.id} onSuccess={fetchPatientData} />
            <Card className="p-4 border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">ML Risk Assessment</h3>
              <PredictSepsisButton 
                patientId={patient.id} 
                onPredictionComplete={fetchPatientData}
              />
              <p className="text-xs text-muted-foreground mt-3">
                Analyzes current and recent vital-sign trends using an XGBoost model to estimate sepsis risk.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientDetail;