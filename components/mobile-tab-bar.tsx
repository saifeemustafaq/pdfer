"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  getMobileNavActiveIndex,
  MOBILE_NAV_ITEMS,
} from "@/lib/mobile-nav";

const SCROLL_HINT_STORAGE_KEY = "pdfer.mobile-nav-scroll-hint";

export function MobileTabBar() {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setFadeLeft(scrollLeft > 4);
    setFadeRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  const dismissHint = useCallback(() => {
    setShowHint((visible) => {
      if (!visible) return visible;
      try {
        localStorage.setItem(SCROLL_HINT_STORAGE_KEY, "1");
      } catch {
        // ignore storage failures
      }
      return false;
    });
  }, []);

  const scrollActiveTabIntoView = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const index = getMobileNavActiveIndex(pathname);
      tabRefs.current[index]?.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior,
      });
      requestAnimationFrame(updateFades);
    },
    [pathname, updateFades]
  );

  useEffect(() => {
    updateFades();
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(updateFades);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateFades]);

  const isFirstScrollRef = useRef(true);

  useEffect(() => {
    scrollActiveTabIntoView(isFirstScrollRef.current ? "instant" : "smooth");
    isFirstScrollRef.current = false;
  }, [scrollActiveTabIntoView]);

  useEffect(() => {
    let hintSeen = false;
    try {
      hintSeen = !!localStorage.getItem(SCROLL_HINT_STORAGE_KEY);
    } catch {
      return;
    }
    if (hintSeen) return;

    const frame = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el || el.scrollWidth <= el.clientWidth + 4) return;
      setShowHint(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!showHint) return;
    const timer = window.setTimeout(dismissHint, 4500);
    return () => window.clearTimeout(timer);
  }, [showHint, dismissHint]);

  function handleScroll() {
    updateFades();
    dismissHint();
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm"
      aria-label="Main navigation"
    >
      {showHint && (
        <p
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-popover px-3 py-1 text-[10px] font-medium text-muted-foreground shadow-sm"
          role="status"
        >
          Swipe for more tools
        </p>
      )}

      <div className="relative">
        <div
          aria-hidden
          className={cn(
            "mobile-tab-bar-edge-fade mobile-tab-bar-edge-fade--left",
            fadeLeft && "is-visible"
          )}
        />
        <div
          aria-hidden
          className={cn(
            "mobile-tab-bar-edge-fade mobile-tab-bar-edge-fade--right",
            fadeRight && "is-visible"
          )}
        />

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="mobile-tab-bar-scroll flex items-stretch gap-0.5 overflow-x-auto overscroll-x-contain pl-2 pr-0 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
        >
          {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon, match }, index) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                href={href}
                onClick={dismissHint}
                className={cn(
                  "flex min-w-[4.25rem] shrink-0 snap-center flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium leading-tight transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="max-w-[4.5rem] truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
