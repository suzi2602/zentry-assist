import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Shield, Briefcase, FileText, Landmark } from "lucide-react";

const services = [
  {
    title: "Visa Eligibility",
    description: "Check your visa eligibility for different countries",
    icon: FileText,
    path: "/visa",
    color: "bg-blue-500",
  },
  {
    title: "Bank Loan Advisor",
    description: "Get advice on loan eligibility and options",
    icon: Landmark,
    path: "/loan",
    color: "bg-green-500",
  },
  {
    title: "Credit Card Advisor",
    description: "Find the right credit card for your needs",
    icon: CreditCard,
    path: "/credit",
    color: "bg-purple-500",
  },
  {
    title: "Insurance Claim Helper",
    description: "Assistance with insurance claims and eligibility",
    icon: Shield,
    path: "/insurance",
    color: "bg-orange-500",
  },
  {
    title: "Government Scheme Checker",
    description: "Check eligibility for government schemes",
    icon: Briefcase,
    path: "/schemes",
    color: "bg-indigo-500",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navbar showProfile />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to Zentry</h1>
          <p className="text-muted-foreground text-lg">
            Your Smart Eligibility Assistant - Check your eligibility for various services
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Card
                key={service.path}
                className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                onClick={() => navigate(service.path)}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${service.color} flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle>{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary font-medium">Click to check eligibility →</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
