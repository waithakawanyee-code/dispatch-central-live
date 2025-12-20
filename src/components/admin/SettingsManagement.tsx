import { useState } from "react";
import { Settings, Palette, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ScheduleColorConfig {
  veryEarly: { label: string; range: string; color: string };
  earlyMorning: { label: string; range: string; color: string };
  lateMorning: { label: string; range: string; color: string };
  afternoon: { label: string; range: string; color: string };
  evening: { label: string; range: string; color: string };
}

const defaultColors: ScheduleColorConfig = {
  veryEarly: { label: "Very Early", range: "Before 6am", color: "#c084fc" },
  earlyMorning: { label: "Early Morning", range: "6am - 9am", color: "#60a5fa" },
  lateMorning: { label: "Late Morning", range: "9am - 12pm", color: "#34d399" },
  afternoon: { label: "Afternoon", range: "12pm - 5pm", color: "#fbbf24" },
  evening: { label: "Evening", range: "After 5pm", color: "#fb923c" },
};

export function SettingsManagement() {
  const { toast } = useToast();
  const [colors, setColors] = useState<ScheduleColorConfig>(defaultColors);

  const handleColorChange = (key: keyof ScheduleColorConfig, color: string) => {
    setColors((prev) => ({
      ...prev,
      [key]: { ...prev[key], color },
    }));
  };

  const handleSave = () => {
    // In a real implementation, this would save to localStorage or database
    localStorage.setItem("scheduleColors", JSON.stringify(colors));
    toast({ title: "Settings Saved", description: "Schedule color preferences updated." });
  };

  const handleReset = () => {
    setColors(defaultColors);
    localStorage.removeItem("scheduleColors");
    toast({ title: "Settings Reset", description: "Colors restored to defaults." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Settings
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Schedule Color Coding
          </CardTitle>
          <CardDescription>
            Customize the colors used to indicate different shift start times in the driver list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            {(Object.keys(colors) as Array<keyof ScheduleColorConfig>).map((key) => (
              <div key={key} className="flex items-center gap-4">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div
                    className="w-6 h-6 rounded-md border border-border"
                    style={{ backgroundColor: colors[key].color }}
                  />
                  <div>
                    <p className="text-sm font-medium">{colors[key].label}</p>
                    <p className="text-xs text-muted-foreground">{colors[key].range}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`color-${key}`} className="sr-only">
                    Color
                  </Label>
                  <Input
                    id={`color-${key}`}
                    type="color"
                    value={colors[key].color}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-12 h-8 p-0.5 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors[key].color}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-24 h-8 font-mono text-xs"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <Button onClick={handleSave}>Save Colors</Button>
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mt-4">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              Preview
            </h4>
            <div className="flex items-center gap-4 text-xs">
              {(Object.keys(colors) as Array<keyof ScheduleColorConfig>).map((key) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: colors[key].color }}
                  />
                  <span className="font-mono" style={{ color: colors[key].color }}>
                    {key === "veryEarly" ? "5a" : key === "earlyMorning" ? "7a" : key === "lateMorning" ? "10a" : key === "afternoon" ? "2p" : "6p"}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-muted-foreground/50">
                <span>OFF</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
