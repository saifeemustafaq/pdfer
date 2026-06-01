/** Browser only. Read navigator hints for routing decisions. */

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

export type DeviceHints = {
  isMobile: boolean;
  deviceMemoryGb?: number;
};

export function getDeviceHints(): DeviceHints {
  if (typeof navigator === "undefined") {
    return { isMobile: false };
  }

  const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
  const deviceMemoryGb = (navigator as NavigatorWithMemory).deviceMemory;

  return { isMobile, deviceMemoryGb };
}
