let allEpisodes = [];
let allShows = [];
let cachedEpisodes = {};

/**
 * Format episode code (S01E01)
 */
function formatEpisodeCode(season, episode) {
  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

/**
 * Create episode card
 */
function createEpisodeCard(episode) {
  const article = document.createElement("article");
  article.className = "episode-card";

  const title = document.createElement("h2");
  title.textContent = episode.name;

  const code = document.createElement("p");
  code.className = "episode-code";
  code.textContent = formatEpisodeCode(episode.season, episode.number);

  const imageContainer = document.createElement("div");
  imageContainer.className = "episode-image";

  if (episode.image && episode.image.medium) {
    const img = document.createElement("img");
    img.src = episode.image.medium;
    img.alt = episode.name;
    imageContainer.appendChild(img);
  } else {
    imageContainer.textContent = "No image available";
  }

  const summary = document.createElement("div");
  summary.className = "episode-summary";
  summary.textContent = episode.summary
    ? episode.summary.replace(/<[^>]*>/g, "")
    : "No summary available";

  article.append(title, code, imageContainer, summary);
  return article;
}

/**
 * Render episodes
 */
function makePageForEpisodes(list) {
  const root = document.getElementById("root");
  root.innerHTML = "";

  if (list.length === 0) {
    root.textContent = "No episodes found.";
    return;
  }

  const container = document.createElement("div");
  container.className = "episodes-container";

  list.forEach(ep => container.appendChild(createEpisodeCard(ep)));

  root.appendChild(container);
}

/**
 * Populate episode dropdown
 */
function populateSelect(episodes) {
  const select = document.getElementById("episode-select");
  select.innerHTML = `<option value="">All episodes</option>`;

  episodes.forEach(ep => {
    const option = document.createElement("option");
    option.value = ep.id;
    option.textContent = `${formatEpisodeCode(ep.season, ep.number)} - ${ep.name}`;
    select.appendChild(option);
  });
}

/**
 * Update counter
 */
function updateSearchCount(filtered, total) {
  document.getElementById("search-count").textContent =
    `Displaying ${filtered}/${total} episodes`;
}

/**
 * Show error
 */
function showError(msg) {
  document.getElementById("root").innerHTML =
    `<div class="error-message">${msg}</div>`;
}

/**
 * Load shows on start
 */
async function setup() {
  try {
    const res = await fetch("https://api.tvmaze.com/shows");
    allShows = await res.json();

    // Sort A-Z
    allShows.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    populateShowSelect(allShows);

    document.getElementById("search-count").textContent = "Select a show";

  } catch {
    showError("Failed to load shows");
  }
}

/**
 * Fill show dropdown
 */
function populateShowSelect(shows) {
  const select = document.getElementById("show-select");

  shows.forEach(show => {
    const option = document.createElement("option");
    option.value = show.id;
    option.textContent = show.name;
    select.appendChild(option);
  });

  select.addEventListener("change", handleShowChange);
}

/**
 * When show is selected
 */
async function handleShowChange(e) {
  const showId = e.target.value;

  if (!showId) return;

  document.getElementById("root").innerHTML =
    '<div class="loading-message">Loading episodes...</div>';

  // CACHE
  if (cachedEpisodes[showId]) {
    allEpisodes = cachedEpisodes[showId];
    afterLoad();
    return;
  }

  try {
    const res = await fetch(`https://api.tvmaze.com/shows/${showId}/episodes`);
    const data = await res.json();

    cachedEpisodes[showId] = data;
    allEpisodes = data;

    afterLoad();

  } catch {
    showError("Failed to load episodes");
  }
}

/**
 * After episodes load
 */
function afterLoad() {
  makePageForEpisodes(allEpisodes);
  populateSelect(allEpisodes);
  updateSearchCount(allEpisodes.length, allEpisodes.length);

  const searchInput = document.getElementById("search-input");
  const episodeSelect = document.getElementById("episode-select");

  // SEARCH
  searchInput.oninput = (e) => {
    const term = e.target.value.toLowerCase();

    const filtered = allEpisodes.filter(ep =>
      (ep.name || "").toLowerCase().includes(term) ||
      (ep.summary || "").toLowerCase().includes(term)
    );

    makePageForEpisodes(filtered);
    updateSearchCount(filtered.length, allEpisodes.length);
  };

  // EPISODE SELECT
  episodeSelect.onchange = (e) => {
    const id = e.target.value;

    if (!id) {
      makePageForEpisodes(allEpisodes);
    } else {
      const selected = allEpisodes.filter(ep => ep.id == id);
      makePageForEpisodes(selected);
    }

    updateSearchCount(1, allEpisodes.length);
    searchInput.value = "";
  };
}

window.onload = setup;