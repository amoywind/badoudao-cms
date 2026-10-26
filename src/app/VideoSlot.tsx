/**
 * The video slot — one place that renders a YouTube video, and one
 * place that renders the placeholder when there is not one yet.
 *
 * Every video position on the site goes through this component, so the
 * fallback text is written once and the aspect ratio is decided once.
 *
 * The player is youtube-nocookie rather than youtube.com. The site runs
 * Plausible rather than GA4 specifically to stay out of the European
 * consent-banner requirement, and the ordinary YouTube embed sets
 * tracking cookies before the visitor has agreed to anything. The
 * no-cookie domain does not.
 *
 * The video is not loaded until it is asked for. A YouTube iframe is
 * roughly half a megabyte of script and player, and a buyer who scrolls
 * past a factory clip without pressing play should not have paid for
 * it. The facade is a poster frame with a play button; the iframe is
 * created when the button is pressed.
 */

export type VideoSlotProps = {
  /** The eleven-character YouTube id, or an empty string for no video. */
  youtubeId?: string;
  /** What the slot is waiting for. Shown when there is no video. */
  placeholder?: string;
  /** The caption under the frame. */
  caption?: string;
  /** 16:9 for the wide slots, 9:16 for the vertical factory footage. */
  ratio?: '16:9' | '9:16';
  /** The title of the video, for the accessible name of the button. */
  title?: string;
  className?: string;
};

export function VideoSlot({
  youtubeId = '',
  placeholder = 'Video pending',
  caption = '',
  ratio = '16:9',
  title = '',
  className = ''
}: VideoSlotProps) {
  /* The thumbnail comes from YouTube's own image host at the id. A
     video with no thumbnail — one that was just uploaded and has not
     been processed — falls back to a plain frame rather than a broken
     image, so the layout does not jump when the picture arrives. */
  const thumb = youtubeId
    ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
    : '';

  if (!youtubeId) {
    return (
      <div className={`vslot ${ratio === '9:16' ? 'vslot-16' : ''} ${className}`}>
        <div className="vslot-ico">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
        </div>
        <span className="vslot-t">{placeholder}</span>
        {caption && <span className="vslot-d">{caption}</span>}
      </div>
    );
  }

  return (
    <div className={`vslot vslot-play ${ratio === '9:16' ? 'vslot-16' : ''} ${className}`}>
      <div
        className="vslot-frame"
        style={{
          backgroundImage: thumb ? `url(${thumb})` : undefined
        }}
      >
        {/* The facade. A button rather than the iframe itself, so the
            video is not fetched until somebody asks for it. */}
        <button
          type="button"
          className="vslot-btn"
          aria-label={title ? `Play: ${title}` : 'Play video'}
          data-yt={youtubeId}
        >
          <span className="vslot-play-ico">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      </div>
      {caption && <span className="vslot-d">{caption}</span>}
    </div>
  );
}

/**
 * The client half of the video slot.
 *
 * The facade above is a server component so the markup is in the HTML
 * for a crawler and for a visitor without JavaScript. This part is what
 * swaps the poster frame for the player when the button is pressed.
 *
 * It is a separate component because the page that holds the videos
 * does not otherwise need to be a client component, and turning a
 * server page into a client one to accommodate a play button would
 * ship the whole page's data to the browser.
 */
export function VideoSlotHydrator() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function () {
  var YOUTUBE = 'https://www.youtube-nocookie.com/embed/';

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.vslot-btn') : null;
    if (!btn) return;

    var id = btn.getAttribute('data-yt');
    if (!id) return;

    var frame = btn.parentNode;
    if (!frame) return;

    var iframe = document.createElement('iframe');
    iframe.src = YOUTUBE + id + '?autoplay=1&rel=0&modestbranding=1';
    iframe.title = btn.getAttribute('aria-label') || 'Video';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.setAttribute('loading', 'lazy');

    /* The aspect ratio is held by the frame, so the iframe fills it
       rather than carrying its own dimensions. */
    iframe.style.position = 'absolute';
    iframe.style.inset = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';

    frame.innerHTML = '';
    frame.appendChild(iframe);
    frame.classList.add('vslot-playing');
  });
})();
`
      }}
    />
  );
}
