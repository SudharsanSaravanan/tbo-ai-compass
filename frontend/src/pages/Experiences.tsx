import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link2, Youtube, FileText, Sparkles, ArrowRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockExtracted = [
  { title: "Hidden Waterfall in Ubud", source: "YouTube", type: "activity" },
  { title: "Best Warung in Canggu", source: "Blog", type: "food" },
  { title: "Secret Beach near Uluwatu", source: "YouTube", type: "activity" },
];

export default function Experiences() {
  const [url, setUrl] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [extracted, setExtracted] = useState<typeof mockExtracted>([]);
  const navigate = useNavigate();

  const addLink = () => {
    if (url.trim() && !links.includes(url.trim())) {
      setLinks([...links, url.trim()]);
      setUrl("");
    }
  };

  const extract = () => {
    setExtracted(mockExtracted);
  };

  return (
    <div className="container max-w-2xl py-12 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <div className="travel-gradient rounded-lg p-1.5">
          <Link2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-medium text-primary">Experience Import</span>
      </div>
      <h1 className="text-2xl font-bold mb-1">Import Travel Inspiration</h1>
      <p className="text-muted-foreground text-sm mb-8">Paste YouTube or blog links to extract travel spots and generate a trip.</p>

      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex gap-2 mb-4">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLink()}
            placeholder="Paste a YouTube or blog URL..."
            className="flex-1 bg-accent rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button onClick={addLink} size="sm" variant="outline" className="rounded-xl"><Plus className="h-4 w-4" /></Button>
        </div>

        {links.length > 0 && (
          <div className="space-y-2 mb-4">
            {links.map((l, i) => (
              <div key={i} className="flex items-center gap-2 bg-accent/50 rounded-lg px-3 py-2 text-sm">
                {l.includes("youtube") ? <Youtube className="h-4 w-4 text-destructive shrink-0" /> : <FileText className="h-4 w-4 text-primary shrink-0" />}
                <span className="truncate flex-1">{l}</span>
                <button onClick={() => setLinks(links.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
              </div>
            ))}
          </div>
        )}

        <Button onClick={extract} disabled={links.length === 0} className="w-full">
          <Sparkles className="h-4 w-4 mr-1" /> Extract Travel Spots
        </Button>
      </div>

      {extracted.length > 0 && (
        <div className="bg-card border rounded-2xl p-5 animate-slide-up">
          <h2 className="font-semibold text-sm mb-4">Extracted Spots</h2>
          <div className="space-y-2 mb-6">
            {extracted.map((e, i) => (
              <div key={i} className="flex items-center justify-between bg-accent/50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.source} • {e.type}</p>
                </div>
                <span className="bg-success/10 text-success text-xs font-medium px-2 py-0.5 rounded-full">Added</span>
              </div>
            ))}
          </div>
          <Button onClick={() => navigate("/intent", { state: { query: "Trip from extracted spots" } })} className="w-full">
            Generate Trip from Spots <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
