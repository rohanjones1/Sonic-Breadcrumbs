import { useEffect, useState } from "react";
import { analyzeLocation } from "../lib/ai";
import "./LocationAura.css";

function LocationAura({ drops, getCachedAura, setCachedAura }) {
  const [aura, setAura] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const run = async () => {
      const cached = await getCachedAura?.();
      if (cached && !cancelled) {
        setAura(cached);
        setLoading(false);
        return;
      }
      const result = await analyzeLocation(drops);
      if (!cancelled) {
        setAura(result);
        setLoading(false);
        await setCachedAura?.(result);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [drops]);

  if (loading) {
    return (
      <div className="aura-card aura-loading">
        <div className="aura-pulse-row">
          <div className="aura-pulse-dot" />
          <div className="aura-pulse-line long" />
        </div>
        <div className="aura-pulse-line short" />
        <div className="aura-pulse-line medium" />
      </div>
    );
  }

  if (!aura) return null;

  return (
    <div className={`aura-card aura-${aura.mode}`}>
      <div className="aura-top">
        <div className="aura-mode-tag">
          {aura.mode === "consistent" && <><span className="aura-dot consistent" />This place has a sound</>}
          {aura.mode === "chaotic"    && <><span className="aura-dot chaotic" />No identity yet</>}
          {aura.mode === "empty"      && <><span className="aura-dot empty" />Uncharted</>}
        </div>
        <div className="aura-drop-count">
          {drops?.length || 0} {drops?.length === 1 ? "drop" : "drops"}
        </div>
      </div>

      <h3 className="aura-headline">{aura.headline}</h3>
      <p className="aura-body">{aura.body}</p>

      {aura.recommendation && (
        <div className="aura-rec">
          <div className="aura-rec-label">Drop suggestion</div>
          <div className="aura-rec-content">
            <div className="aura-rec-song">
              <span className="aura-rec-track">{aura.recommendation.song}</span>
              <span className="aura-rec-artist">{aura.recommendation.artist}</span>
            </div>
            <p className="aura-rec-reason">{aura.recommendation.reason}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationAura;