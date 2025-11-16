import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PatientList from "@/components/PatientList";
import AdmitPatient from "@/components/AdmitPatient";
import { Activity, UserPlus, List } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("patients");
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePatientAdmitted = () => {
    setActiveTab("patients");
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">ICU Sepsis Alert System</h1>
                <p className="text-sm text-muted-foreground">Real-time patient monitoring & risk assessment</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-secondary">
                <div className="h-2 w-2 rounded-full bg-alert-green animate-pulse" />
                <span className="text-sm text-muted-foreground">System Active</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="patients" className="gap-2">
              <List className="h-4 w-4" />
              Patient List
            </TabsTrigger>
            <TabsTrigger value="admit" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Admit Patient
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patients" key={refreshKey}>
            <PatientList />
          </TabsContent>

          <TabsContent value="admit">
            <div className="max-w-2xl">
              <AdmitPatient onSuccess={handlePatientAdmitted} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>© 2025 ICU Sepsis Alert System</p>
            <p>Medical-grade monitoring system</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;