// Global data
let allShows = [];
let currentEpisodes = [];
const episodesCache = {};

/**
 * Run when the page finishes loading
 */
window.onload = () => {
  setup();
};

/**
 * Initial setup
 */
async function setup() {
  const searchInput = document.getElementById("search-input");
  const searchCount = document.getElementById("search-count");
  const episodeSelect = document.getElementById("episode-select");
  const showSelect = document.getElementById("show-select");

  // load all shows into dropdown
  await loadShows();

  // SEARCH
  searchInput.addEventListener("input", () => {
    renderFilteredEpisodes();
  });

  // EPISODE DROPDOWN
  episodeSelect.addEventListener("change", () => {
    renderFilteredEpisodes();
  });

  // SHOW DROPDOWN
  showSelect.addEventListener("change", async (event) => {
    const showId = event.target.value;

    if (showId === "") {
      currentEpisodes = [];
      clearEpisodeSelect();
      makePageForEpisodes([]);
      searchCount.textContent = "Select a show";
      return;
    }

    await loadEpisodes(showId);
  });
}

/**
 * Fetch all shows only once
 */
async function loadShows() {
  try {
    const response = await fetch("https://api.tvmaze.com/shows");

    if (!response.ok) {
      throw new Error("Could not load shows");
    }

    allShows = await response.json();

    // alphabetical order
    allShows.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    populateShowSelect(allShows);

    document.getElementById("search-count").textContent =
      "Select a show";
  } catch (error) {
    document.getElementById("search-count").textContent =
      "Error loading shows";
    console.error(error);
  }
}

/**
 * Fill show dropdown
 */
function populateShowSelect(shows) {
  const showSelect = document.getElementById("show-select");

  showSelect.innerHTML = `<option value="">Select a show</option>`;

  shows.forEach((show) => {
    const option = document.createElement("option");
    option.value = show.id;
    option.textContent = show.name;
    showSelect.appendChild(option);
  });
}

/**
 * Fetch episodes for one show
 */
async function loadEpisodes(showId) {
  const searchCount = document.getElementById("search-count");

  try {
    // use cache if already loaded
    if (episodesCache[showId]) {
      currentEpisodes = episodesCache[showId];
      updateUI();
      return;
    }

    searchCount.textContent = "Loading episodes...";

    const response = await fetch(
      `https://api.tvmaze.com/shows/${showId}/episodes`
    );

    if (!response.ok) {
      throw new Error("Could not load episodes");
    }

    const episodes = await response.json();

    episodesCache[showId] = episodes;
    currentEpisodes = episodes;

    updateUI();
  } catch (error) {
    searchCount.textContent = "Error loading episodes";
    console.error(error);
  }
}

/**
 * Update page after loading episodes
 */
function updateUI() {
  clearEpisodeSelect();
  populateSelect(currentEpisodes);
  renderFilteredEpisodes();
}

/**
 * Render search + episode filtering together
 */
function renderFilteredEpisodes() {
  const searchInput = document.getElementById("search-input");
  const episodeSelect = document.getElementById("episode-select");
  const searchCount = document.getElementById("search-count");

  const searchTerm = searchInput.value.toLowerCase();
  const selectedId = episodeSelect.value;

  let filteredEpisodes = currentEpisodes.filter((episode) => {
    const name = episode.name || "";
    const summary = episode.summary || "";

    return (
      name.toLowerCase().includes(searchTerm) ||
      summary.toLowerCase().includes(searchTerm)
    );
  });

  if (selectedId !== "") {
    filteredEpisodes = filteredEpisodes.filter(
      (episode) => episode.id.toString() === selectedId
    );
  }

  makePageForEpisodes(filteredEpisodes);

  searchCount.textContent =
    `Displaying ${filteredEpisodes.length}/${currentEpisodes.length} episodes`;
}

/**
 * Reset episode dropdown
 */
function clearEpisodeSelect() {
  const select = document.getElementById("episode-select");
  select.innerHTML = `<option value="">All episodes</option>`;
}

/**
 * Fill episode dropdown
 */
function populateSelect(episodeList) {
  const select = document.getElementById("episode-select");

  episodeList.forEach((episode) => {
    const option = document.createElement("option");
    option.value = episode.id;
    option.textContent =
      `${formatEpisodeCode(episode.season, episode.number)} - ${episode.name}`;

    select.appendChild(option);
  });
}

/**
 * Format S01E01
 */
function formatEpisodeCode(season, episode) {
  const paddedSeason = String(season).padStart(2, "0");
  const paddedEpisode = String(episode).padStart(2, "0");
  return `S${paddedSeason}E${paddedEpisode}`;
}

/**
 * Create one episode card
 */
function createEpisodeCard(episode) {
  const article = document.createElement("article");
  article.className = "episode-card";

  const title = document.createElement("h2");
  title.textContent = episode.name;
  article.appendChild(title);

  const code = document.createElement("p");
  code.className = "episode-code";
  code.textContent = formatEpisodeCode(
    episode.season,
    episode.number
  );
  article.appendChild(code);

  const imageContainer = document.createElement("div");
  imageContainer.className = "episode-image";

  if (episode.image && (episode.image.medium || episode.image.original)) {
    const img = document.createElement("img");
    img.src = episode.image.medium || episode.image.original;
    img.alt = episode.name;
    imageContainer.appendChild(img);
  } else {
    const noImg = document.createElement("div");
    noImg.className = "no-image";
    noImg.textContent = "No image available";
    imageContainer.appendChild(noImg);
  }

  article.appendChild(imageContainer);

  const summary = document.createElement("div");
  summary.className = "episode-summary";
  summary.innerHTML = episode.summary || "<p>No summary available.</p>";
  article.appendChild(summary);

  return article;
}

/**
 * Render all episode cards
 */
function makePageForEpisodes(episodeList) {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = "";

  const container = document.createElement("div");
  container.className = "episodes-container";

  if (episodeList.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No episodes found.";
    rootElem.appendChild(message);
    return;
  }

  episodeList.forEach((episode) => {
    container.appendChild(createEpisodeCard(episode));
  });

  rootElem.appendChild(container);
}