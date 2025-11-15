"use client";

import * as React from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ className, width = 40, height = 40, ...props }, ref) => {
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Prevent hydration mismatch by only rendering after mount
    React.useEffect(() => {
      setMounted(true);
    }, []);

    // Determine which logo to use
    const currentTheme = resolvedTheme || theme || "dark";
    const logoSrc = currentTheme === "light" ? "/logo-light.png" : "/logo-dark.png";

    if (!mounted) {
      // Return a placeholder with the same dimensions during SSR
      return (
        <div
          ref={ref}
          className={cn("flex items-center justify-center", className)}
          style={{ width, height }}
          {...props}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center relative", className)}
        style={!className?.match(/\b(w-|h-|size-)/) ? { width, height } : undefined}
        {...props}
      >
        <Image
          src={logoSrc}
          alt="BAGMAN Logo"
          width={width}
          height={height}
          className="object-contain w-full h-full"
          priority
        />
      </div>
    );
  }
);

Logo.displayName = "Logo";

export default Logo;

