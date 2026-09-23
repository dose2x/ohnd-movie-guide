const PROXY_URL = "https://ohnd-movie-proxy.ohndtomatometer.workers.dev";

const els = {
  logo: document.getElementById("logo"),
  query: document.getElementById("query"),
  searchBtn: document.getElementById("searchBtn"),
  status: document.getElementById("status"),
  card: document.getElementById("card"),
  poster: document.getElementById("poster"),
  title: document.getElementById("title"),
  meta: document.getElementById("meta"),
  scores: document.getElementById("scores"),
  plot: document.getElementById("plot"),
  actors: document.getElementById("actors"),
  director: document.getElementById("director"),
};

function setStatus(msg, isError) {
  els.status.textContent = msg || "";
  els.status.classList.toggle("error", !!isError);
}

function ratingClass(value) {
  const num = parseInt(value, 10);
  if (isNaN(num)) return "";
  return num >= 60 ? "fresh" : "rotten";
}

function flagLabel(source, cls) {
  if (cls === "fresh") return "Green flag";
  if (cls === "rotten") return "Red flag";
  return source;
}

// OMDb uses the string "N/A" for missing fields.
const has = (v) => Boolean(v) && v !== "N/A";

// Built with textContent (never innerHTML) so API data can't inject markup.
function flagChip(cls, label, value) {
  const chip = document.createElement("div");
  chip.className = `flag-chip ${cls}`.trim();
  const swatch = document.createElement("span");
  swatch.className = "swatch";
  const src = document.createElement("span");
  src.className = "src";
  src.textContent = label;
  const val = document.createElement("span");
  val.className = "val";
  val.textContent = value;
  chip.append(swatch, src, val);
  return chip;
}

let currentSearch = null;

async function searchMovie() {
  const title = els.query.value.trim();
  if (!title) {
    setStatus("Type a title first.", true);
    return;
  }

  // Cancel any search still in flight so a slow older response can't overwrite this one.
  if (currentSearch) currentSearch.abort();
  currentSearch = new AbortController();

  els.card.classList.remove("visible");
  setStatus("Checking the sheet...");

  try {
    const url = `${PROXY_URL}/?t=${encodeURIComponent(title)}`;
    const res = await fetch(url, { signal: currentSearch.signal });
    // An error page that isn't JSON is treated like any other failed lookup.
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.Response !== "True") {
      setStatus(data.Error || "No entry found for that title.", true);
      return;
    }

    setStatus("");
    els.title.textContent = has(data.Year) ? `${data.Title} (${data.Year})` : data.Title;
    els.meta.textContent = [data.Rated, data.Runtime, data.Genre].filter(has).join(" / ");
    els.poster.hidden = !has(data.Poster);
    if (has(data.Poster)) {
      els.poster.src = data.Poster;
      els.poster.alt = `${data.Title} poster`;
    }
    els.plot.textContent = has(data.Plot) ? data.Plot : "No synopsis on file.";
    els.actors.textContent = has(data.Actors) ? data.Actors : "Not listed.";
    els.director.textContent = has(data.Director) ? data.Director : "Not listed.";

    const ratings = Array.isArray(data.Ratings) ? data.Ratings : [];
    const chips = ratings.map((r) => {
      const isRT = r.Source === "Rotten Tomatoes";
      const cls = isRT ? ratingClass(r.Value) : "neutral";
      return flagChip(cls, isRT ? flagLabel(r.Source, cls) : r.Source, r.Value);
    });
    if (has(data.Metascore) && !ratings.some((r) => r.Source === "Metacritic")) {
      chips.push(flagChip("neutral", "Metascore", data.Metascore));
    }
    els.scores.replaceChildren(...chips);

    els.card.classList.add("visible");
  } catch (err) {
    if (err.name === "AbortError") return; // superseded by a newer search
    setStatus("Couldn't reach the pit wall. Check your connection and try again.", true);
  }
}

// Hide images that fail to load instead of showing a broken-image icon.
els.logo.addEventListener("error", () => els.logo.classList.add("hidden"));
els.poster.addEventListener("error", () => { els.poster.hidden = true; });

els.searchBtn.addEventListener("click", searchMovie);
els.query.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchMovie();
});
