import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5">
      <div className="container flex min-h-screen flex-col items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-3xl">
          <h1 className="text-6xl font-bold tracking-tight">
            Welcome to <span className="text-primary">Zentry</span>
          </h1>
          <p className="text-2xl text-muted-foreground">
            Your Smart Eligibility Assistant
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Check your eligibility for visas, loans, credit cards, insurance claims, and government schemes - all in one place.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="group">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
