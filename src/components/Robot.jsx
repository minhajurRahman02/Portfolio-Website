/* Hand-built animated SVG robots. The original brief wanted animated GIFs
   here; these are drawn and animated in the stylesheet instead, so they stay
   a few hundred bytes, pick up the theme, and can be swapped for real artwork
   later without touching anything else. */

export function BuildBot() {
  return (
    <div className="bot bot-build" aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <g className="bot-body">
          <rect className="bshell" x="34" y="48" width="42" height="38" rx="11" />
          <rect className="bshell" x="38" y="22" width="34" height="27" rx="10" />
          <path className="bline" d="M55 22v-7" />
          <circle className="btip" cx="55" cy="12" r="3.6" />
          <circle className="beye" cx="48" cy="35" r="4.1" />
          <circle className="beye" cx="63" cy="35" r="4.1" />
          <rect className="bshell" x="40" y="86" width="12" height="12" rx="4" />
          <rect className="bshell" x="59" y="86" width="12" height="12" rx="4" />
          <rect className="bdetail" x="43" y="58" width="24" height="4" rx="2" />
          <rect className="bdetail" x="43" y="66" width="15" height="4" rx="2" />
        </g>
        <g className="bot-arm">
          <rect className="bshell" x="72" y="52" width="9" height="22" rx="4.5" />
          <g className="hammer">
            <rect className="bhandle" x="76" y="30" width="5" height="26" rx="2.5" />
            <rect className="bhead" x="68" y="22" width="22" height="11" rx="3" />
          </g>
        </g>
        <g className="sparks">
          <path d="M92 74l6-6M96 80l8-3M90 84l5 6M84 86l1 8" />
        </g>
        <ellipse className="bglow" cx="60" cy="100" rx="30" ry="5" />
      </svg>
    </div>
  );
}

export function StudyBot() {
  return (
    <div className="bot bot-study" aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <g className="bot-body study">
          <rect className="bshell" x="34" y="50" width="42" height="34" rx="11" />
          <g className="bot-head">
            <rect className="bshell" x="38" y="24" width="34" height="27" rx="10" />
            <path className="bline" d="M55 24v-7" />
            <circle className="btip" cx="55" cy="14" r="3.4" />
            <circle className="beye" cx="48" cy="37" r="4.1" />
            <circle className="beye" cx="63" cy="37" r="4.1" />
          </g>
          <rect className="bdetail" x="43" y="60" width="24" height="4" rx="2" />
        </g>
        <g className="bot-book">
          <path
            className="bpage"
            d="M30 86c10-6 20-6 30 0 10-6 20-6 30 0v14c-10-6-20-6-30 0-10-6-20-6-30 0z"
          />
          <path className="bspine" d="M60 86v14" />
          <path className="bpage line" d="M36 90h18M66 90h18M36 95h14M66 95h14" />
        </g>
        <ellipse className="bglow" cx="60" cy="104" rx="32" ry="5" />
      </svg>
    </div>
  );
}
