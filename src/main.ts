import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import { UIManager } from "./UIManager";

import "./leafletWorkaround.ts";

const app = document.querySelector<HTMLDivElement>("#app");

const uiManager = new UIManager(app);
uiManager.initializeButtons(movePlayer, resetGame, toggleGeoLocation);

function updateStatusPanel(){
  uiManager.updateStatusPanel(collectedCoins);
}

const _OAKES_CLASSROOM = [36.98949379578401, -122.06277128548504];
const INITIAL_LAT = 36.98949379578401;
const INITIAL_LNG = -122.06277128548504;
const GRID_SIZE = 0.0001;
const CACHE_RADIUS = 8;
const CACHE_DESNITY = 0.1;
const _COIN_COUNT = 5;
const MAX_VISIBLE_CACHES = 30;

let playerPosition = JSON.parse(localStorage.getItem("playerPosition")!) || {
  lat: INITIAL_LAT,
  lng: INITIAL_LNG,
};
let collectedCoins = JSON.parse(localStorage.getItem("collectedCoins")!) || 0;

let movementHistory: { lat: number; lng: number }[] =
  JSON.parse(localStorage.getItem("movementHistory")!) || [];

const map = leaflet
  .map("map")
  .setView([playerPosition.lat, playerPosition.lng], 19);

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

interface Coin {
  id: string;
  origin: Cache;
  serial: number;
}

interface Cache {
  id: string;
  position: { lat: number; lng: number };
  coins: Coin[];

  toMomento(): string;
  fromMomento(momento: string): void;
}

class CacheImpl implements Cache {
  id: string;
  position: { lat: number; lng: number };
  coins: Coin[];

  constructor(
    id: string,
    position: { lat: number; lng: number },
    coins: Coin[] = [],
  ) {
    this.id = id;
    this.position = position;
    this.coins = coins;
  }

  toMomento(): string {
    return JSON.stringify({
      coins: this.coins.map((coin) => ({
        id: coin.id,
        serial: coin.serial,
        originId: coin.origin.id,
      })),
    });
  }

  fromMomento(momento: string): void {
    const data = JSON.parse(momento);
    this.coins = data.coins.map((coin: Coin) => ({
      id: coin.id,
      serial: coin.serial,
      origin: cacheStates[coin.id] || this,
    }));
  }
}

const cacheStates: Record<string, Cache> = {};

function getGlobalCoordinates(lat: number, lng: number) {
  const i = Math.round((lat / GRID_SIZE) * 10000);
  const j = Math.round((lng / GRID_SIZE) * 10000);
  return { i, j };
}

function generateCoinId(cache: Cache, serial: number): string {
  const { i, j } = getGlobalCoordinates(cache.position.lat, cache.position.lng);
  return `${i}:${j}#${serial}`;
}

const visibleCaches: Set<string> = new Set();

function generateCaches() {
  for (let latOffset = -CACHE_RADIUS; latOffset <= CACHE_RADIUS; latOffset++) {
    for (
      let lngOffset = -CACHE_RADIUS;
      lngOffset <= CACHE_RADIUS;
      lngOffset++
    ) {
      const cacheLat = playerPosition.lat + latOffset * GRID_SIZE;
      const cacheLng = playerPosition.lng + lngOffset * GRID_SIZE;
      const { i, j } = getGlobalCoordinates(cacheLat, cacheLng);

      const cacheId = `${i},${j}`;

      if (visibleCaches.size >= MAX_VISIBLE_CACHES) {
        return;
      }

      let cache = cacheStates[cacheId];
      if (!cache) {
        if (Math.random() > CACHE_DESNITY) continue;

        cache = new CacheImpl(cacheId, { lat: cacheLat, lng: cacheLng });

        const numberOfCoins = Math.floor(Math.random() * (_COIN_COUNT + 1));
        for (let serial = 0; serial < numberOfCoins; serial++) {
          const coin: Coin = {
            id: generateCoinId(cache, serial),
            origin: cache,
            serial,
          };
          cache.coins.push(coin);
        }

        cacheStates[cacheId] = cache;
      }

      if (localStorage.getItem(cacheId)) {
        const momento = localStorage.getItem(cacheId);
        cache.fromMomento(momento!);
      }

      if (!visibleCaches.has(cacheId)) {
        addCacheMarker(cache);
        visibleCaches.add(cacheId);
      }
    }
  }
  enforceCacheLimit();
}

function enforceCacheLimit() {
  if (visibleCaches.size <= MAX_VISIBLE_CACHES) return;

  const excessCount = visibleCaches.size - MAX_VISIBLE_CACHES;

  let removedCount = 0;
  visibleCaches.forEach((cacheId) => {
    if (removedCount >= excessCount) return;

    const cache = cacheStates[cacheId];
    map.eachLayer((layer: leaflet.Layer) => {
      if (
        layer instanceof leaflet.Marker &&
        layer.getLatLng().lat === cache.position.lat &&
        layer.getLatLng().lng === cache.position.lng
      ) {
        map.removeLayer(layer);
        visibleCaches.delete(cacheId);
        removedCount++;
      }
    });
  });
}

function clearCaches() {
  const visibleRange: string[] = [];
  visibleCaches.clear();
  for (let latOffset = -CACHE_RADIUS; latOffset <= CACHE_RADIUS; latOffset++) {
    for (
      let lngOffset = -CACHE_RADIUS;
      lngOffset <= CACHE_RADIUS;
      lngOffset++
    ) {
      const cacheLat = playerPosition.lat + latOffset * GRID_SIZE;
      const cacheLng = playerPosition.lng + lngOffset * GRID_SIZE;
      const { i, j } = getGlobalCoordinates(cacheLat, cacheLng);
      visibleRange.push(`${i},${j}`);
    }
  }

  map.eachLayer((layer: leaflet.Layer) => {
    if (layer instanceof leaflet.Marker && layer !== playerMarker) {
      const markerLatLng = layer.getLatLng();
      const { i, j } = getGlobalCoordinates(markerLatLng.lat, markerLatLng.lng);
      const cacheId = `${i},${j}`;

      if (visibleRange.indexOf(cacheId) === -1) {
        map.removeLayer(layer);
      }
    }
  });
}

function addCacheMarker(cache: Cache) {
  const { i, j } = getGlobalCoordinates(cache.position.lat, cache.position.lng);
  const _popupDivText =
    `<div>There is a cache here at ${i}, ${j} <br>Coins: ${cache.coins.length}</div><br>
  <button id="collectCoins">Collect Coins</button>
  <button id="depositCoins">Deposit Coins</button>`;

  const marker = leaflet
    .marker([cache.position.lat, cache.position.lng])
    .addTo(map);

  marker.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML =
      `<div>There is a cache here at ${i}, ${j} <br>Coins: ${cache.coins.length}</div><br>
    <button id="collectCoins">Collect Coins</button>
    <button id="depositCoins">Deposit Coins</button>`;

    popupDiv
      .querySelector<HTMLButtonElement>("#collectCoins")!
      .addEventListener("click", () => {
        collectedCoins += cache.coins.length;
        cache.coins = [];
        popupDiv.innerHTML =
          `<div>There is a cache here at ${i}, ${j} <br>Coins: ${cache.coins.length}</div><br>
        <button id="collectCoins">Collect Coins</button>
        <button id="depositCoins">Deposit Coins</button>`;
        updateStatusPanel();

        localStorage.setItem(cache.id, cache.toMomento());
      });

    popupDiv
      .querySelector<HTMLButtonElement>("#depositCoins")!
      .addEventListener("click", () => {
        const newCoins = Array.from(
          { length: collectedCoins },
          (_, serial) => ({
            id: generateCoinId(cache, serial),
            origin: cache,
            serial,
          }),
        );
        cache.coins.push(...newCoins);
        collectedCoins = 0;

        popupDiv.innerHTML =
          `<div>There is a cache here at ${i}, ${j} <br>Coins: ${cache.coins.length}</div><br>
        <button id="collectCoins">Collect Coins</button>
        <button id="depositCoins">Deposit Coins</button>`;

        updateStatusPanel();
        localStorage.setItem(cache.id, cache.toMomento());
      });

    return popupDiv;
  });
}

const playerMarker = leaflet
  .marker([playerPosition.lat, playerPosition.lng], {
    title: "Player",
  })
  .addTo(map);

const movementPolyline = leaflet
  .polyline(movementHistory, { color: "blue" })
  .addTo(map);

function updatePlayerPosition(lat: number, lng: number) {
  playerPosition = { lat, lng };
  playerMarker.setLatLng([lat, lng]);
  map.setView([lat, lng]);
  movementHistory.push({ lat, lng });
  movementPolyline.setLatLngs(movementHistory);

  localStorage.setItem("playerPosition", JSON.stringify(playerPosition));
  localStorage.setItem("movementHistory", JSON.stringify(movementHistory));
}

function resetGame() {
  if (prompt("Are you sure you want to reset? (yes / no)") === "yes") {
    localStorage.clear();
    playerPosition = { lat: INITIAL_LAT, lng: INITIAL_LNG };
    collectedCoins = 0;
    movementHistory = [];
    movementPolyline.setLatLngs([]);
    updatePlayerPosition(INITIAL_LAT, INITIAL_LNG);
  }
}

function toggleGeolocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(
      (position) => {
        updatePlayerPosition(
          position.coords.latitude,
          position.coords.longitude,
        );
      },
      (error) => {
        console.error("Geolocation error:", error.message);
      },
    );
    generateCaches();
  } else {
    alert("Geolocation is not supported by your browser.");
  }
}



function movePlayer(latOffset: number, lngOffset: number) {
  playerPosition.lat += latOffset;
  playerPosition.lng += lngOffset;

  updatePlayerPosition(playerPosition.lat, playerPosition.lng);
  regenerateCaches();
}

function regenerateCaches() {
  clearCaches();
  generateCaches();
}
generateCaches();
updateStatusPanel();
