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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="px-6 py-6"
    >
      {label && (
        <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-4">
          {label}
        </p>
      )}

      <a
        href={video.url}
        target="_blank"
        rel="noreferrer"
        className="group block rounded-2xl border border-border/40 bg-white/70 backdrop-blur-md shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
      >
        <div className="flex gap-6 p-5">
          {/* Thumbnail */}
          <div className="relative w-[200px] aspect-video rounded-xl overflow-hidden shrink-0">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
                <Play className="h-5 w-5 text-red-600 ml-0.5" fill="currentColor" />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col justify-between flex-1 min-w-0">
            <div>
              <p className="text-lg font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {video.title}
              </p>

              {video.channel && (
                <p className="text-sm text-muted-foreground mt-1">
                  {video.channel}
                </p>
              )}

              {video.transcript_summary && (
                <p className="text-sm text-muted-foreground/80 mt-3 leading-relaxed line-clamp-3">
                  {video.transcript_summary}
                </p>
              )}
            </div>

            <div className="mt-4">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-primary px-4 py-2 rounded-full shadow-sm group-hover:shadow-md transition">
                <Play className="h-3.5 w-3.5" fill="currentColor" />
                Watch Video
              </span>
            </div>
          </div>
        </div>
      </a>
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
      className="group flex items-center gap-4 rounded-2xl border border-border/40 bg-white/60 backdrop-blur-sm p-3 hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className="relative w-20 aspect-video rounded-lg overflow-hidden shrink-0">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://img.youtube.com/vi/${video_id}/default.jpg`;
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {title}
        </p>
      </div>

      <ExternalLink className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
    </a>
  );
}

