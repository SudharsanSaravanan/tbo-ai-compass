import { Play, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export interface VideoInfo {
  video_id: string;
  title: string;
  url: string;
  channel?: string;
  thumbnail: string;
  transcript_summary?: string;
}

interface VideoCardProps {
  video: VideoInfo;
  label?: string;
}

export default function VideoCard({ video, label }: VideoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card/60 overflow-hidden shadow-sm"
    >
      {label && (
        <div className="px-3 py-1.5 bg-primary/5 border-b border-border">
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">{label}</span>
        </div>
      )}
      <a href={video.url} target="_blank" rel="noreferrer" className="block group">
        <div className="relative">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-[140px] object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`;
            }}
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Play className="h-5 w-5 text-red-600 ml-0.5" fill="currentColor" />
            </div>
          </div>
        </div>
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </p>
          {video.channel && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{video.channel}</p>
          )}
        </div>
      </a>
      {video.transcript_summary && (
        <div className="px-3 pb-2">
          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">
            {video.transcript_summary}
          </p>
        </div>
      )}
    </motion.div>
  );
}

interface SmallVideoCardProps {
  video_id: string;
  title: string;
  url: string;
  thumbnail: string;
}

export function SmallVideoCard({ video_id, title, url, thumbnail }: SmallVideoCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-1.5 hover:bg-accent/30 transition-colors"
    >
      <img
        src={thumbnail}
        alt={title}
        className="w-16 h-10 rounded object-cover shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video_id}/default.jpg`;
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-foreground line-clamp-2">{title}</p>
      </div>
      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
    </a>
  );
}
