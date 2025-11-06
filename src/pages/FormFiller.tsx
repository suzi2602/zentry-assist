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
  x?: number;
  y?: number;
}

const FormFiller = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [currentStep, setCurrentStep] = useState<"upload" | "review" | "fill" | "complete">("upload");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [ocrData, setOcrData] = useState<any>(null);

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

      // Create image URL for canvas rendering later
      const url = URL.createObjectURL(uploadedFile);
      setImageUrl(url);

      const result = await Tesseract.recognize(uploadedFile, "eng", {
        logger: (m) => console.log(m),
      });

      const text = result.data.text;
      setExtractedText(text);
      setOcrData(result.data);

      const detectedFields = detectFormFields(text, result.data);
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

  const detectFormFields = (text: string, ocrData?: any): FormField[] => {
    const lines = text.split("\n").filter(line => line.trim());
    const fields: FormField[] = [];
    const seenLabels = new Set<string>();

    // Get word-level position data if available
    const words = ocrData?.words || [];

    // Enhanced patterns to catch more field types
    const fieldPatterns = [
      /^([^:]+?)[:]\s*[_\s\[\]\(\)\.]*$/i,  // Label: _____ or Label: [ ]
      /^([^:]+?)\s*[\|\[\(][\s_\.]+[\]\|\)]/i,  // Label |___| or Label [___] or Label (...)
      /^([^:]+?)[:]\s*$/i,  // Label: (with empty value)
      /^([^:]+?)\s+[_\.]{3,}/i,  // Label _____ (spaces then underscores)
      /^([^:]+?)\s*\([^\)]*\)\s*$/i,  // Label (    )
      /^([^:]+?)\s*\[[^\]]*\]\s*$/i,  // Label [    ]
    ];

    // Process each line
    lines.forEach((line, lineIndex) => {
      for (const pattern of fieldPatterns) {
        const match = line.match(pattern);
        if (match) {
          let label = match[1].trim();
          
          // Clean up label
          label = label.replace(/[:\|\[\]\(\)\.]+$/, '').trim();
          label = label.replace(/^[_\-\*]+/, '').trim();
          
          // Skip invalid labels
          if (label.length < 2 || label.length > 60 || seenLabels.has(label.toLowerCase())) {
            continue;
          }

          // Filter out non-field text (headings, instructions, etc)
          const invalidPatterns = [
            /^(page|section|form|application|document|title|heading)/i,
            /^(instructions?|note|please|important|attention)/i,
            /^\d+\.?\s/,  // numbered items
          ];
          
          if (invalidPatterns.some(p => p.test(label))) {
            continue;
          }

          // Extract value if present
          const colonIndex = line.indexOf(':');
          let extractedValue = '';
          let fieldX, fieldY;
          
          if (colonIndex !== -1) {
            const afterColon = line.substring(colonIndex + 1).trim();
            if (afterColon && !/^[_\s\[\]\(\)\.]+$/.test(afterColon)) {
              extractedValue = afterColon.replace(/[_\[\]\(\)\.]+$/, '').trim();
            }
          }

          // Try to find position from OCR word data
          if (words.length > 0) {
            const labelWords = label.toLowerCase().split(' ');
            const matchingWord = words.find((w: any) => 
              labelWords.some((lw: string) => w.text.toLowerCase().includes(lw))
            );
            if (matchingWord) {
              fieldX = matchingWord.bbox.x1;
              fieldY = matchingWord.bbox.y1 + 20; // Position below the label
            }
          }

          seenLabels.add(label.toLowerCase());
          fields.push({
            label: label.charAt(0).toUpperCase() + label.slice(1),
            value: extractedValue,
            required: extractedValue === '',
            x: fieldX,
            y: fieldY,
          });
        }
      }
    });

    // Additional pass: find standalone words that look like labels
    const standalonePatterns = [
      /^(name|address|city|state|country|zip|postal|phone|mobile|email|date|age|gender|occupation|income|signature)$/i,
    ];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (standalonePatterns.some(p => p.test(trimmed)) && !seenLabels.has(trimmed.toLowerCase())) {
        seenLabels.add(trimmed.toLowerCase());
        fields.push({
          label: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
          value: '',
          required: true,
        });
      }
    });

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

  const handleDownload = async () => {
    try {
      // Create canvas to draw the filled form
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Load the original image
      const img = new Image();
      img.src = imageUrl;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original form
      ctx.drawImage(img, 0, 0);

      // Set text styling
      ctx.font = '16px Arial';
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';

      // Draw filled values onto the form
      formFields.forEach((field, index) => {
        if (field.value) {
          const x = field.x || 200; // Default position if OCR position not available
          const y = field.y || 100 + (index * 40);
          
          // Add white background for better readability
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x - 2, y - 2, 300, 22);
          
          // Draw text
          ctx.fillStyle = '#000000';
          ctx.fillText(field.value, x, y);
        }
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'filled-form.png';
          a.click();
          URL.revokeObjectURL(url);

          toast({
            title: "Downloaded",
            description: "Filled form downloaded successfully",
          });
        }
      }, 'image/png');
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to generate filled form",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText("");
    setFormFields([]);
    setCurrentStep("upload");
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl("");
    }
    setOcrData(null);
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
