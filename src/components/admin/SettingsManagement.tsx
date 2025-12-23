import { useState, useEffect } from "react";
import { Settings, Palette, Clock, LayoutList, Filter, Sun, Moon, Monitor, Calendar } from "lucide-react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDateFormat, DATE_FORMAT_OPTIONS, type DateFormatOption } from "@/hooks/useDateFormat";

interface ScheduleColorConfig {
  veryEarly: { label: string; range: string; color: string };
  earlyMorning: { label: string; range: string; color: string };
  lateMorning: { label: string; range: string; color: string };
  afternoon: { label: string; range: string; color: string };
  evening: { label: string; range: string; color: string };
}

interface DisplayPreferences {
  defaultPageSize: number;
  defaultDriverTab: "cdl" | "non-cdl";
  defaultActiveFilter: "all" | "active" | "inactive";
  showScheduleInTable: boolean;
  showColorLegend: boolean;
  compactMode: boolean;
}

const defaultColors: ScheduleColorConfig = {
  veryEarly: { label: "Very Early", range: "Before 6am", color: "#c084fc" },
  earlyMorning: { label: "Early Morning", range: "6am - 9am", color: "#60a5fa" },
  lateMorning: { label: "Late Morning", range: "9am - 12pm", color: "#34d399" },
  afternoon: { label: "Afternoon", range: "12pm - 5pm", color: "#fbbf24" },
  evening: { label: "Evening", range: "After 5pm", color: "#fb923c" },
};

const defaultDisplayPrefs: DisplayPreferences = {
  defaultPageSize: 10,
  defaultDriverTab: "non-cdl",
  defaultActiveFilter: "active",
  showScheduleInTable: true,
  showColorLegend: true,
  compactMode: false,
};

export function SettingsManagement() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { dateFormat, setDateFormat } = useDateFormat();
  const [colors, setColors] = useState<ScheduleColorConfig>(defaultColors);
  const [displayPrefs, setDisplayPrefs] = useState<DisplayPreferences>(defaultDisplayPrefs);

  // Load saved settings on mount
  useEffect(() => {
    const savedColors = localStorage.getItem("scheduleColors");
    const savedPrefs = localStorage.getItem("displayPreferences");
    if (savedColors) {
      try {
        setColors(JSON.parse(savedColors));
      } catch (e) {
        console.error("Failed to parse saved colors");
      }
    }
    if (savedPrefs) {
      try {
        setDisplayPrefs({ ...defaultDisplayPrefs, ...JSON.parse(savedPrefs) });
      } catch (e) {
        console.error("Failed to parse saved preferences");
      }
    }
  }, []);

  const handleColorChange = (key: keyof ScheduleColorConfig, color: string) => {
    setColors((prev) => ({
      ...prev,
      [key]: { ...prev[key], color },
    }));
  };

  const handlePrefChange = <K extends keyof DisplayPreferences>(key: K, value: DisplayPreferences[K]) => {
    setDisplayPrefs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveAll = () => {
    localStorage.setItem("scheduleColors", JSON.stringify(colors));
    localStorage.setItem("displayPreferences", JSON.stringify(displayPrefs));
    toast({ title: "Settings Saved", description: "All preferences have been updated." });
  };

  const handleResetAll = () => {
    setColors(defaultColors);
    setDisplayPrefs(defaultDisplayPrefs);
    localStorage.removeItem("scheduleColors");
    localStorage.removeItem("displayPreferences");
    toast({ title: "Settings Reset", description: "All settings restored to defaults." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Settings
        </h2>
        <div className="flex items-center gap-2">
          <Button onClick={handleSaveAll}>Save All Settings</Button>
          <Button variant="outline" onClick={handleResetAll}>
            Reset All
          </Button>
        </div>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Choose your preferred color theme for the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
              className="gap-2"
            >
              <Sun className="h-4 w-4" />
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
              className="gap-2"
            >
              <Moon className="h-4 w-4" />
              Dark
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("system")}
              className="gap-2"
            >
              <Monitor className="h-4 w-4" />
              System
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Date Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Format
          </CardTitle>
          <CardDescription>
            Choose how dates are displayed throughout the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Display Format</Label>
              <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as DateFormatOption)}>
                <SelectTrigger id="dateFormat" className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span>{option.label}</span>
                        <span className="text-muted-foreground text-xs">({option.example})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This affects how dates appear in tables, reports, and forms.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutList className="h-5 w-5" />
            Display Preferences
          </CardTitle>
          <CardDescription>
            Configure how driver lists are displayed by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pageSize">Default Page Size</Label>
              <Select
                value={displayPrefs.defaultPageSize.toString()}
                onValueChange={(v) => handlePrefChange("defaultPageSize", parseInt(v))}
              >
                <SelectTrigger id="pageSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 drivers</SelectItem>
                  <SelectItem value="10">10 drivers</SelectItem>
                  <SelectItem value="25">25 drivers</SelectItem>
                  <SelectItem value="50">50 drivers</SelectItem>
                  <SelectItem value="100">100 drivers</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Number of drivers shown per page</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultTab">Default Driver Tab</Label>
              <Select
                value={displayPrefs.defaultDriverTab}
                onValueChange={(v) => handlePrefChange("defaultDriverTab", v as "cdl" | "non-cdl")}
              >
                <SelectTrigger id="defaultTab">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non-cdl">Non-CDL Drivers</SelectItem>
                  <SelectItem value="cdl">CDL Drivers</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Which tab opens first</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Preferences
          </CardTitle>
          <CardDescription>
            Set default filter behavior for the driver list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="activeFilter">Default Status Filter</Label>
              <Select
                value={displayPrefs.defaultActiveFilter}
                onValueChange={(v) => handlePrefChange("defaultActiveFilter", v as "all" | "active" | "inactive")}
              >
                <SelectTrigger id="activeFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Drivers Only</SelectItem>
                  <SelectItem value="inactive">Inactive Drivers Only</SelectItem>
                  <SelectItem value="all">All Drivers</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Which drivers are shown by default</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Schedule in Table</Label>
                <p className="text-xs text-muted-foreground">Display weekly schedule columns in driver list</p>
              </div>
              <Switch
                checked={displayPrefs.showScheduleInTable}
                onCheckedChange={(v) => handlePrefChange("showScheduleInTable", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Color Legend</Label>
                <p className="text-xs text-muted-foreground">Display schedule color legend above table</p>
              </div>
              <Switch
                checked={displayPrefs.showColorLegend}
                onCheckedChange={(v) => handlePrefChange("showColorLegend", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compact Mode</Label>
                <p className="text-xs text-muted-foreground">Reduce row height for more drivers on screen</p>
              </div>
              <Switch
                checked={displayPrefs.compactMode}
                onCheckedChange={(v) => handlePrefChange("compactMode", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Colors */}
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
