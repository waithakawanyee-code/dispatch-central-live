import { format, isSameDay } from "date-fns";
import { X, CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: Date;
  drivers: Array<{ id: string; name: string; is_active: boolean; status: string }>;
  offDriver: { id: string; name: string } | null;
  onOffDriverChange: (driver: { id: string; name: string } | null) => void;
  isCallOutChecked: boolean;
  onIsCallOutChange: (v: boolean) => void;
  callOutNote: string;
  onCallOutNoteChange: (v: string) => void;
  offDates: Date[];
  onOffDatesChange: (dates: Date[]) => void;
  onConfirm: () => void;
}

export function MarkOffDialog({
  open,
  onOpenChange,
  today,
  drivers,
  offDriver,
  onOffDriverChange,
  isCallOutChecked,
  onIsCallOutChange,
  callOutNote,
  onCallOutNoteChange,
  offDates,
  onOffDatesChange,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle>Mark Driver OFF</DialogTitle>
          <DialogDescription>
            Did the driver call out?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="off-driver">Driver</Label>
            <Select value={offDriver?.id || ""} onValueChange={val => {
              const driver = drivers.find(d => d.id === val);
              if (driver) {
                onOffDriverChange({
                  id: driver.id,
                  name: driver.name
                });
              }
            }}>
              <SelectTrigger id="off-driver">
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.filter(d => d.is_active && d.status !== "on_the_clock").map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Schedule OFF for future dates (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {offDates.length > 0 ? `${offDates.length} date${offDates.length > 1 ? "s" : ""} selected` : "Select future dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="multiple"
                  selected={offDates}
                  onSelect={dates => onOffDatesChange(dates || [])}
                  disabled={date => date < today}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {offDates.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {offDates.sort((a, b) => a.getTime() - b.getTime()).map((date, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {format(date, "EEE, MMM d")}
                    <button
                      type="button"
                      onClick={() => onOffDatesChange(offDates.filter(d => !isSameDay(d, date)))}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {offDates.length === 0
                ? "Leave empty to mark OFF for today only"
                : offDates.some(d => isSameDay(d, today))
                  ? "Today is included - driver status will change now"
                  : "Future dates only - driver status won't change today"}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="call-out-page"
              checked={isCallOutChecked}
              onCheckedChange={checked => onIsCallOutChange(checked === true)}
            />
            <Label htmlFor="call-out-page" className="text-sm font-normal">
              Yes, driver called out
            </Label>
          </div>
          {isCallOutChecked && (
            <div className="grid gap-2">
              <Label htmlFor="call-out-note-page">Note (optional)</Label>
              <Textarea
                id="call-out-note-page"
                placeholder="Reason for call out..."
                value={callOutNote}
                onChange={e => onCallOutNoteChange(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            onOpenChange(false);
            onOffDatesChange([]);
          }} tabIndex={-1}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!offDriver}>
            Confirm OFF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
