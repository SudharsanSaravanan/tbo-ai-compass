import { useState } from "react";
import { CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: "passport", label: "Valid passport / visa", category: "Documents" },
  { id: "tickets", label: "Flight tickets & confirmations", category: "Documents" },
  { id: "insurance", label: "Travel insurance", category: "Documents" },
  { id: "copies", label: "Copies of important documents", category: "Documents" },
  { id: "clothing", label: "Weather-appropriate clothing", category: "Packing" },
  { id: "shoes", label: "Comfortable walking shoes", category: "Packing" },
  { id: "toiletries", label: "Toiletries & medications", category: "Packing" },
  { id: "charger", label: "Phone charger & power bank", category: "Packing" },
  { id: "adapter", label: "Universal power adapter", category: "Packing" },
  { id: "currency", label: "Local currency / travel card", category: "Finance" },
  { id: "notify-bank", label: "Notify bank of travel", category: "Finance" },
  { id: "emergency", label: "Emergency contacts list", category: "Safety" },
  { id: "first-aid", label: "Basic first-aid kit", category: "Safety" },
  { id: "sunscreen", label: "Sunscreen & sunglasses", category: "Packing" },
];

interface TripChecklistProps {
  readOnly?: boolean;
  className?: string;
}

export default function TripChecklist({ readOnly = false, className }: TripChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    if (readOnly) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const categories = [...new Set(CHECKLIST_ITEMS.map((i) => i.category))];
  const completedCount = checked.size;
  const totalCount = CHECKLIST_ITEMS.length;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Trip Checklist</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{totalCount} done
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-secondary mb-4">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {categories.map((cat) => (
          <div key={cat}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {cat}
            </p>
            <div className="space-y-1">
              {CHECKLIST_ITEMS.filter((i) => i.category === cat).map((item) => (
                <label
                  key={item.id}
                  className={cn(
                    "flex items-center gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-accent/30 transition-colors",
                    readOnly && "cursor-default"
                  )}
                >
                  <Checkbox
                    checked={checked.has(item.id)}
                    onCheckedChange={() => toggle(item.id)}
                    disabled={readOnly}
                    className="h-3.5 w-3.5"
                  />
                  <span
                    className={cn(
                      "text-xs text-foreground transition-all",
                      checked.has(item.id) && "line-through text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
