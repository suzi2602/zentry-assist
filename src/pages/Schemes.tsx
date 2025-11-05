import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Briefcase } from "lucide-react";

const Schemes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [caste, setCaste] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [age, setAge] = useState("");
  const [result, setResult] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const incomeNum = parseFloat(annualIncome);
    const ageNum = parseInt(age);
    const eligibleSchemes: string[] = [];

    if (caste === "SC/ST" && incomeNum <= 300000) {
      eligibleSchemes.push("SC Development Grant");
    }

    if (caste === "OBC" && incomeNum <= 500000) {
      eligibleSchemes.push("OBC Scholarship Scheme");
    }

    if (caste === "General" && incomeNum <= 250000) {
      eligibleSchemes.push("General Merit Benefit");
    }

    if (ageNum >= 60) {
      eligibleSchemes.push("Senior Citizen Pension Scheme");
    }

    const eligibilityResult = eligibleSchemes.length > 0
      ? eligibleSchemes
      : ["No schemes available based on your criteria"];

    setResult(eligibilityResult);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("eligibility_logs").insert({
        user_id: session.user.id,
        service_type: "government_scheme",
        input_data: { caste, annual_income: incomeNum, age: ageNum },
        result: eligibilityResult.join(", "),
      });
    }

    toast({
      title: "Eligibility Checked",
      description: `Found ${eligibleSchemes.length} eligible scheme(s)`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navbar showProfile />
      <div className="container py-8">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-indigo-500 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold">Government Scheme Checker</CardTitle>
            </div>
            <CardDescription>
              Check your eligibility for government schemes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="caste">Caste Category</Label>
                <Select value={caste} onValueChange={setCaste} required>
                  <SelectTrigger id="caste">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="OBC">OBC</SelectItem>
                    <SelectItem value="SC/ST">SC/ST</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="income">Annual Income (₹)</Label>
                <Input
                  id="income"
                  type="number"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(e.target.value)}
                  placeholder="250000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25"
                  required
                />
              </div>

              <Button type="submit" className="w-full">Check Eligibility</Button>
            </form>

            {result.length > 0 && (
              <div className="mt-6 p-4 bg-secondary rounded-lg">
                <h3 className="font-semibold mb-2">Eligible Schemes:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {result.map((scheme, index) => (
                    <li key={index}>{scheme}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Schemes;
