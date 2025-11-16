import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Patient {
  id: string;
  patient_id: string;
  age: number;
  gender: string;
  admission_time: string;
  alerts?: {
    id: string;
    alert_tier: 'green' | 'yellow' | 'red';
    risk_score: number;
    status: string;
  }[];
}

const PatientList = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
    
    // Subscribe to real-time alert updates
    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts'
        },
        () => {
          fetchPatients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPatients = async () => {
    try {
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .order('admission_time', { ascending: false });

      if (patientsError) throw patientsError;

      // Fetch latest alert for each patient
      const patientsWithAlerts = await Promise.all(
        (patientsData || []).map(async (patient) => {
          const { data: alerts } = await supabase
            .from('alerts')
            .select('*')
            .eq('patient_id', patient.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1);

          return { ...patient, alerts: alerts || [] };
        })
      );

      setPatients(patientsWithAlerts);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (tier?: 'green' | 'yellow' | 'red') => {
    if (!tier) return <Activity className="h-5 w-5 text-muted-foreground" />;
    
    switch (tier) {
      case 'green':
        return <CheckCircle2 className="h-5 w-5 text-alert-green" />;
      case 'yellow':
        return <AlertTriangle className="h-5 w-5 text-alert-yellow" />;
      case 'red':
        return <AlertTriangle className="h-5 w-5 text-alert-red" />;
    }
  };

  const getAlertBadge = (tier?: 'green' | 'yellow' | 'red') => {
    if (!tier) return <Badge variant="secondary">No Alert</Badge>;
    
    const variants = {
      green: 'bg-alert-green/20 text-alert-green border-alert-green/30',
      yellow: 'bg-alert-yellow/20 text-alert-yellow border-alert-yellow/30',
      red: 'bg-alert-red/20 text-alert-red border-alert-red/30',
    };

    return (
      <Badge className={variants[tier]} variant="outline">
        {tier.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading patients...</div>;
  }

  return (
    <div className="space-y-4">
      {patients.map((patient) => (
        <Card
          key={patient.id}
          className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors border-border"
          onClick={() => navigate(`/patient/${patient.id}`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getAlertIcon(patient.alerts?.[0]?.alert_tier)}
              <div>
                <h3 className="font-semibold text-foreground">
                  Patient {patient.patient_id}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {patient.age}y, {patient.gender} • Admitted{' '}
                  {new Date(patient.admission_time).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {patient.alerts?.[0] && (
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    Risk Score: {patient.alerts[0].risk_score.toFixed(2)}
                  </p>
                </div>
              )}
              {getAlertBadge(patient.alerts?.[0]?.alert_tier)}
            </div>
          </div>
        </Card>
      ))}
      {patients.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No patients admitted yet
        </div>
      )}
    </div>
  );
};

export default PatientList;