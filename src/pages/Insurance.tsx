import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

const Insurance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [claimAmount, setClaimAmount] = useState("");
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
    
    const amountNum = parseFloat(claimAmount);

    let eligibilityResult = "";

    if (amountNum <= 200000) {
      eligibilityResult = `Claim Approved - Amount: ₹${amountNum.toLocaleString()}`;
    } else {
      eligibilityResult = `Claim Under Review - Amount exceeds automatic approval limit (₹2,00,000)`;
    }

    setResult(eligibilityResult);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("eligibility_logs").insert({
        user_id: session.user.id,
        service_type: "insurance",
        input_data: { claim_amount: amountNum },
        result: eligibilityResult,
      });
    }

    toast({
      title: "Claim Processed",
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
              <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold">Insurance Claim Helper</CardTitle>
            </div>
            <CardDescription>
              Check your insurance claim eligibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="claim">Claim Amount (₹)</Label>
                <Input
                  id="claim"
                  type="number"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  placeholder="100000"
                  required
                />
              </div>

              <Button type="submit" className="w-full">Check Claim Status</Button>
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

export default Insurance;
