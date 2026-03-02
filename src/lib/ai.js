console.log("KEY:", import.meta.env.VITE_GROQ_API_KEY?.slice(0, 10));
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

function buildPrompt(drops) {
  if (!drops || drops.length === 0) {
    return `You are analyzing a location on a music drop app where users pin songs to real-world places.
This location has no drops yet.

Return ONLY this exact JSON, no other text:
{
  "mode": "empty",
  "headline": "No sound here yet.",
  "body": "Be the first to define this place. Whatever you drop becomes its first memory.",
  "recommendation": null
}`;
  }

  const formatted = drops.map((d, i) => {
    const date = d.timestamp?.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
    const hour = date.getHours();
    const timeLabel = hour < 6 ? "late night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : hour < 22 ? "evening" : "night";
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${i + 1}. "${d.trackName}" by ${d.artistName} (${d.genre || "Unknown"}) — dropped on a ${day} ${timeLabel}`;
  }).join("\n");

  return `You are analyzing the music drop history of a specific real-world location on an app where users pin songs to places they visit.

Here are the ${drops.length} song(s) dropped at this location:
${formatted}

Your job:
1. Determine if these drops share a consistent sonic identity (similar genre, energy, or time pattern) OR if they are fragmented/mixed with no clear pattern.
2. Based on that, return one of two modes: "consistent" or "chaotic".

Rules:
- "consistent" = clear pattern in genre, energy level, or time of day across most drops
- "chaotic" = no clear pattern, very mixed genres or moods
- Be specific — mention actual song names, artists, or patterns you notice
- Keep headline punchy, under 10 words
- Keep body to 2 sentences max
- For recommendation, suggest a real song that either fits the identity (consistent) or could help define one (chaotic)

Return ONLY valid JSON, no markdown, no explanation, no extra text:
{
  "mode": "consistent" | "chaotic",
  "headline": "...",
  "body": "...",
  "recommendation": {
    "song": "...",
    "artist": "...",
    "reason": "one sentence why this fits"
  }
}`;
}

export async function analyzeLocation(drops) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 400,
        messages: [
          { role: "user", content: buildPrompt(drops) }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return parsed;
  } catch (err) {
    console.error("analyzeLocation error:", err);
    return {
      mode: "empty",
      headline: "Couldn't read this place right now.",
      body: "Drop a song and help define its sound.",
      recommendation: null
    };
  }
}