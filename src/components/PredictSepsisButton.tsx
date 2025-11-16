import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Brain, Loader2 } from "lucide-react";

interface PredictSepsisButtonProps {
  patientId: string;
  onPredictionComplete?: () => void;
}

const PredictSepsisButton = ({ patientId, onPredictionComplete }: PredictSepsisButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('predict-sepsis', {
        body: { patientId },
      });

      if (error) throw error;

      toast({
        title: "Risk assessment complete",
        description: `Risk Score: ${data.risk_score.toFixed(3)} - ${data.alert_tier.toUpperCase()} alert generated`,
      });

      onPredictionComplete?.();
    } catch (error: any) {
      toast({
        title: "Prediction error",
        description: error.message || "Could not generate risk assessment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePredict}
      disabled={loading}
      className="w-full bg-primary hover:bg-primary/90"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <Brain className="h-4 w-4 mr-2" />
          Calculate Sepsis Risk
        </>
      )}
    </Button>
  );
};

export default PredictSepsisButton;