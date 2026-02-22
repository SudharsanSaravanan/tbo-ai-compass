import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Share2, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockTrips } from "@/lib/mock-data";

export default function MicrositeCreate() {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const trip = mockTrips.find((t) => t.id === tripId) || mockTrips[0];
  const [copied, setCopied] = useState(false);
  const slug = trip.title.toLowerCase().replace(/\s+/g, "-");
  const link = `/m/${slug}`;

  const copy = () => {
    navigator.clipboard.writeText(window.location.origin + link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container max-w-lg py-12 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 travel-gradient rounded-2xl mb-4">
          <Share2 className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Share Trip</h1>
        <p className="text-muted-foreground text-sm">Create a shareable microsite for "{trip.title}"</p>
      </div>

      <div className="bg-card border rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground">Client Name</label>
          <input className="w-full bg-accent rounded-xl px-4 py-2.5 text-sm mt-1 outline-none" placeholder="John & Jane Smith" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Custom Message</label>
          <textarea className="w-full bg-accent rounded-xl px-4 py-2.5 text-sm mt-1 outline-none resize-none h-20" placeholder="Here's your personalized trip to Bali!" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Shareable Link</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-accent rounded-xl px-4 py-2.5 text-sm text-muted-foreground truncate">{window.location.origin + link}</div>
            <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <a href={link} target="_blank" rel="noopener"><ExternalLink className="h-4 w-4 mr-1" /> Preview</a>
        </Button>
        <Button className="flex-1" onClick={copy}>
          <Share2 className="h-4 w-4 mr-1" /> Copy & Share
        </Button>
      </div>
    </div>
  );
}
