# Scroll-Scrub Rendering (Apple-style sections)

This is the flagship, highest-effort, highest-risk piece of the system — the mechanic behind product pages like apple.com/iphone, where scrolling scrubs through a video frame-by-frame while captions change in sync.

## The mechanic, precisely

Apple's actual technique (confirmed as the reference mechanic, not guessed):

1. The section's container is **much taller than the viewport** (`heightVh`, e.g. `400vh`) but its visual content is **pinned/sticky** for that entire scroll range — the user's scroll input is repurposed as a scrub timeline instead of moving the page.
2. A single `progress` value (0–1) is derived from how far the user has scrolled through that container.
3. A `<canvas>` element paints one frame from a preloaded frame sequence: `frameIndex = Math.floor(progress * frameCount)`. Canvas is used instead of swapping `<img>`/`<video>` elements because repeated decode/layout on rapid scroll would jank; painting to canvas is the smooth path.
4. Overlaid text/content ("beats") are choreographed against the **same** `progress` value — e.g. a headline visible 0–20% of the way through, fading out 20–30%, a caption entering at 35% and leaving at 55%, and so on.
5. Once `progress` reaches 1, scroll hands back to normal page flow into the next section.

The critical architectural point: **frame index and content-beat visibility are both pure functions of the same single `progress` number.** This is what keeps them perfectly synchronized by construction — there is no separate timer or animation loop to drift out of sync with scroll.

## Data shape

Defined fully in [02-data-model.md](02-data-model.md); repeated here for context:

```jsonc
{
  "id": "s2",
  "type": "scrub_sequence",
  "heightVh": 400,
  "background": {
    "templateAssetId": "ta_1",
    "frameRange": { "start": 0, "end": 79 }
  },
  "beats": [
    { "id": "b1", "progressRange": [0, 0.2], "content": { "type": "headline", "text": "{{coupleNames}}" }, "enter": "fade-up", "exit": "fade-out" },
    { "id": "b2", "progressRange": [0.35, 0.55], "content": { "type": "caption", "text": "{{weddingDateLabel}}" } }
  ]
}
```

- Multiple `scrub_sequence` sections are allowed per page, each with its own independent `progress` scoped to its own container (not a page-wide scroll value) — one hero-style hard cinematic open plus, if the template wants, a story-reveal or venue-reveal section further down the page, up to the cap in [06-performance-and-fallbacks.md](06-performance-and-fallbacks.md).
- `beats[].content.text` supports `{{token}}` interpolation against the website's resolved data (`coupleNames`, `weddingDateLabel`, `venueName`, etc.) — the same values `WeddingWebsiteRenderer.tsx` computes today, relocated into data.

## Rendering implementation sketch

```tsx
function ScrubSequenceSection({ section, websiteData }: { section: ScrubSequenceBlock; websiteData: ResolvedWebsiteData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frames = useFrameSequence(section.background.templateAssetId, section.background.frameRange);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const frameIndex = Math.floor(progress * (frames.length - 1));
    paintFrame(canvasRef.current, frames[frameIndex]);
  });

  return (
    <div ref={containerRef} style={{ height: `${section.heightVh}vh` }}>
      <div style={{ position: "sticky", top: 0, height: "100vh" }}>
        <canvas ref={canvasRef} />
        {section.beats.map((beat) => (
          <Beat key={beat.id} beat={beat} progress={scrollYProgress} websiteData={websiteData} />
        ))}
      </div>
    </div>
  );
}
```

`Beat` computes its own visibility/opacity as a derived value from the shared `progress` motion value (e.g. via `useTransform`), entering/exiting per its `enter`/`exit` animation preset within its `progressRange`.

## Where the frames come from

Admin uploads one video per `scrub_sequence` section during template authoring (never per end-user — see [01-overview.md](01-overview.md)). A background job extracts and processes it into a `TemplateAsset` (kind `FRAME_SEQUENCE`) — see [backend/03-jobs-and-workers.md](../backend/03-jobs-and-workers.md) for the ffmpeg pipeline details, and [06-performance-and-fallbacks.md](06-performance-and-fallbacks.md) for the frame-count/asset caps enforced at save time.

## Fallback behavior

`prefers-reduced-motion`, slow connections, and low-power devices must not get the full scrub experience — see [06-performance-and-fallbacks.md](06-performance-and-fallbacks.md) for the exact fallback rendering (static poster frame + stacked beat list).
