// ---------- Global state & cache ----------
let allShows = [];
let episodesCache = {};
let currentShow = null;
let currentEpisodes = [];

// DOM elements
const showsView = document.getElementById("shows-view");
const episodesView = document.getElementById("episodes-view");
const showsContainer = document.getElementById("shows-container");
const episodesContainer = document.getElementById("episodes-container");
const showSearchInput = document.getElementById("show-search-input");
const episodeSearchInput = document.getElementById("episode-search-input");
const episodeSelect = document.getElementById("episode-select");
const searchCountSpan = document.getElementById("search-count");
const backButton = document.getElementById("back-to-shows-btn");

// ---------- Helper functions ----------
function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function formatEpisodeCode(season, number) {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(2, "0")}`;
}

function updateCounter(displayedCount, totalCount) {
  searchCountSpan.textContent = `Displaying ${displayedCount}/${totalCount} episodes`;
}

// Get the best available image (original > medium > none)
function getImageUrl(imageObj) {
  if (!imageObj) return null;
  return imageObj.original || imageObj.medium || null;
}

// ---------- Episode rendering ----------
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

  const imgUrl = getImageUrl(episode.image);
  if (imgUrl) {
    const img = document.createElement("img");
    img.src = imgUrl;
    img.alt = episode.name;
    imageContainer.appendChild(img);
  } else {
    const noImg = document.createElement("div");
    noImg.className = "no-image";
    noImg.textContent = "No image available";
    imageContainer.appendChild(noImg);
  }

  const summary = document.createElement("div");
  summary.className = "episode-summary";
  summary.innerHTML = episode.summary || "<p>No summary available.</p>";

  article.append(title, code, imageContainer, summary);
  return article;
}

function renderEpisodes(episodeList) {
  episodesContainer.innerHTML = "";
  if (!episodeList.length) {
    episodesContainer.innerHTML = "<p class='loading-message'>No episodes found.</p>";
    return;
  }
  episodeList.forEach(ep => episodesContainer.appendChild(createEpisodeCard(ep)));
}

function populateEpisodeDropdown(episodes) {
  episodeSelect.innerHTML = '<option value="">All episodes</option>';
  episodes.forEach(ep => {
    const option = document.createElement("option");
    option.value = ep.id;
    option.textContent = `${formatEpisodeCode(ep.season, ep.number)} - ${ep.name}`;
    episodeSelect.appendChild(option);
  });
}

function filterAndRenderEpisodes() {
  if (!currentEpisodes.length) return;

  const searchTerm = episodeSearchInput.value.toLowerCase();
  const selectedEpisodeId = episodeSelect.value;

  let filtered = currentEpisodes;

  if (searchTerm) {
    filtered = filtered.filter(ep =>
      ep.name.toLowerCase().includes(searchTerm) ||
      stripHtml(ep.summary).toLowerCase().includes(searchTerm)
    );
  }

  if (selectedEpisodeId !== "") {
    filtered = filtered.filter(ep => ep.id == selectedEpisodeId);
  }

  renderEpisodes(filtered);
  updateCounter(filtered.length, currentEpisodes.length);
}

// ---------- Show listing rendering ----------
function createShowCard(show) {
  const card = document.createElement("article");
  card.className = "show-card";

  // Image container
  const imgContainer = document.createElement("div");
  imgContainer.className = "show-image";

  const imgUrl = getImageUrl(show.image);
  if (imgUrl) {
    const img = document.createElement("img");
    img.src = imgUrl;
    img.alt = show.name;
    imgContainer.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "no-image";
    placeholder.textContent = "No image";
    imgContainer.appendChild(placeholder);
  }

  // Info block
  const infoDiv = document.createElement("div");
  infoDiv.className = "show-info";

  const title = document.createElement("h3");
  title.className = "show-title";
  title.textContent = show.name;
  title.addEventListener("click", () => loadEpisodesForShow(show));

  const summary = document.createElement("div");
  summary.className = "show-summary";
  summary.innerHTML = show.summary ? stripHtml(show.summary).substring(0, 150) + "…" : "No summary";

  const details = document.createElement("div");
  details.className = "show-details";
  details.innerHTML = `
    <span>⭐ ${show.rating?.average || "?"}</span>
    <span>🎭 ${show.genres?.join(", ") || "N/A"}</span>
    <span>📺 ${show.status || "Unknown"}</span>
    <span>⏱️ ${show.runtime || "?"} min</span>
  `;

  infoDiv.append(title, summary, details);
  card.append(imgContainer, infoDiv);
  return card;
}

function renderShows(showsToRender) {
  showsContainer.innerHTML = "";
  if (!showsToRender.length) {
    showsContainer.innerHTML = "<p class='loading-message'>No shows match your search.</p>";
    return;
  }
  showsToRender.forEach(show => showsContainer.appendChild(createShowCard(show)));
}

function filterShows(searchTerm) {
  if (!searchTerm) return allShows;
  const lowerTerm = searchTerm.toLowerCase();
  return allShows.filter(show =>
    show.name.toLowerCase().includes(lowerTerm) ||
    (show.summary && stripHtml(show.summary).toLowerCase().includes(lowerTerm)) ||
    (show.genres && show.genres.some(g => g.toLowerCase().includes(lowerTerm)))
  );
}

// ---------- Episode loading & view switching ----------
async function loadEpisodesForShow(show) {
  episodesContainer.innerHTML = "<div class='loading-message'>Loading episodes...</div>";
  currentShow = show;

  if (episodesCache[show.id]) {
    currentEpisodes = episodesCache[show.id];
    afterEpisodesLoaded();
    return;
  }

  try {
    const response = await fetch(`https://api.tvmaze.com/shows/${show.id}/episodes`);
    if (!response.ok) throw new Error("Failed to fetch episodes");
    const episodes = await response.json();
    episodesCache[show.id] = episodes;
    currentEpisodes = episodes;
    afterEpisodesLoaded();
  } catch (err) {
    episodesContainer.innerHTML = `<div class="error-message">Failed to load episodes: ${err.message}</div>`;
  }
}

function afterEpisodesLoaded() {
  episodeSearchInput.value = "";
  episodeSelect.value = "";

  populateEpisodeDropdown(currentEpisodes);
  renderEpisodes(currentEpisodes);
  updateCounter(currentEpisodes.length, currentEpisodes.length);

  showsView.style.display = "none";
  episodesView.style.display = "block";
}

function switchToShowsView() {
  showsView.style.display = "block";
  episodesView.style.display = "none";
  const searchTerm = showSearchInput.value;
  renderShows(filterShows(searchTerm));
}

// ---------- Event binding ----------
function bindEvents() {
  showSearchInput.addEventListener("input", (e) => {
    renderShows(filterShows(e.target.value));
  });

  episodeSearchInput.addEventListener("input", filterAndRenderEpisodes);
  episodeSelect.addEventListener("change", filterAndRenderEpisodes);

  backButton.addEventListener("click", switchToShowsView);
}

// ---------- Initialisation ----------
async function setup() {
  try {
    const response = await fetch("https://api.tvmaze.com/shows");
    if (!response.ok) throw new Error("Failed to fetch shows");
    allShows = await response.json();
    allShows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    renderShows(allShows);
    bindEvents();

    showsView.style.display = "block";
    episodesView.style.display = "none";
  } catch (err) {
    showsContainer.innerHTML = `<div class="error-message">Error loading shows: ${err.message}</div>`;
  }
}

window.onload = setup;
