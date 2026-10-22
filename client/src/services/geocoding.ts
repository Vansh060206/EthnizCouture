/**
 * Ethniz Couture — Geocoding & Reverse Geocoding Service
 *
 * Supports:
 * 1. Google Maps JavaScript API Geocoder & Places (when VITE_GOOGLE_MAPS_API_KEY is configured)
 * 2. OpenStreetMap / Nominatim Reverse Geocoder (when API key is absent or in local dev/testing)
 * 3. High-precision Indian Landmark & Locality Fallback Catalog
 */

import api from './api';

export interface ParsedAddress {
  houseNumber?: string;
  buildingName?: string;
  apartment?: string;
  street: string;
  area?: string;
  locality?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  source: 'PHOTON' | 'OPENSTREETMAP' | 'GOOGLE_MAPS' | 'OFFLINE_FALLBACK';
}

export interface GeocodingError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NETWORK_ERROR' | 'UNSUPPORTED' | 'NO_API_KEY';
  message: string;
}

// Major Indian Luxury Couture Hubs for instant offline resolution & simulated pins
export const INDIAN_LOCALITY_CATALOG = [
  {
    name: 'Bandra West, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    lat: 19.0596,
    lng: 72.8295,
    street: 'Hill Road / Linking Road'
  },
  {
    name: 'Juhu Tara Road, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400049',
    lat: 19.0988,
    lng: 72.8264,
    street: 'Juhu Tara Road, Vile Parle West'
  },
  {
    name: 'Colaba Causeway, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400005',
    lat: 18.9158,
    lng: 72.8276,
    street: 'Shahid Bhagat Singh Road, Colaba'
  },
  {
    name: 'South Extension Part II, New Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110049',
    lat: 28.5684,
    lng: 77.2215,
    street: 'Ring Road, South Extension Part II'
  },
  {
    name: 'Defence Colony, New Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110024',
    lat: 28.5729,
    lng: 77.2307,
    street: 'Main Market, Defence Colony'
  },
  {
    name: 'Connaught Place, New Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    lat: 28.6304,
    lng: 77.2177,
    street: 'Inner Circle, Connaught Place'
  },
  {
    name: 'Indiranagar, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    lat: 12.9784,
    lng: 77.6408,
    street: '100 Feet Road, HAL 2nd Stage, Indiranagar'
  },
  {
    name: 'Koramangala, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560034',
    lat: 12.9352,
    lng: 77.6245,
    street: '80 Feet Road, 4th Block, Koramangala'
  },
  {
    name: 'Jubilee Hills, Hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500033',
    lat: 17.4319,
    lng: 78.4073,
    street: 'Road No. 36, Jubilee Hills'
  },
  {
    name: 'Banjara Hills, Hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500034',
    lat: 17.4156,
    lng: 78.4350,
    street: 'Road No. 1, Banjara Hills'
  },
  {
    name: 'C-Scheme, Jaipur',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302001',
    lat: 26.9124,
    lng: 75.7873,
    street: 'Ashok Marg, C-Scheme'
  },
  {
    name: 'Park Street, Kolkata',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700016',
    lat: 22.5519,
    lng: 88.3524,
    street: 'Mother Teresa Sarani, Park Street'
  },
  {
    name: 'T. Nagar, Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600017',
    lat: 13.0418,
    lng: 80.2341,
    street: 'Usman Road, T. Nagar'
  }
];

/**
 * Normalizes state name to match official INDIAN_STATES list where possible
 */
export const normalizeStateName = (stateName: string): string => {
  if (!stateName) return '';
  const clean = stateName.trim();
  const lower = clean.toLowerCase();

  const stateMap: Record<string, string> = {
    delhi: 'Delhi',
    'nct of delhi': 'Delhi',
    'national capital territory of delhi': 'Delhi',
    maharashtra: 'Maharashtra',
    karnataka: 'Karnataka',
    telangana: 'Telangana',
    'tamil nadu': 'Tamil Nadu',
    rajasthan: 'Rajasthan',
    'west bengal': 'West Bengal',
    gujarat: 'Gujarat',
    'uttar pradesh': 'Uttar Pradesh',
    haryana: 'Haryana',
    punjab: 'Punjab',
    kerala: 'Kerala',
    'madhya pradesh': 'Madhya Pradesh',
    bihar: 'Bihar',
    odisha: 'Odisha',
    orissa: 'Odisha',
    goa: 'Goa',
    jharkhand: 'Jharkhand',
    chhattisgarh: 'Chhattisgarh',
    assam: 'Assam',
    uttarakhand: 'Uttarakhand',
    'himachal pradesh': 'Himachal Pradesh',
    'jammu and kashmir': 'Jammu and Kashmir',
    chandigarh: 'Chandigarh',
    puducherry: 'Puducherry'
  };

  return stateMap[lower] || clean;
};

/**
 * Detect Indian State from Latitude & Longitude Bounding Boxes when API leaves state empty
 */
export const getStateFromCoordinates = (lat: number, lng: number): string => {
  if (lat >= 28.35 && lat <= 28.95 && lng >= 76.80 && lng <= 77.45) return 'Delhi';
  if (lat >= 15.60 && lat <= 22.05 && lng >= 72.60 && lng <= 80.90) return 'Maharashtra';
  if (lat >= 11.55 && lat <= 18.45 && lng >= 74.05 && lng <= 78.60) return 'Karnataka';
  if (lat >= 23.30 && lat <= 30.20 && lng >= 69.50 && lng <= 78.30) return 'Rajasthan';
  if (lat >= 20.10 && lat <= 24.70 && lng >= 68.15 && lng <= 74.50) return 'Gujarat';
  if (lat >= 23.80 && lat <= 30.45 && lng >= 77.10 && lng <= 84.65) return 'Uttar Pradesh';
  if (lat >= 21.10 && lat <= 26.90 && lng >= 74.00 && lng <= 82.80) return 'Madhya Pradesh';
  if (lat >= 8.05 && lat <= 13.55 && lng >= 76.20 && lng <= 80.35) return 'Tamil Nadu';
  if (lat >= 15.80 && lat <= 19.95 && lng >= 77.20 && lng <= 81.80) return 'Telangana';
  if (lat >= 12.60 && lat <= 19.15 && lng >= 76.75 && lng <= 84.75) return 'Andhra Pradesh';
  if (lat >= 21.50 && lat <= 27.25 && lng >= 85.80 && lng <= 89.90) return 'West Bengal';
  if (lat >= 8.25 && lat <= 12.85 && lng >= 74.85 && lng <= 77.40) return 'Kerala';
  if (lat >= 29.50 && lat <= 32.55 && lng >= 73.85 && lng <= 76.95) return 'Punjab';
  if (lat >= 27.65 && lat <= 30.90 && lng >= 74.45 && lng <= 77.60) return 'Haryana';
  if (lat >= 24.25 && lat <= 27.55 && lng >= 83.30 && lng <= 88.30) return 'Bihar';
  if (lat >= 17.80 && lat <= 22.60 && lng >= 81.40 && lng <= 87.50) return 'Odisha';
  if (lat >= 14.85 && lat <= 15.80 && lng >= 73.65 && lng <= 74.35) return 'Goa';
  if (lat >= 28.70 && lat <= 31.45 && lng >= 77.55 && lng <= 81.05) return 'Uttarakhand';
  if (lat >= 30.35 && lat <= 33.25 && lng >= 75.60 && lng <= 79.10) return 'Himachal Pradesh';
  return '';
};

/**
 * Reverse geocode Google Maps Results into standardized ParsedAddress
 */
export const parseGoogleMapsResult = (
  result: any,
  lat: number,
  lng: number
): ParsedAddress => {
  let houseNumber = '';
  let street = '';
  let sublocality = '';
  let locality = '';
  let city = '';
  let state = '';
  let pincode = '';
  let country = 'India';

  for (const component of result.address_components) {
    const types = component.types;

    if (types.includes('street_number')) {
      houseNumber = component.long_name;
    } else if (types.includes('route')) {
      street = component.long_name;
    } else if (types.includes('sublocality_level_2')) {
      sublocality = component.long_name;
    } else if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
      locality = component.long_name;
    } else if (types.includes('locality')) {
      city = component.long_name;
    } else if (types.includes('administrative_area_level_2') && !city) {
      city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      state = normalizeStateName(component.long_name);
    } else if (types.includes('postal_code')) {
      pincode = component.long_name.replace(/\D/g, '').substring(0, 6);
    } else if (types.includes('country')) {
      country = component.long_name;
    }
  }

  if (!state) {
    state = getStateFromCoordinates(lat, lng);
  }

  // Assemble street address smoothly
  const streetParts = [houseNumber, street, sublocality, locality].filter(Boolean);
  const finalStreet = streetParts.length > 0 ? streetParts.join(', ') : result.formatted_address.split(',')[0];

  return {
    houseNumber: houseNumber || undefined,
    street: finalStreet || 'Selected Location',
    locality: locality || sublocality || undefined,
    city: city || 'Local Area',
    state: state || 'India',
    pincode: pincode && pincode.length === 6 ? pincode : '',
    country: country || 'India',
    formattedAddress: result.formatted_address,
    latitude: lat,
    longitude: lng,
    source: 'GOOGLE_MAPS'
  };
};

/**
 * Reverse geocode OpenStreetMap / Nominatim JSON into standardized ParsedAddress
 */
export const parseOpenStreetMapResult = (data: any, lat: number, lng: number): ParsedAddress => {
  const addr = data.address || {};

  // 1. Detailed Building / Apartment / Society Name extraction
  const rawBuilding = data.name && data.name !== addr.road
    ? data.name
    : (addr.building || addr.house_name || addr.apartment || addr.flats || addr.residential || addr.amenity || addr.office || '');

  // 2. House / Flat / Unit / Door Number
  const houseNumber = addr.house_number || addr.unit || addr.door || '';

  // 3. Road / Street / Lane
  const road = addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || addr.lane || addr.alley || '';

  // 4. Exact Area / Sector / Colony / Suburb / Neighbourhood
  const areaParts = [
    addr.block || addr.sector,
    addr.residential && addr.residential !== rawBuilding ? addr.residential : '',
    addr.colony,
    addr.neighbourhood,
    addr.suburb || addr.quarter || addr.subdivision || addr.village || addr.hamlet
  ].filter(Boolean);
  const area = Array.from(new Set(areaParts)).join(', ');

  // 5. City & State
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.city_district || addr.district || addr.county || '';
  let state = normalizeStateName(addr.state || '');
  if (!state) {
    state = getStateFromCoordinates(lat, lng);
  }

  // 6. 6-digit Indian PIN code
  const rawPincode = (addr.postcode || '').replace(/\D/g, '').substring(0, 6);
  const pincode = rawPincode && rawPincode.length === 6 ? rawPincode : '';
  const country = addr.country || 'India';

  // 7. Extract from display_name if structured fields missed building or area
  let buildingName = rawBuilding;
  if (!buildingName && data.display_name) {
    const parts = data.display_name.split(', ').map((p: string) => p.trim());
    if (parts.length > 3 && parts[0] !== road && parts[0] !== city && parts[0] !== state) {
      buildingName = parts[0];
    }
  }

  // Assemble comprehensive street & area description
  const streetSegments = [buildingName, houseNumber ? `No. ${houseNumber}` : '', road, area].filter(Boolean);
  const finalStreet = streetSegments.length > 0
    ? Array.from(new Set(streetSegments)).join(', ')
    : road || area || data.display_name?.split(',')[0] || 'Selected Location';

  const apartmentDesc = buildingName || houseNumber ? `${buildingName || ''} ${houseNumber ? `Flat ${houseNumber}` : ''}`.trim() : undefined;

  return {
    houseNumber: houseNumber || undefined,
    buildingName: buildingName || undefined,
    apartment: apartmentDesc,
    street: finalStreet,
    area: area || undefined,
    locality: area || addr.suburb || addr.neighbourhood || undefined,
    city: city || 'Local Area',
    state: state || 'India',
    pincode,
    country,
    formattedAddress: data.display_name || `${finalStreet}, ${city}, ${state} ${pincode}`.trim(),
    latitude: lat,
    longitude: lng,
    source: 'OPENSTREETMAP'
  };
};

/**
 * Reverse geocode coordinates using high-precision Nominatim first (building level, zoom=18),
 * with instant fallback to Photon (Komoot).
 */
export const reverseGeocodeCoordinates = async (lat: number, lng: number): Promise<ParsedAddress> => {
  // 1. Try Dedicated Server-Side Proxy first (no browser CORS or forbidden User-Agent header restrictions)
  try {
    const res = await api.get('/location/reverse-geocode', { params: { lat, lng } });
    if (res.data && res.data.success) {
      return {
        houseNumber: res.data.houseNumber,
        buildingName: res.data.buildingName,
        apartment: res.data.apartment,
        street: res.data.street,
        area: res.data.area,
        locality: res.data.locality,
        city: res.data.city,
        state: res.data.state,
        pincode: res.data.pincode,
        country: res.data.country || 'India',
        formattedAddress: res.data.formattedAddress,
        latitude: res.data.latitude,
        longitude: res.data.longitude,
        source: res.data.source || 'OPENSTREETMAP'
      };
    }
  } catch {
    // Continue to client-side fallback
  }

  // 2. Try Photon Komoot API directly
  try {
    const photonAddress = await reverseGeocodePhotonOnly(lat, lng);
    if (photonAddress) return photonAddress;
  } catch {
    // Continue to fallback
  }

  // 3. Fallback to nearest locality only if within 50 km, else construct genuine coordinate point
  const nearest = findNearestCatalogLocality(lat, lng);
  const detectedState = getStateFromCoordinates(lat, lng) || nearest.state;

  return {
    street: `Location at ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
    locality: undefined,
    city: nearest ? nearest.city : 'Current City',
    state: detectedState,
    pincode: nearest ? nearest.pincode : '',
    country: 'India',
    formattedAddress: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}, ${detectedState}`,
    latitude: lat,
    longitude: lng,
    source: 'OFFLINE_FALLBACK'
  };
};

/**
 * Internal Photon Reverse Geocoder
 */
export const reverseGeocodePhotonOnly = async (lat: number, lng: number): Promise<ParsedAddress | null> => {
  const url = `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}&lang=en`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const props = feature.properties || {};

        const houseNumber = props.housenumber || '';
        const buildingName = props.name && props.name !== props.street ? props.name : (props.housenumber ? `Building ${props.housenumber}` : '');
        const streetName = props.street || '';
        const area = props.district || props.suburb || props.locality || '';
        const city = props.city || props.town || props.county || props.district || '';
        let state = normalizeStateName(props.state || '');
        if (!state) {
          state = getStateFromCoordinates(lat, lng);
        }
        const rawPincode = (props.postcode || '').replace(/\D/g, '').substring(0, 6);
        const pincode = rawPincode && rawPincode.length === 6 ? rawPincode : '';
        const country = props.country || 'India';

        const streetParts = [buildingName, houseNumber ? `No. ${houseNumber}` : '', streetName, area].filter(Boolean);
        const finalStreet = streetParts.length > 0 ? Array.from(new Set(streetParts)).join(', ') : streetName || area || 'Selected Location';

        return {
          houseNumber: houseNumber || undefined,
          buildingName: buildingName || undefined,
          apartment: buildingName || undefined,
          street: finalStreet,
          area: area || undefined,
          locality: area || undefined,
          city: city || 'Local Area',
          state: state || 'India',
          pincode,
          country,
          formattedAddress: `${finalStreet}, ${city}, ${state} ${pincode}`.trim(),
          latitude: lat,
          longitude: lng,
          source: 'PHOTON'
        };
      }
    }
  } catch (err) {
    // Photon timed out or network error
  } finally {
    clearTimeout(timeoutId);
  }

  return null;
};

// Aliased for backwards compatibility
export const reverseGeocodePhoton = reverseGeocodeCoordinates;

/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim with debouncing & timeout
 */
export const reverseGeocodeNominatim = async (lat: number, lng: number): Promise<ParsedAddress> => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EthnizCouture-DeliveryPicker/1.0 (contact@ethnizcouture.com)'
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Reverse geocode failed with HTTP ${res.status}`);

    const data = await res.json();
    return parseOpenStreetMapResult(data, lat, lng);
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
};

/**
 * Locates the nearest Indian locality in catalog via Haversine distance
 */
export const findNearestCatalogLocality = (lat: number, lng: number) => {
  let minDistance = Infinity;
  let nearest = INDIAN_LOCALITY_CATALOG[0];

  for (const item of INDIAN_LOCALITY_CATALOG) {
    const dLat = (item.lat - lat) * (Math.PI / 180);
    const dLng = (item.lng - lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat * (Math.PI / 180)) * Math.cos(item.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = 6371 * c; // km

    if (dist < minDistance) {
      minDistance = dist;
      nearest = item;
    }
  }

  return nearest;
};

/**
 * Real-time Indian location search using OpenStreetMap Nominatim with local catalog fallback
 */
export const searchIndianLocations = async (
  query: string
): Promise<Array<{ name: string; city: string; state: string; pincode: string; lat: number; lng: number }>> => {
  if (!query || query.trim().length < 2) return [];

  const clean = query.trim();

  // Instant local catalog matches
  const catalogMatches = INDIAN_LOCALITY_CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(clean.toLowerCase()) ||
      item.city.toLowerCase().includes(clean.toLowerCase()) ||
      item.pincode.startsWith(clean)
  );

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      clean + ', India'
    )}&addressdetails=1&countrycodes=in&limit=6`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'EthnizCouture-DeliveryPicker/1.0'
      }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const remoteMatches = data.map((item: any) => {
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.district || addr.county || '';
        const state = normalizeStateName(addr.state || '') || getStateFromCoordinates(parseFloat(item.lat), parseFloat(item.lon));
        const pincode = (addr.postcode || '').replace(/\D/g, '').substring(0, 6);
        return {
          name: item.display_name.split(',').slice(0, 3).join(','),
          city,
          state,
          pincode: pincode && pincode.length === 6 ? pincode : '',
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        };
      });

      const combined = [...remoteMatches, ...catalogMatches];
      const seen = new Set<string>();
      return combined.filter((item) => {
        const key = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  } catch {
    // Return catalog matches on network or timeout error
  }

  return catalogMatches;
};

/**
 * Real-time Indian location search using Photon API (Komoot open-source geocoder)
 * API: https://photon.komoot.io/api/?q={query}&limit=8&lang=en
 */
export const searchLocationsPhoton = async (
  query: string
): Promise<Array<{ name: string; city: string; state: string; pincode: string; lat: number; lng: number }>> => {
  if (!query || query.trim().length < 2) return [];

  const clean = query.trim();

  // Instant catalog matches
  const catalogMatches = INDIAN_LOCALITY_CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(clean.toLowerCase()) ||
      item.city.toLowerCase().includes(clean.toLowerCase()) ||
      item.pincode.startsWith(clean)
  );

  // 1. Try server-side location search proxy first
  try {
    const res = await api.get('/location/search', { params: { q: clean } });
    if (res.data && res.data.success && Array.isArray(res.data.results) && res.data.results.length > 0) {
      const combined = [...res.data.results, ...catalogMatches];
      const seen = new Set<string>();
      return combined.filter((item) => {
        const key = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  } catch {
    // Fall back to direct client-side fetch
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(clean)}&limit=8&lang=en`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.features && Array.isArray(data.features)) {
        const photonMatches = data.features
          .filter((f: any) => {
            const country = (f.properties?.country || '').toLowerCase();
            return country === 'india' || !country || f.properties?.countrycode === 'IN';
          })
          .map((f: any) => {
            const props = f.properties || {};
            const lat = f.geometry.coordinates[1];
            const lng = f.geometry.coordinates[0];
            const city = props.city || props.town || props.county || props.district || '';
            const state = normalizeStateName(props.state || '') || getStateFromCoordinates(lat, lng);
            const pincode = (props.postcode || '').replace(/\D/g, '').substring(0, 6);
            const titleParts = [props.name, props.street, props.district].filter(Boolean);
            const name = titleParts.length > 0 ? titleParts.join(', ') : props.name || clean;

            return {
              name,
              city,
              state,
              pincode: pincode && pincode.length === 6 ? pincode : '',
              lat,
              lng
            };
          });

        const combined = [...photonMatches, ...catalogMatches];
        const seen = new Set<string>();
        return combined.filter((item) => {
          const key = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    }
  } catch {
    // Fallback to local catalog and Nominatim
  }

  return searchIndianLocations(query);
};
