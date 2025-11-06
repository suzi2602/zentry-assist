import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Download } from "lucide-react";
import Tesseract from "tesseract.js";

interface FormField {
  label: string;
  value: string;
  required: boolean;
}

const FormFiller = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [currentStep, setCurrentStep] = useState<"upload" | "review" | "fill" | "complete">("upload");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(uploadedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image (JPG, PNG, WEBP) or PDF file",
        variant: "destructive",
      });
      return;
    }

    setFile(uploadedFile);
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      toast({
        title: "Processing document",
        description: "Extracting text from your form...",
      });

      const result = await Tesseract.recognize(uploadedFile, "eng", {
        logger: (m) => console.log(m),
      });

      const text = result.data.text;
      setExtractedText(text);

      const detectedFields = detectFormFields(text);
      setFormFields(detectedFields);
      setCurrentStep("review");

      toast({
        title: "Text extracted successfully",
        description: `Found ${detectedFields.length} form fields`,
      });
    } catch (error) {
      console.error("OCR Error:", error);
      toast({
        title: "Processing failed",
        description: "Unable to extract text from the document",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const detectFormFields = (text: string): FormField[] => {
    const lines = text.split("\n").filter(line => line.trim());
    const fields: FormField[] = [];
    const seenLabels = new Set<string>();

    // Pattern 1: "Label: ____" or "Label: _____" or "Label: [ ]"
    // Pattern 2: "Label |______|" or "Label [______]"
    // Pattern 3: "Label:" followed by empty line or underscores
    const fieldPatterns = [
      /^([^:]+?)[:]\s*[_\s\[\]]*$/i,  // Label: _____ or Label: [ ]
      /^([^:]+?)\s*[\|\[][\s_]+[\]\|]/i,  // Label |___| or Label [___]
      /^([^:]+?)[:]\s*$/i,  // Label: (with empty value)
    ];

    lines.forEach((line, index) => {
      for (const pattern of fieldPatterns) {
        const match = line.match(pattern);
        if (match) {
          let label = match[1].trim();
          
          // Clean up label (remove special chars at the end)
          label = label.replace(/[:\|\[\]]+$/, '').trim();
          
          // Skip if too short, too long, or already seen
          if (label.length < 2 || label.length > 50 || seenLabels.has(label.toLowerCase())) {
            continue;
          }

          // Check if there's a value after the colon/separator
          const colonIndex = line.indexOf(':');
          let extractedValue = '';
          
          if (colonIndex !== -1) {
            const afterColon = line.substring(colonIndex + 1).trim();
            // If there's actual text (not just underscores/spaces), extract it
            if (afterColon && !/^[_\s\[\]]+$/.test(afterColon)) {
              extractedValue = afterColon.replace(/[_\[\]]+$/, '').trim();
            }
          }

          seenLabels.add(label.toLowerCase());
          fields.push({
            label: label.charAt(0).toUpperCase() + label.slice(1),
            value: extractedValue,
            required: extractedValue === '', // Only required if no value found
          });
        }
      }
    });

    // If no fields detected with patterns, try to find lines with colons
    if (fields.length === 0) {
      lines.forEach(line => {
        if (line.includes(':')) {
          const [label, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          
          if (label.trim().length > 2 && label.trim().length < 50) {
            fields.push({
              label: label.trim().charAt(0).toUpperCase() + label.trim().slice(1),
              value: value.replace(/^[_\s]+$/, ''),
              required: !value || /^[_\s]+$/.test(value),
            });
          }
        }
      });
    }

    return fields;
  };

  const handleFieldChange = (index: number, value: string) => {
    const updated = [...formFields];
    updated[index].value = value;
    setFormFields(updated);
  };

  const handleSubmitForm = async () => {
    const missingFields = formFields.filter(f => f.required && !f.value);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      const { error } = await supabase.from("eligibility_logs").insert([{
        user_id: session.user.id,
        service_type: "form_filler",
        input_data: JSON.parse(JSON.stringify({ fields: formFields })),
        result: "Form completed successfully",
      }]);

      setCurrentStep("complete");

      toast({
        title: "Form completed",
        description: "Your form has been filled successfully",
      });
    } catch (error) {
      console.error("Error saving form:", error);
      toast({
        title: "Error",
        description: "Failed to save form data",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    const formData = formFields.map(f => `${f.label}: ${f.value}`).join("\n");
    const blob = new Blob([formData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "filled-form.txt";
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Form downloaded successfully",
    });
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText("");
    setFormFields([]);
    setCurrentStep("upload");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navbar showProfile />
      <div className="container py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Auto Form Filling Assistant
            </CardTitle>
            <CardDescription>
              Upload a form image or PDF. We'll scan it and help you fill missing details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === "upload" && (
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-sm text-muted-foreground mb-2">
                      Click to upload or drag and drop
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Supports: JPG, PNG, WEBP, PDF (Max 10MB)
                    </div>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </div>
                {isProcessing && (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing document...</span>
                  </div>
                )}
              </div>
            )}

            {currentStep === "review" && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Extracted Text Preview</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {extractedText.substring(0, 500)}...
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setCurrentStep("fill")} className="flex-1">
                    Continue to Fill Form
                  </Button>
                  <Button onClick={handleReset} variant="outline">
                    Upload New
                  </Button>
                </div>
              </div>
            )}

            {currentStep === "fill" && (
              <div className="space-y-4">
                <h3 className="font-semibold">Complete the Form</h3>
                <p className="text-sm text-muted-foreground">
                  Please fill in or verify the extracted information
                </p>
                {formFields.map((field, index) => (
                  <div key={index} className="space-y-2">
                    <Label>
                      {field.label} {field.required && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      value={field.value}
                      onChange={(e) => handleFieldChange(index, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSubmitForm}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Complete Form"
                    )}
                  </Button>
                  <Button onClick={() => setCurrentStep("review")} variant="outline">
                    Back
                  </Button>
                </div>
              </div>
            )}

            {currentStep === "complete" && (
              <div className="space-y-4 text-center">
                <div className="bg-primary/10 text-primary p-6 rounded-lg">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Form Completed Successfully!</h3>
                  <p className="text-sm">
                    Your form has been filled and saved.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownload} variant="outline" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Download Form
                  </Button>
                  <Button onClick={handleReset} className="flex-1">
                    Fill Another Form
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FormFiller;
