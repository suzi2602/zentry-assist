import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Landmark } from "lucide-react";

const Loan = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [income, setIncome] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const incomeNum = parseFloat(income);
    const creditNum = parseInt(creditScore);

    let eligibilityResult = "";

    if (incomeNum >= 30000 && creditNum >= 700) {
      eligibilityResult = `Eligible - Income: ₹${incomeNum.toLocaleString()}, Credit Score: ${creditNum}`;
    } else if (incomeNum < 30000) {
      eligibilityResult = "Not Eligible - Income below minimum (₹30,000 required)";
    } else {
      eligibilityResult = "Not Eligible - Credit score below minimum (700 required)";
    }

    setResult(eligibilityResult);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("eligibility_logs").insert({
        user_id: session.user.id,
        service_type: "loan",
        input_data: { income: incomeNum, credit_score: creditNum },
        result: eligibilityResult,
      });
    }

    toast({
      title: "Eligibility Checked",
      description: eligibilityResult,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navbar showProfile />
      <div className="container py-8">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                <Landmark className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold">Bank Loan Advisor</CardTitle>
            </div>
            <CardDescription>
              Check your eligibility for bank loans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="income">Monthly Income (₹)</Label>
                <Input
                  id="income"
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="30000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credit">Credit Score</Label>
                <Input
                  id="credit"
                  type="number"
                  value={creditScore}
                  onChange={(e) => setCreditScore(e.target.value)}
                  placeholder="700"
                  min="300"
                  max="900"
                  required
                />
              </div>

              <Button type="submit" className="w-full">Check Eligibility</Button>
            </form>

            {result && (
              <div className="mt-6 p-4 bg-secondary rounded-lg">
                <h3 className="font-semibold mb-2">Result:</h3>
                <p>{result}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Loan;
