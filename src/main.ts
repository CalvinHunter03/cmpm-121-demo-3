import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

import "./leafletWorkaround.ts";

const app = document.querySelector<HTMLDivElement>("#app");
const controlPanelDiv = document.createElement("div");
app?.append(controlPanelDiv);

const sensorButton = document.createElement("button");
sensorButton.innerHTML = "🌐";
controlPanelDiv.append(sensorButton);

const northButton = document.createElement("button");
northButton.innerHTML = "⬆️";
controlPanelDiv.append(northButton);

const southButton = document.createElement("button");
southButton.innerHTML = "⬇️";
controlPanelDiv.append(southButton);

const westButton = document.createElement("button");
westButton.innerHTML = "⬅️";
controlPanelDiv.append(westButton);

const eastButton = document.createElement("button");
eastButton.innerHTML = "➡️";
controlPanelDiv.append(eastButton);

const resetButton = document.createElement("button");
resetButton.innerHTML = "🚮";
controlPanelDiv.append(resetButton);

const statusPanelDiv = document.createElement("div");
app?.append(statusPanelDiv);

const OAKES_CLASSROOM = [36.98949379578401, -122.06277128548504];
const INITIAL_LAT = 36.98949379578401;
const INITIAL_LNG = -122.06277128548504;
const GRID_SIZE = 0.0001;
const CACHE_RADIUS = 8;
const CACHE_DESNITY = 0.1;
const COIN_COUNT = 5;

let playerPosition = { lat: INITIAL_LAT, lng: INITIAL_LNG };
let collectedCoins = 0;

const map = leaflet.map("map").setView(OAKES_CLASSROOM, 19);

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

interface Cache {
  id: string;
  position: { lat: number; lng: number };
  coins: number;
}

const caches: Cache[] = [];

function generateCaches() {
  for (let latOffset = -CACHE_RADIUS; latOffset <= CACHE_RADIUS; latOffset++) {
    for (
      let lngOffset = -CACHE_RADIUS;
      lngOffset <= CACHE_RADIUS;
      lngOffset++
    ) {
      if (Math.random() < CACHE_DESNITY) {
        const cacheLat = playerPosition.lat + latOffset * GRID_SIZE;
        const cacheLng = playerPosition.lng + lngOffset * GRID_SIZE;
        const cache = {
          id: `${cacheLat.toFixed(6)},${cacheLng.toFixed(6)}`,
          position: { lat: cacheLat, lng: cacheLng },
          coins: COIN_COUNT,
        };
        caches.push(cache);
        addCacheMarker(cache);
      }
    }
  }
}

function addCacheMarker(cache: Cache) {
  const marker = leaflet
    .marker([cache.position.lat, cache.position.lng])
    .addTo(map);

  marker.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
    <div>There is a cache here at ${cache.position.lat}, ${cache.position.lng} <br>Coins: ${cache.coins}</div><br>
    <button id="collectCoins">Collect Coins</button>
    <button id="depositCoins">Deposit Coins</button>`;

    popupDiv
      .querySelector<HTMLButtonElement>("#collectCoins")!
      .addEventListener("click", () => {
        collectedCoins += cache.coins;
        cache.coins = 0;
        popupDiv.innerHTML = `
    <div>There is a cache here at ${cache.position.lat}, ${cache.position.lng} <br>Coins: ${cache.coins}</div><br>
    <button id="collectCoins">Collect Coins</button>
    <button id="depositCoins">Deposit Coins</button>`;
        updateStatusPanel();
      });

    popupDiv
      .querySelector<HTMLButtonElement>("#depositCoins")!
      .addEventListener("click", () => {
        cache.coins += collectedCoins;
        collectedCoins = 0;

        popupDiv.innerHTML = `
    <div>There is a cache here at ${cache.position.lat}, ${cache.position.lng} <br>Coins: ${cache.coins}</div><br>
    <button id="collectCoins">Collect Coins</button>
    <button id="depositCoins">Deposit Coins</button>`;

        updateStatusPanel();
      });

    return popupDiv;
  });
}

const playerMarker = leaflet
  .marker([playerPosition.lat, playerPosition.lng], {
    title: "Player",
  })
  .addTo(map);

function updatePlayerPosition() {
  playerMarker.setLatLng([playerPosition.lat, playerPosition.lng]);
  map.setView([playerPosition.lat, playerPosition.lng], 19);
}

function updateStatusPanel() {
  statusPanelDiv.innerHTML = `Collected Coins: ${collectedCoins}`;
}

eastButton.addEventListener("click", () => movePlayer(0, GRID_SIZE));
westButton.addEventListener("click", () => movePlayer(0, -GRID_SIZE));
southButton.addEventListener("click", () => movePlayer(-GRID_SIZE, 0));
northButton.addEventListener("click", () => movePlayer(GRID_SIZE, 0));

function movePlayer(latOffset: number, lngOffset: number) {
  playerPosition.lat += latOffset;
  playerPosition.lng += lngOffset;
  updatePlayerPosition();
  //generateCaches();
}

resetButton.addEventListener("click", () => {
  playerPosition = { lat: INITIAL_LAT, lng: INITIAL_LNG };
  collectedCoins = 0;
  updatePlayerPosition();
  updateStatusPanel();
});

generateCaches();
updateStatusPanel();
