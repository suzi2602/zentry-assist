import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FileText } from "lucide-react";

const Visa = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [country, setCountry] = useState("");
  const [income, setIncome] = useState("");
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
    
    let eligibilityResult = "";
    const incomeNum = parseFloat(income);

    if (country === "India") {
      eligibilityResult = "Eligible - Indian citizens are always eligible";
    } else if (incomeNum >= 50000) {
      eligibilityResult = `Eligible - Income meets requirement (₹${incomeNum.toLocaleString()})`;
    } else {
      eligibilityResult = `Not Eligible - Income below minimum (₹50,000 required)`;
    }

    setResult(eligibilityResult);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("eligibility_logs").insert({
        user_id: session.user.id,
        service_type: "visa",
        input_data: { country, income: incomeNum },
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
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold">Visa Eligibility Checker</CardTitle>
            </div>
            <CardDescription>
              Check your eligibility for visa applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={country} onValueChange={setCountry} required>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="India">India</SelectItem>
                    <SelectItem value="USA">USA</SelectItem>
                    <SelectItem value="UK">UK</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="income">Monthly Income (₹)</Label>
                <Input
                  id="income"
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="50000"
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

export default Visa;
