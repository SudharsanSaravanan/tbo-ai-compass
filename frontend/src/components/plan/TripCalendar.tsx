import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";

interface TripCalendarProps {
  startDate: string;
  endDate: string;
  numDays?: number;
}

export default function TripCalendar({ startDate, endDate, numDays }: TripCalendarProps) {
  const { selected, defaultMonth } = useMemo(() => {
    const dates: Date[] = [];
    if (startDate) {
      const s = new Date(startDate + "T00:00:00");
      const e = endDate ? new Date(endDate + "T00:00:00") : s;
      const cur = new Date(s);
      while (cur <= e) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
    return {
      selected: dates,
      defaultMonth: dates.length > 0 ? dates[0] : new Date(),
    };
  }, [startDate, endDate]);

  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <CalendarDays className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">Travel Dates</span>
        {numDays ? (
          <span className="text-[10px] text-muted-foreground ml-auto">{numDays} days</span>
        ) : null}
      </div>
      <Calendar
        mode="multiple"
        selected={selected}
        defaultMonth={defaultMonth}
        className="rounded-md"
        classNames={{
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        }}
      />
    </div>
  );
}
