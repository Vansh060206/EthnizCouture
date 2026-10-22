import { Router, Request, Response } from 'express';
import https from 'https';

const router = Router();

// In-memory cache for reverse geocoding & search (prevents repeated external API hits)
const locationCache = new Map<string, { data: any; expiry: number }>();

const getCached = (key: string) => {
  const item = locationCache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data;
  }
  return null;
};

const setCache = (key: string, data: any, ttlSec = 600) => {
  locationCache.set(key, { data, expiry: Date.now() + ttlSec * 1000 });
  if (locationCache.size > 2000) {
    const firstKey = locationCache.keys().next().value;
    if (firstKey) locationCache.delete(firstKey);
  }
};

const httpsGetJson = (url: string, headers: Record<string, string> = {}): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'EthnizCouture-DeliveryTracker/1.0 (contact@ethnizcouture.com)',
          Accept: 'application/json',
          ...headers
        },
        timeout: 5000
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(raw));
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          } catch (e: any) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.on('error', reject);
  });
};

/**
 * GET /api/location/reverse-geocode?lat=28.6139&lng=77.2090
 * High-precision server-side reverse geocode without client CORS/header blocks
 */
router.get('/reverse-geocode', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ success: false, message: 'Valid lat and lng query parameters are required' });
  }

  const cacheKey = `rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ success: true, ...cached, cached: true });
  }

  // 1. Try Nominatim at zoom=18 for exact building / house / street resolution
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
    const data = await httpsGetJson(nominatimUrl);

    if (data && data.address) {
      const addr = data.address;
      const rawBuilding = data.name && data.name !== addr.road
        ? data.name
        : (addr.building || addr.house_name || addr.apartment || addr.flats || addr.residential || addr.amenity || addr.office || '');

      const houseNumber = addr.house_number || addr.unit || addr.door || '';
      const road = addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || addr.lane || addr.alley || '';

      const areaParts = [
        addr.block || addr.sector,
        addr.residential && addr.residential !== rawBuilding ? addr.residential : '',
        addr.colony,
        addr.neighbourhood,
        addr.suburb || addr.quarter || addr.subdivision || addr.village || addr.hamlet
      ].filter(Boolean);
      const area = Array.from(new Set(areaParts)).join(', ');

      const city = addr.city || addr.town || addr.village || addr.municipality || addr.city_district || addr.district || addr.county || '';
      const state = addr.state || '';
      const pincode = (addr.postcode || '').replace(/\D/g, '').substring(0, 6);

      let buildingName = rawBuilding;
      if (!buildingName && data.display_name) {
        const parts = data.display_name.split(', ').map((p: string) => p.trim());
        if (parts.length > 3 && parts[0] !== road && parts[0] !== city && parts[0] !== state) {
          buildingName = parts[0];
        }
      }

      const streetSegments = [buildingName, houseNumber ? `No. ${houseNumber}` : '', road, area].filter(Boolean);
      const finalStreet = streetSegments.length > 0
        ? Array.from(new Set(streetSegments)).join(', ')
        : road || area || data.display_name?.split(',')[0] || 'Selected Location';

      const responsePayload = {
        buildingName: buildingName || undefined,
        houseNumber: houseNumber || undefined,
        apartment: buildingName || houseNumber ? `${buildingName || ''} ${houseNumber ? `Flat ${houseNumber}` : ''}`.trim() : undefined,
        road: road || undefined,
        area: area || undefined,
        street: finalStreet,
        locality: area || addr.suburb || addr.neighbourhood || undefined,
        city: city || 'Local Area',
        state: state || 'India',
        pincode,
        country: addr.country || 'India',
        formattedAddress: data.display_name || `${finalStreet}, ${city}, ${state} ${pincode}`.trim(),
        latitude: lat,
        longitude: lng,
        source: 'NOMINATIM'
      };

      setCache(cacheKey, responsePayload);
      return res.json({ success: true, ...responsePayload });
    }
  } catch (err: any) {
    // Fall back to Photon
  }

  // 2. Try Photon Komoot API
  try {
    const photonUrl = `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}&lang=en`;
    const photonData = await httpsGetJson(photonUrl);

    if (photonData && photonData.features && photonData.features.length > 0) {
      const props = photonData.features[0].properties || {};
      const houseNumber = props.housenumber || '';
      const buildingName = props.name && props.name !== props.street ? props.name : '';
      const streetName = props.street || '';
      const area = props.district || props.suburb || props.locality || '';
      const city = props.city || props.town || props.county || props.district || '';
      const state = props.state || '';
      const pincode = (props.postcode || '').replace(/\D/g, '').substring(0, 6);

      const streetParts = [buildingName, houseNumber ? `No. ${houseNumber}` : '', streetName, area].filter(Boolean);
      const finalStreet = streetParts.length > 0
        ? Array.from(new Set(streetParts)).join(', ')
        : streetName || area || props.name || 'Selected Location';

      const responsePayload = {
        buildingName: buildingName || undefined,
        houseNumber: houseNumber || undefined,
        apartment: buildingName || undefined,
        road: streetName || undefined,
        area: area || undefined,
        street: finalStreet,
        locality: area || undefined,
        city: city || 'Local Area',
        state: state || 'India',
        pincode,
        country: props.country || 'India',
        formattedAddress: `${finalStreet}, ${city}, ${state} ${pincode}`.trim(),
        latitude: lat,
        longitude: lng,
        source: 'PHOTON'
      };

      setCache(cacheKey, responsePayload);
      return res.json({ success: true, ...responsePayload });
    }
  } catch (err: any) {
    // Both failed
  }

  return res.status(502).json({
    success: false,
    message: 'Satellite reverse geocode service currently unavailable'
  });
});

/**
 * GET /api/location/search?q=query
 * High-precision Indian locality & satellite registered POI search
 */
router.get('/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  if (!query || query.length < 2) {
    return res.json({ success: true, results: [] });
  }

  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ success: true, results: cached, cached: true });
  }

  try {
    // Query Photon first for instant multi-word fuzzy matching across Indian landmarks
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=en`;
    const data = await httpsGetJson(photonUrl);

    if (data && data.features) {
      const results = data.features
        .filter((f: any) => {
          const country = (f.properties?.country || '').toLowerCase();
          return country === 'india' || !country || f.properties?.countrycode === 'IN';
        })
        .map((f: any) => {
          const props = f.properties || {};
          const city = props.city || props.town || props.county || props.district || '';
          const state = props.state || '';
          const pincode = (props.postcode || '').replace(/\D/g, '').substring(0, 6);
          const titleParts = [props.name, props.street, props.district].filter(Boolean);
          const name = titleParts.length > 0 ? titleParts.join(', ') : props.name || query;

          return {
            name,
            buildingName: props.name !== props.street ? props.name : undefined,
            street: props.street || undefined,
            area: props.district || props.suburb || props.locality || undefined,
            city,
            state,
            pincode,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0]
          };
        });

      setCache(cacheKey, results, 300);
      return res.json({ success: true, results });
    }
  } catch {
    // Fall back to empty or local search
  }

  return res.json({ success: true, results: [] });
});

/**
 * Standard Indian Postal Circle & State prefix reference table
 * Used for instant zero-latency fallback if external postal API is slow/unavailable
 */
const PINCODE_PREFIX_MAP: Record<string, { state: string; sampleCity: string; isMetro?: boolean }> = {
  '11': { state: 'Delhi', sampleCity: 'New Delhi', isMetro: true },
  '12': { state: 'Haryana', sampleCity: 'Gurugram', isMetro: true },
  '13': { state: 'Haryana', sampleCity: 'Ambala' },
  '14': { state: 'Punjab', sampleCity: 'Amritsar' },
  '15': { state: 'Punjab', sampleCity: 'Bathinda' },
  '16': { state: 'Chandigarh', sampleCity: 'Chandigarh', isMetro: true },
  '17': { state: 'Himachal Pradesh', sampleCity: 'Shimla' },
  '18': { state: 'Jammu and Kashmir', sampleCity: 'Jammu' },
  '19': { state: 'Jammu and Kashmir', sampleCity: 'Srinagar' },
  '20': { state: 'Uttar Pradesh', sampleCity: 'Noida', isMetro: true },
  '21': { state: 'Uttar Pradesh', sampleCity: 'Prayagraj' },
  '22': { state: 'Uttar Pradesh', sampleCity: 'Lucknow' },
  '23': { state: 'Uttar Pradesh', sampleCity: 'Varanasi' },
  '24': { state: 'Uttarakhand', sampleCity: 'Dehradun' },
  '25': { state: 'Uttar Pradesh', sampleCity: 'Meerut' },
  '26': { state: 'Uttarakhand', sampleCity: 'Haldwani' },
  '27': { state: 'Uttar Pradesh', sampleCity: 'Gorakhpur' },
  '28': { state: 'Uttar Pradesh', sampleCity: 'Agra' },
  '30': { state: 'Rajasthan', sampleCity: 'Jaipur' },
  '31': { state: 'Rajasthan', sampleCity: 'Udaipur' },
  '32': { state: 'Rajasthan', sampleCity: 'Kota' },
  '33': { state: 'Rajasthan', sampleCity: 'Bikaner' },
  '34': { state: 'Rajasthan', sampleCity: 'Jodhpur' },
  '36': { state: 'Gujarat', sampleCity: 'Rajkot' },
  '37': { state: 'Gujarat', sampleCity: 'Jamnagar' },
  '38': { state: 'Gujarat', sampleCity: 'Ahmedabad', isMetro: true },
  '39': { state: 'Gujarat', sampleCity: 'Surat' },
  '40': { state: 'Maharashtra', sampleCity: 'Mumbai', isMetro: true },
  '41': { state: 'Maharashtra', sampleCity: 'Pune', isMetro: true },
  '42': { state: 'Maharashtra', sampleCity: 'Nashik' },
  '43': { state: 'Maharashtra', sampleCity: 'Chhatrapati Sambhajinagar' },
  '44': { state: 'Maharashtra', sampleCity: 'Nagpur' },
  '45': { state: 'Madhya Pradesh', sampleCity: 'Indore' },
  '46': { state: 'Madhya Pradesh', sampleCity: 'Bhopal' },
  '47': { state: 'Madhya Pradesh', sampleCity: 'Gwalior' },
  '48': { state: 'Madhya Pradesh', sampleCity: 'Jabalpur' },
  '49': { state: 'Chhattisgarh', sampleCity: 'Raipur' },
  '50': { state: 'Telangana', sampleCity: 'Hyderabad', isMetro: true },
  '51': { state: 'Andhra Pradesh', sampleCity: 'Tirupati' },
  '52': { state: 'Andhra Pradesh', sampleCity: 'Vijayawada' },
  '53': { state: 'Andhra Pradesh', sampleCity: 'Visakhapatnam' },
  '56': { state: 'Karnataka', sampleCity: 'Bengaluru', isMetro: true },
  '57': { state: 'Karnataka', sampleCity: 'Mangaluru' },
  '58': { state: 'Karnataka', sampleCity: 'Hubballi' },
  '59': { state: 'Karnataka', sampleCity: 'Belagavi' },
  '60': { state: 'Tamil Nadu', sampleCity: 'Chennai', isMetro: true },
  '61': { state: 'Tamil Nadu', sampleCity: 'Thanjavur' },
  '62': { state: 'Tamil Nadu', sampleCity: 'Madurai' },
  '63': { state: 'Tamil Nadu', sampleCity: 'Vellore' },
  '64': { state: 'Tamil Nadu', sampleCity: 'Coimbatore' },
  '67': { state: 'Kerala', sampleCity: 'Kozhikode' },
  '68': { state: 'Kerala', sampleCity: 'Kochi' },
  '69': { state: 'Kerala', sampleCity: 'Thiruvananthapuram' },
  '70': { state: 'West Bengal', sampleCity: 'Kolkata', isMetro: true },
  '71': { state: 'West Bengal', sampleCity: 'Howrah' },
  '72': { state: 'West Bengal', sampleCity: 'Midnapore' },
  '73': { state: 'West Bengal', sampleCity: 'Siliguri' },
  '74': { state: 'West Bengal', sampleCity: 'North 24 Parganas' },
  '75': { state: 'Odisha', sampleCity: 'Bhubaneswar' },
  '76': { state: 'Odisha', sampleCity: 'Cuttack' },
  '77': { state: 'Odisha', sampleCity: 'Rourkela' },
  '78': { state: 'Assam', sampleCity: 'Guwahati' },
  '79': { state: 'North East', sampleCity: 'Shillong' },
  '80': { state: 'Bihar', sampleCity: 'Patna' },
  '81': { state: 'Bihar', sampleCity: 'Bhagalpur' },
  '82': { state: 'Bihar', sampleCity: 'Gaya' },
  '83': { state: 'Jharkhand', sampleCity: 'Ranchi' },
  '84': { state: 'Bihar', sampleCity: 'Muzaffarpur' },
  '85': { state: 'Bihar', sampleCity: 'Purnia' },
};

/**
 * Calculates delivery promise timeline based on customer location tier
 */
const calculateDeliveryPromise = (isMetro: boolean) => {
  const minDays = isMetro ? 2 : 3;
  const maxDays = isMetro ? 3 : 5;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + maxDays);

  const formattedDate = targetDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  return {
    minDays,
    maxDays,
    deliveryDays: `${minDays}–${maxDays} business days`,
    carrier: isMetro ? 'Blue Dart Express Air Priority' : 'Blue Dart / Delhivery Express',
    estimatedDeliveryDate: formattedDate,
    shippingSpeed: isMetro ? 'Express Air' : 'Standard Insured Surface',
    codAvailable: true,
    freeShipping: true,
    serviceable: true
  };
};

/**
 * GET /api/location/pincode/:pincode
 * High-speed 6-digit Indian pincode lookup with district, state, city & courier promise
 */
router.get('/pincode/:pincode', async (req: Request, res: Response) => {
  const paramPin = Array.isArray(req.params.pincode) ? req.params.pincode[0] : req.params.pincode;
  const rawPin = (paramPin || '').trim().replace(/\D/g, '');

  if (!/^[1-9][0-9]{5}$/.test(rawPin)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid 6-digit Indian postal pincode'
    });
  }

  const cacheKey = `pincode:${rawPin}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ success: true, ...cached, cached: true });
  }

  const prefix2 = rawPin.substring(0, 2);
  const fallbackInfo = PINCODE_PREFIX_MAP[prefix2];

  try {
    const postalApiUrl = `https://api.postalpincode.in/pincode/${rawPin}`;
    const data = await httpsGetJson(postalApiUrl);

    if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
      const primaryOffice = data[0].PostOffice[0];
      const district = primaryOffice.District || '';
      const state = primaryOffice.State || fallbackInfo?.state || 'India';
      const city = district || primaryOffice.Block || primaryOffice.Name || fallbackInfo?.sampleCity || 'Local Area';
      const offices = data[0].PostOffice.slice(0, 6).map((o: any) => o.Name);

      const isMetro = Boolean(
        fallbackInfo?.isMetro ||
        ['Delhi', 'Mumbai', 'Bengaluru', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'].some((m) =>
          city.toLowerCase().includes(m.toLowerCase()) || district.toLowerCase().includes(m.toLowerCase())
        )
      );

      const deliveryPromise = calculateDeliveryPromise(isMetro);

      const payload = {
        pincode: rawPin,
        city,
        district,
        state,
        primaryOffice: primaryOffice.Name,
        postOffices: offices,
        isMetro,
        ...deliveryPromise,
        formattedLocation: `${city}, ${state}`
      };

      setCache(cacheKey, payload, 86400); // 24hr cache
      return res.json({ success: true, ...payload });
    }
  } catch (err: any) {
    // Postal API timed out or network blip; seamlessly use postal circle prefix map
  }

  if (fallbackInfo) {
    const deliveryPromise = calculateDeliveryPromise(Boolean(fallbackInfo.isMetro));
    const payload = {
      pincode: rawPin,
      city: fallbackInfo.sampleCity,
      district: fallbackInfo.sampleCity,
      state: fallbackInfo.state,
      isMetro: Boolean(fallbackInfo.isMetro),
      ...deliveryPromise,
      formattedLocation: `${fallbackInfo.sampleCity}, ${fallbackInfo.state}`,
      source: 'PREFIX_FALLBACK'
    };
    setCache(cacheKey, payload, 86400);
    return res.json({ success: true, ...payload });
  }

  return res.status(404).json({
    success: false,
    message: 'Unable to resolve pincode details. Please enter city and state manually.'
  });
});

export default router;

