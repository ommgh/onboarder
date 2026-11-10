"use client";

import { Camera, CameraOff, ImageUp, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Detector = {
  detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "itf"];

function nativeDetector(): Detector | null {
  const BD = (
    globalThis as unknown as {
      BarcodeDetector?: new (o: { formats: string[] }) => Detector;
    }
  ).BarcodeDetector;
  try {
    return BD ? new BD({ formats: FORMATS }) : null;
  } catch {
    return null;
  }
}

/**
 * Continuous camera barcode scanner. Uses the browser's BarcodeDetector when present
 * (Android Chrome: fast, low power) and falls back to zxing elsewhere.
 * Calls onScan for every distinct read; the same code is ignored for `cooldownMs`.
 */
export function BarcodeScanner({
  onScan,
  cooldownMs = 2500,
  className,
}: {
  onScan: (code: string) => void;
  cooldownMs?: number;
  className?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const stopZxing = useRef<(() => void) | null>(null);
  const last = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [state, setState] = useState<
    "idle" | "starting" | "on" | "denied" | "unsupported"
  >("idle");
  const [flash, setFlash] = useState(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const emit = useCallback(
    (code: string) => {
      const now = Date.now();
      if (code === last.current.code && now - last.current.at < cooldownMs)
        return;
      last.current = { code, at: now };
      setFlash(true);
      setTimeout(() => setFlash(false), 250);
      navigator.vibrate?.(60);
      onScanRef.current(code);
    },
    [cooldownMs],
  );

  const stop = useCallback(() => {
    stopZxing.current?.();
    stopZxing.current = null;
    for (const t of stream.current?.getTracks() ?? []) t.stop();
    stream.current = null;
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    setState("starting");
    const native = nativeDetector();
    try {
      if (native) {
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        stream.current = s;
        const v = video.current;
        if (!v) return;
        v.srcObject = s;
        await v.play();
        setState("on");
        let running = true;
        stopZxing.current = () => {
          running = false;
        };
        const tick = async () => {
          if (!running || !video.current) return;
          try {
            const codes = await native.detect(video.current);
            if (codes[0]?.rawValue) emit(codes[0].rawValue);
          } catch {
            /* frame not ready */
          }
          setTimeout(tick, 120);
        };
        tick();
      } else {
        const { BrowserMultiFormatReader } = await import("@zxing/library");
        const reader = new BrowserMultiFormatReader();
        stopZxing.current = () => reader.reset();
        await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          video.current as HTMLVideoElement,
          (result) => {
            if (result) emit(result.getText());
          },
        );
        setState("on");
      }
    } catch (e) {
      setState(
        (e as Error).name === "NotAllowedError" ? "denied" : "unsupported",
      );
    }
  }, [emit]);

  useEffect(() => stop, [stop]);

  const fromFile = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const native = nativeDetector();
    if (native) {
      const codes = await native.detect(bitmap).catch(() => []);
      if (codes[0]) return emit(codes[0].rawValue);
    }
    const { BrowserMultiFormatReader } = await import("@zxing/library");
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    try {
      const r = await new BrowserMultiFormatReader().decodeFromImageElement(
        img,
      );
      emit(r.getText());
    } catch {
      alertNoCode();
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-stone-950 text-stone-100",
        className,
      )}
    >
      <video
        ref={video}
        playsInline
        muted
        className={cn(
          "aspect-[4/3] w-full object-cover sm:aspect-video",
          state !== "on" && "invisible",
        )}
      />
      {state === "on" ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <div
            className={cn(
              "relative h-[45%] w-[72%] rounded-lg border-2 transition-colors",
              flash ? "border-success" : "border-white/70",
            )}
          >
            <div className="absolute inset-x-3 top-0 h-0.5 animate-scan bg-primary shadow-[0_0_12px_2px] shadow-primary/60 [--scan-distance:calc(100%_*_6)]" />
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          {state === "starting" ? (
            <Loader2 className="size-6 animate-spin" />
          ) : state === "denied" ? (
            <>
              <CameraOff className="size-6" />
              <p className="max-w-xs text-sm text-stone-300">
                Camera permission was blocked. Allow camera access in your
                browser settings, or type / upload the barcode below.
              </p>
            </>
          ) : state === "unsupported" ? (
            <>
              <CameraOff className="size-6" />
              <p className="max-w-xs text-sm text-stone-300">
                No camera available here. Use a USB scanner, type the code, or
                upload a photo of it.
              </p>
            </>
          ) : (
            <>
              <p className="max-w-xs text-sm text-stone-300">
                Point your camera at barcodes one after another. Scan the same
                item again to count stock.
              </p>
              <Button onClick={start} size="lg">
                <Camera /> Start camera
              </Button>
            </>
          )}
        </div>
      )}
      <div className="absolute right-2 bottom-2 flex gap-2">
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-black/50 px-2.5 text-xs backdrop-blur hover:bg-black/70">
          <ImageUp className="size-3.5" /> Photo
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) fromFile(f);
              e.target.value = "";
            }}
          />
        </label>
        {state === "on" ? (
          <button
            type="button"
            onClick={stop}
            className="h-8 rounded-md bg-black/50 px-2.5 text-xs backdrop-blur hover:bg-black/70"
          >
            Stop
          </button>
        ) : null}
      </div>
    </div>
  );
}

function alertNoCode() {
  import("sonner").then(({ toast }) =>
    toast.error("No barcode found in that photo. Try a closer, sharper shot."),
  );
}
