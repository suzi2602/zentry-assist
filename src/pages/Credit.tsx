import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CreditCard } from "lucide-react";

const Credit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [salary, setSalary] = useState("");
  const [existingCards, setExistingCards] = useState("");
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
    
    const salaryNum = parseFloat(salary);
    const cardsNum = parseInt(existingCards);

    let eligibilityResult = "";

    if (salaryNum >= 40000 && cardsNum <= 2) {
      eligibilityResult = `Eligible - Salary: ₹${salaryNum.toLocaleString()}, Existing Cards: ${cardsNum}`;
    } else if (salaryNum < 40000) {
      eligibilityResult = "Not Eligible - Salary below minimum (₹40,000 required)";
    } else {
      eligibilityResult = "Not Eligible - Too many existing cards (maximum 2 allowed)";
    }

    setResult(eligibilityResult);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("eligibility_logs").insert({
        user_id: session.user.id,
        service_type: "credit_card",
        input_data: { salary: salaryNum, existing_cards: cardsNum },
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
              <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold">Credit Card Advisor</CardTitle>
            </div>
            <CardDescription>
              Check your eligibility for credit cards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="salary">Monthly Salary (₹)</Label>
                <Input
                  id="salary"
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="40000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cards">Number of Existing Credit Cards</Label>
                <Input
                  id="cards"
                  type="number"
                  value={existingCards}
                  onChange={(e) => setExistingCards(e.target.value)}
                  placeholder="0"
                  min="0"
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

export default Credit;
