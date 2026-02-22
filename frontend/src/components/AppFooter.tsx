import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import tboLogo from "@/assets/tbo-logo.png";

export default function AppFooter() {
  return (
    <footer className="bg-background text-foreground border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="py-12 md:py-16 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
          {/* Brand + description */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <img src={tboLogo} alt="TBO AI Compass" className="h-10 md:h-12" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              AI-powered trip planning for travel agents. Create, customize, and share beautiful itineraries with your
              clients.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-base font-semibold tracking-tight">Quick Links</h4>
            <nav className="flex flex-col gap-2 text-sm">
              {["/", "/discover", "/experiences", "/my-trips"].map((path) => {
                const labels = {
                  "/": "Home",
                  "/discover": "Discover",
                  "/experiences": "Experiences",
                  "/my-trips": "My Trips",
                };
                return (
                  <Link
                    key={path}
                    to={path}
                    className={cn(
                      "text-muted-foreground hover:text-foreground transition-colors",
                      "inline-block py-0.5",
                    )}
                  >
                    {labels[path as keyof typeof labels]}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Copyright bar */}
        <div className="border-t border-border/60 pt-6 pb-8 text-center text-xs text-muted-foreground/80">
          © {new Date().getFullYear()} TBO AI Compass. All rights reserved. | Built with ♥️ by{" "}
          <span className="text-[#0052CC]">Scoops</span> <span className="text-[#FF7A00]">Ahoy</span>
        </div>
      </div>
    </footer>
  );
}
