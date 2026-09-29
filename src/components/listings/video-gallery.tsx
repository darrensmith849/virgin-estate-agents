type ListingVideo = {
  id: string;
  url: string;
  title: string | null;
  /** A still shown until it plays; without one, the first frame is shown. */
  posterUrl?: string | null;
};

export function VideoGallery({ videos, title }: { videos: ListingVideo[]; title: string }) {
  if (videos.length === 0) return null;

  return (
    <section className="mt-10" aria-labelledby="listing-videos-heading">
      <h2 id="listing-videos-heading" className="text-2xl">
        {videos.length > 1 ? "Videos" : "Video"}
      </h2>
      {/* A single video takes the full width; two or more sit side by side. */}
      <div className={`mt-4 grid gap-3 ${videos.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {videos.map((video, index) => (
          <figure key={video.id} className="overflow-hidden rounded-xl bg-black">
            <video
              controls
              preload={video.posterUrl ? "none" : "metadata"}
              poster={video.posterUrl ?? undefined}
              className="aspect-video w-full object-contain"
              aria-label={video.title ?? `${title} video ${index + 1}`}
            >
              <source src={video.url} />
              Your browser does not support embedded video. <a href={video.url}>Open the video</a>.
            </video>
            {video.title && (
              <figcaption className="truncate px-3 py-2 text-sm text-white/80">
                {video.title}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
