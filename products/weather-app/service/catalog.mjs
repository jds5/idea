export const places = [
  { id: 'london', name: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { id: 'edinburgh', name: 'Edinburgh', country: 'UK', latitude: 55.9533, longitude: -3.1883, timezone: 'Europe/London' },
  { id: 'paris', name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', latitude: 52.52, longitude: 13.405, timezone: 'Europe/Berlin' },
  { id: 'new-york', name: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
  { id: 'san-francisco', name: 'San Francisco', country: 'USA', latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles' }
];
export const profiles = {
  leisure: { label: 'Outdoor leisure', minTemp: 10, maxTemp: 28, rain: 0.2, wind: 20, gust: 30 },
  cycling: { label: 'Leisure cycling', minTemp: 8, maxTemp: 26, rain: 0.2, wind: 15, gust: 25 }
};
export const sources = [
  { id: 'gfs_global', name: 'NOAA GFS', family: 'gfs', credit: 'NOAA / Open-Meteo', url: 'https://www.emc.ncep.noaa.gov/emc/pages/numerical_forecast_systems/gfs.php' },
  { id: 'icon_global', name: 'DWD ICON', family: 'icon', credit: 'DWD / Open-Meteo', url: 'https://www.dwd.de/EN/ourservices/opendata/opendata.html' }
];
export const RULE_VERSION = 'window-v1';
export const TRANSFORM_VERSION = 'om-interval-v1';
export const CACHE_MAX_AGE = 6 * 3600;
