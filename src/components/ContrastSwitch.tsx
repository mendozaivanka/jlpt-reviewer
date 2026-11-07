import { useEffect, useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const KEY = "contrast";

function isHigh() {
  const set = document.documentElement.dataset.contrast;
  if (set === "high") return true;
  if (set === "normal") return false;
  return window.matchMedia("(prefers-contrast: more)").matches;
}

/** High-contrast toggle. Persists an explicit choice; otherwise follows prefers-contrast. */
export default function ContrastSwitch() {
  const id = useId();
  const [high, setHigh] = useState(false);

  useEffect(() => {
    setHigh(isHigh());
    const mq = window.matchMedia("(prefers-contrast: more)");
    const sync = () => setHigh(isHigh());
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function onChange(checked: boolean) {
    const root = document.documentElement;
    const value = checked ? "high" : "normal";
    root.dataset.contrast = value;
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* storage blocked: still applies for this page view */
    }
    setHigh(checked);
  }

  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={high} onCheckedChange={onChange} />
      <Label htmlFor={id}>High contrast</Label>
    </div>
  );
}
