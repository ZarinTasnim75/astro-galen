import { useState, type ReactNode } from "react";
import { Send, ClipboardCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAstro } from "@/lib/astro/store";
import type { CheckIn } from "@/lib/astro/types";
import { cn } from "@/lib/utils";

export function SendReportDialog({ trigger }: { trigger?: ReactNode }) {
  const { transmitReport, findings, state } = useAstro();
  const [open, setOpen] = useState(false);
  const items = [
    "Current vitals",
    "Recent trends (24 h)",
    `Detected alerts (${findings.length})`,
    "Risk analysis & evidence",
    "Recommendations",
    `Sensor status (${state.sensors.filter((s) => s.connected).length}/${state.sensors.length} connected)`,
  ];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg"><Send className="h-4 w-4" /> Send Report to Mission Control</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Transmit Health Report?</DialogTitle>
          <DialogDescription>This report will be sent to Mission Control (simulated transmission).</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-surface-2 p-4">
          <div className="eyebrow mb-2">Report contents</div>
          <ul className="space-y-1.5 text-sm text-foreground">
            {items.map((i) => (
              <li key={i} className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-success" />{i}</li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { transmitReport(); setOpen(false); }}><Send className="h-4 w-4" /> Transmit Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const FEELINGS: CheckIn["feeling"][] = ["Great", "Good", "Okay", "Tired", "Unwell"];

function Scale({ label, lo, hi, value, onChange }: { label: string; lo: string; hi: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm font-semibold text-foreground"><span>{label}</span><span className="tabular text-muted-foreground">{value} / 5</span></div>
      <Slider min={1} max={5} step={1} value={[value]} onValueChange={([v]) => onChange(v)} aria-label={label} />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{lo}</span><span>{hi}</span></div>
    </div>
  );
}

export function CheckInDialog({ trigger }: { trigger: ReactNode }) {
  const { submitCheckIn } = useAstro();
  const [open, setOpen] = useState(false);
  const [feeling, setFeeling] = useState<CheckIn["feeling"]>("Good");
  const [energy, setEnergy] = useState(4);
  const [stress, setStress] = useState(2);
  const [mood, setMood] = useState(4);
  const [sleepQuality, setSleep] = useState(4);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Daily Check-In</DialogTitle>
          <DialogDescription>Takes under a minute. Self-reported data is labelled separately from sensor data.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <div className="mb-2 text-sm font-semibold text-foreground">How do you feel today?</div>
            <div className="grid grid-cols-5 gap-2" role="radiogroup">
              {FEELINGS.map((f) => (
                <button key={f} role="radio" aria-checked={feeling === f} onClick={() => setFeeling(f)}
                  className={cn("rounded-lg border py-2.5 text-sm font-semibold transition-colors", feeling === f ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-accent")}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <Scale label="Energy" lo="Low" hi="High" value={energy} onChange={setEnergy} />
          <Scale label="Stress" lo="Low" hi="High" value={stress} onChange={setStress} />
          <Scale label="Mood" lo="Low" hi="High" value={mood} onChange={setMood} />
          <Scale label="Sleep quality" lo="Poor" hi="Excellent" value={sleepQuality} onChange={setSleep} />
        </div>
        <DialogFooter>
          <Button onClick={() => { submitCheckIn({ feeling, energy, stress, mood, sleepQuality }); setOpen(false); }}>Submit Check-In</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
