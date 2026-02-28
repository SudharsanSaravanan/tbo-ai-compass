import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";

interface TripCalendarProps {
  startDate: string;
  endDate: string;
  numDays?: number;
}

export default function TripCalendar({
  startDate,
  endDate,
  numDays,
}: TripCalendarProps) {
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
    <div className="w-full rounded-2xl border border-border/40 bg-white/80 backdrop-blur-md shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold text-foreground">
            Travel Dates
          </span>
        </div>

        {numDays ? (
          <span className="text-sm text-muted-foreground">
            {numDays} days
          </span>
        ) : null}
      </div>

      {/* Calendar */}
      <Calendar
        mode="multiple"
        selected={selected}
        defaultMonth={defaultMonth}
        className="w-full"
        classNames={{
          months: "w-full",
          month: "w-full space-y-4",
          caption: "relative flex items-center justify-center w-full",
          caption_label: "text-base font-semibold text-foreground",
          nav: "flex items-center gap-2",
          nav_button:
            "h-8 w-8 rounded-md border border-border bg-white hover:bg-muted transition flex items-center justify-center",
          table: "w-full border-collapse",
          head_row: "w-full",
          row: "w-full",
          head_cell: "text-muted-foreground font-medium text-sm",
          cell: "h-11 w-full text-center",
          day: "h-10 w-10 p-0 font-medium aria-selected:opacity-100",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-md",
        }}
      />
    </div>
  );
}