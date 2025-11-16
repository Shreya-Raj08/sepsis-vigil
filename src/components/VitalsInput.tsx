import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Activity } from "lucide-react";

interface VitalsInputProps {
  patientId: string;
  onSuccess?: () => void;
}

const VitalsInput = ({ patientId, onSuccess }: VitalsInputProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vitals, setVitals] = useState({
    hr: "",
    o2sat: "",
    temp: "",
    resp: "",
    sbp: "",
    dbp: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate MAP from SBP and DBP
      const sbp = parseFloat(vitals.sbp);
      const dbp = parseFloat(vitals.dbp);
      const map = dbp + (sbp - dbp) / 3;

      const { error } = await supabase.from('vitals').insert({
        patient_id: patientId,
        hr: vitals.hr ? parseFloat(vitals.hr) : null,
        o2sat: vitals.o2sat ? parseFloat(vitals.o2sat) : null,
        temp: vitals.temp ? parseFloat(vitals.temp) : null,
        resp: vitals.resp ? parseFloat(vitals.resp) : null,
        sbp: vitals.sbp ? parseFloat(vitals.sbp) : null,
        dbp: vitals.dbp ? parseFloat(vitals.dbp) : null,
        map: !isNaN(map) ? map : null,
      });

      if (error) throw error;

      toast({
        title: "Vitals recorded",
        description: "Vital signs have been successfully recorded.",
      });

      setVitals({ hr: "", o2sat: "", temp: "", resp: "", sbp: "", dbp: "" });
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error recording vitals",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 border-border">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Record Vitals</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hr">Heart Rate (bpm)</Label>
            <Input
              id="hr"
              type="number"
              value={vitals.hr}
              onChange={(e) => setVitals({ ...vitals, hr: e.target.value })}
              placeholder="e.g., 75"
              className="bg-secondary border-border"
            />
          </div>

          <div>
            <Label htmlFor="o2sat">O2 Saturation (%)</Label>
            <Input
              id="o2sat"
              type="number"
              value={vitals.o2sat}
              onChange={(e) => setVitals({ ...vitals, o2sat: e.target.value })}
              placeholder="e.g., 98"
              className="bg-secondary border-border"
            />
          </div>

          <div>
            <Label htmlFor="temp">Temperature (°F)</Label>
            <Input
              id="temp"
              type="number"
              step="0.1"
              value={vitals.temp}
              onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
              placeholder="e.g., 98.6"
              className="bg-secondary border-border"
            />
          </div>

          <div>
            <Label htmlFor="resp">Respiratory Rate</Label>
            <Input
              id="resp"
              type="number"
              value={vitals.resp}
              onChange={(e) => setVitals({ ...vitals, resp: e.target.value })}
              placeholder="e.g., 16"
              className="bg-secondary border-border"
            />
          </div>

          <div>
            <Label htmlFor="sbp">Systolic BP (mmHg)</Label>
            <Input
              id="sbp"
              type="number"
              value={vitals.sbp}
              onChange={(e) => setVitals({ ...vitals, sbp: e.target.value })}
              placeholder="e.g., 120"
              className="bg-secondary border-border"
            />
          </div>

          <div>
            <Label htmlFor="dbp">Diastolic BP (mmHg)</Label>
            <Input
              id="dbp"
              type="number"
              value={vitals.dbp}
              onChange={(e) => setVitals({ ...vitals, dbp: e.target.value })}
              placeholder="e.g., 80"
              className="bg-secondary border-border"
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          MAP will be calculated automatically from SBP and DBP
        </p>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Recording..." : "Record Vitals"}
        </Button>
      </form>
    </Card>
  );
};

export default VitalsInput;