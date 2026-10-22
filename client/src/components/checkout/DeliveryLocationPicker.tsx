import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Search,
  Check,
  AlertCircle,
  Loader2,
  PenLine,
  Compass,
  X,
  Crosshair
} from 'lucide-react';
import {
  ParsedAddress,
  reverseGeocodePhoton,
  reverseGeocodeNominatim,
  INDIAN_LOCALITY_CATALOG,
  searchLocationsPhoton
} from '../../services/geocoding';

// Custom Luxury Imperial Pin with Live Radar Pulse for Leaflet
const createLuxuryPinIcon = () => {
  return L.divIcon({
    className: 'custom-royal-pin',
    html: `
      <div style="position: relative; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; cursor: grab;">
        <!-- Live Radar Beacon Ripple -->
        <div class="leaflet-radar-pulse" style="
          position: absolute;
          bottom: -4px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(197, 160, 89, 0.45);
          pointer-events: none;
        "></div>
        <div style="
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, #4A1521 0%, #20040B 100%);
          border: 2.5px solid #DFC89D;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          transition: transform 0.2s ease;
        ">
          <div style="
            width: 14px;
            height: 14px;
            background: #DFC89D;
            border-radius: 50%;
            transform: rotate(45deg);
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
          "></div>
        </div>
        <div style="
          width: 16px;
          height: 5px;
          background: rgba(0,0,0,0.35);
          border-radius: 50%;
          margin-top: 3px;
          filter: blur(1.5px);
        "></div>
      </div>
    `,
    iconSize: [38, 48],
    iconAnchor: [19, 46]
  });
};

interface DeliveryLocationPickerProps {
  onLocationConfirmed: (address: {
    street?: string;
    apartment?: string;
    buildingName?: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
    formattedAddress: string;
    locality?: string;
    landmark?: string;
  }) => void;
  onManualEntrySelect?: () => void;
  initialPincode?: string;
  initialApartment?: string;
  initialStreet?: string;
  initialLatitude?: number;
  initialLongitude?: number;
}

export const DeliveryLocationPicker: React.FC<DeliveryLocationPickerProps> = ({
  onLocationConfirmed,
  onManualEntrySelect,
  initialPincode,
  initialLatitude,
  initialLongitude
}) => {
  // Initialize with initial coordinates if available, or initialPincode, or New Delhi Connaught Place
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(() => {
    if (initialLatitude && initialLongitude && !isNaN(initialLatitude) && !isNaN(initialLongitude)) {
      return { lat: initialLatitude, lng: initialLongitude };
    }
    if (initialPincode) {
      const match = INDIAN_LOCALITY_CATALOG.find((item) => item.pincode === initialPincode);
      if (match) return { lat: match.lat, lng: match.lng };
    }
    return { lat: 28.6304, lng: 77.2177 };
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState<ParsedAddress | null>(null);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(() => {
    return Boolean(initialLatitude && initialLongitude);
  });
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ name: string; city: string; state: string; pincode: string; lat: number; lng: number }>>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Leaflet Refs
  const mapElementRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkerRef = useRef<L.Marker | null>(null);
  const leafletAccuracyCircleRef = useRef<L.Circle | null>(null);
  const debounceTimerRef = useRef<any>(null);

  // 1. Reverse Geocode Coordinates using Backend Proxy (Nominatim & Photon)
  const fetchAddressForCoordinates = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    setGpsError(null);

    try {
      const parsed = await reverseGeocodePhoton(lat, lng);
      setGeocodedAddress(parsed);
    } catch (err) {
      console.error('Reverse geocode error:', err);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Debounced Coordinate Change Trigger
  const handleCoordinateChange = useCallback((newLat: number, newLng: number, updateMapCenter = false) => {
    setCoords({ lat: newLat, lng: newLng });
    setIsConfirmed(false);

    if (leafletMarkerRef.current) {
      leafletMarkerRef.current.setLatLng([newLat, newLng]);
    }
    if (updateMapCenter && leafletMapRef.current) {
      leafletMapRef.current.flyTo([newLat, newLng], 17, { duration: 1.2 });
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchAddressForCoordinates(newLat, newLng);
    }, 400);
  }, [fetchAddressForCoordinates]);

  // 2. Initialize Leaflet with Vibrant OpenStreetMap Humanitarian (HOT) Tiles
  useEffect(() => {
    if (!mapElementRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapElementRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false
      });

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap Humanitarian (HOT) — 100% Free, warm & vibrant colors, ZERO API key, NO watermark
      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const marker = L.marker([coords.lat, coords.lng], {
        icon: createLuxuryPinIcon(),
        draggable: true,
        autoPan: true
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        if (leafletAccuracyCircleRef.current) {
          leafletAccuracyCircleRef.current.setLatLng(pos);
        }
        handleCoordinateChange(pos.lat, pos.lng, false);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        if (leafletAccuracyCircleRef.current) {
          leafletAccuracyCircleRef.current.setLatLng(e.latlng);
        }
        handleCoordinateChange(e.latlng.lat, e.latlng.lng, false);
      });

      leafletMapRef.current = map;
      leafletMarkerRef.current = marker;

      // Initial geocoding
      fetchAddressForCoordinates(coords.lat, coords.lng);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        leafletMarkerRef.current = null;
        leafletAccuracyCircleRef.current = null;
      }
    };
  }, []);

  // 3. Genuine Real-Time Geolocation via Device GPS/WiFi Hardware
  const handleUseCurrentLocation = useCallback(() => {
    setGpsError(null);
    setIsLocatingGPS(true);

    if (!navigator.geolocation) {
      setIsLocatingGPS(false);
      setGpsError('Geolocation is not supported by your browser. Please search your locality or enter your address manually.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocatingGPS(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy || 20);

        setGpsAccuracy(accuracy);
        setIsGpsActive(true);
        setCoords({ lat, lng });
        setIsConfirmed(false);

        // 1. Center map and move royal pin
        if (leafletMarkerRef.current) {
          leafletMarkerRef.current.setLatLng([lat, lng]);
        }

        if (leafletMapRef.current) {
          leafletMapRef.current.flyTo([lat, lng], 17, { duration: 1.2 });

          // Draw precision accuracy circle
          if (leafletAccuracyCircleRef.current) {
            leafletAccuracyCircleRef.current.remove();
          }
          leafletAccuracyCircleRef.current = L.circle([lat, lng], {
            radius: Math.max(accuracy, 15),
            color: '#800020',
            fillColor: '#C6A15D',
            fillOpacity: 0.16,
            weight: 1.5,
            dashArray: '4, 4'
          }).addTo(leafletMapRef.current);
        }

        // Reverse geocode coordinates so user can review the location
        fetchAddressForCoordinates(lat, lng);
      },
      (error) => {
        setIsLocatingGPS(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('Location permission was denied. Tap the lock/permission icon in your browser URL bar to allow location, or choose your city below.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('GPS satellite signal is currently unavailable. Please select your city or search your locality.');
            break;
          case error.TIMEOUT:
            setGpsError('GPS request timed out. Please try clicking "Use My Current Location" again.');
            break;
          default:
            setGpsError('Unable to retrieve device GPS. Please enter your delivery address manually.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0 // ZERO cache: always acquire real-time device hardware GPS
      }
    );
  }, [fetchAddressForCoordinates]);

  // 4. Real-time Search Suggestions across India
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSearchSuggestions([]);
      setIsSearchOpen(false);
      return;
    }

    setIsSearching(true);
    searchLocationsPhoton(query)
      .then((results) => {
        setSearchSuggestions(results);
        setIsSearchOpen(results.length > 0);
      })
      .finally(() => setIsSearching(false));
  };

  const handleSelectSuggestion = (item: { name: string; city: string; state: string; pincode: string; lat: number; lng: number }) => {
    setSearchQuery(item.name);
    setIsSearchOpen(false);
    setIsGpsActive(false);
    setGpsAccuracy(null);
    if (leafletAccuracyCircleRef.current) {
      leafletAccuracyCircleRef.current.remove();
      leafletAccuracyCircleRef.current = null;
    }
    handleCoordinateChange(item.lat, item.lng, true);
  };

  // 5. Confirm Delivery Location — Flipkart Flow: leaves street empty for user to type
  const handleConfirmLocation = () => {
    if (!geocodedAddress) return;

    setIsConfirmed(true);
    onLocationConfirmed({
      street: '', // Left EMPTY as requested by user — Flipkart flow: user manually enters their street address & locality
      apartment: '',
      city: geocodedAddress.city,
      state: geocodedAddress.state,
      pincode: geocodedAddress.pincode,
      latitude: geocodedAddress.latitude,
      longitude: geocodedAddress.longitude,
      formattedAddress: geocodedAddress.formattedAddress,
      locality: geocodedAddress.locality || geocodedAddress.area
    });
  };

  return (
    <div className="bg-[#FAF7F2] border border-[#C6A15D]/40 rounded-xl p-4 sm:p-6 space-y-4 shadow-sm">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DEC8]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#3E1A1E] text-[#DFC89D] flex items-center justify-center shrink-0 shadow-sm">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-zinc-900">
              Delivery Location
            </h3>
            <p className="text-[11px] text-zinc-500">
              Pin your location on the map or use your current location
            </p>
          </div>
        </div>

        {/* Action Toggle Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocatingGPS}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#3E1A1E] hover:bg-[#522429] text-[#DFC89D] text-xs font-bold uppercase tracking-wider border border-[#C6A15D]/50 shadow-md transition-all group disabled:opacity-60"
            title="Detect your location with device GPS"
          >
            {isLocatingGPS ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#DFC89D]" />
            ) : (
              <Navigation className="w-4 h-4 text-[#DFC89D] group-hover:scale-110 transition-transform" />
            )}
            <span>{isLocatingGPS ? 'Locating...' : 'Use Current Location'}</span>
          </button>

          {onManualEntrySelect && (
            <button
              type="button"
              onClick={onManualEntrySelect}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-semibold border border-zinc-300 transition-colors shadow-sm"
            >
              <PenLine className="w-3.5 h-3.5 text-zinc-500" />
              <span>Enter Manually</span>
            </button>
          )}
        </div>
      </div>

      {/* GPS Error Notification */}
      {gpsError && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2.5 text-xs text-amber-900 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Location Assistance:</span>
            <span>{gpsError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGpsError(null)}
            className="text-amber-700 hover:text-amber-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Locality Search Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (searchSuggestions.length > 0) setIsSearchOpen(true);
            }}
            placeholder="Search colony, society, apartment, road, or sector..."
            className="w-full pl-10 pr-10 py-2.5 bg-white text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E1A1E] focus:border-[#3E1A1E] shadow-2xs text-zinc-800 placeholder-zinc-400 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchSuggestions([]);
                setIsSearchOpen(false);
              }}
              className="absolute right-3 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isSearching && (
            <div className="absolute right-10">
              <Loader2 className="w-4 h-4 animate-spin text-[#C6A15D]" />
            </div>
          )}
        </div>

        {/* Suggestion Dropdown */}
        {isSearchOpen && searchSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#C6A15D]/40 rounded-lg shadow-xl z-[1000] max-h-60 overflow-y-auto divide-y divide-zinc-100">
            {searchSuggestions.map((item, idx) => (
              <button
                key={`${item.name}-${idx}`}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full px-4 py-2.5 text-left hover:bg-[#DFC89D]/10 flex items-center justify-between gap-3 text-xs transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-800 truncate">{item.name}</p>
                  <p className="text-[10px] text-zinc-500">{item.city}, {item.state}{item.pincode ? ` - ${item.pincode}` : ''}</p>
                </div>
                {item.pincode && (
                  <span className="text-[10px] font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-bold">
                    {item.pincode}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick 1-Tap Major City Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
        <span className="text-zinc-500 font-semibold shrink-0">Quick Jumps:</span>
        {[
          { label: 'Delhi NCR', lat: 28.6304, lng: 77.2177 },
          { label: 'Mumbai', lat: 19.0596, lng: 72.8295 },
          { label: 'Bengaluru', lat: 12.9784, lng: 77.6408 },
          { label: 'Jaipur', lat: 26.9124, lng: 75.7873 },
          { label: 'Hyderabad', lat: 17.4319, lng: 78.4073 },
          { label: 'Kolkata', lat: 22.5519, lng: 88.3524 },
          { label: 'Chennai', lat: 13.0418, lng: 80.2341 }
        ].map((city) => (
          <button
            key={city.label}
            type="button"
            onClick={() => {
              setIsGpsActive(false);
              setGpsAccuracy(null);
              if (leafletAccuracyCircleRef.current) {
                leafletAccuracyCircleRef.current.remove();
                leafletAccuracyCircleRef.current = null;
              }
              handleCoordinateChange(city.lat, city.lng, true);
            }}
            className="shrink-0 px-2.5 py-1 rounded-full bg-white hover:bg-[#3E1A1E] hover:text-[#DFC89D] text-zinc-700 border border-zinc-200 transition-colors font-medium shadow-2xs"
          >
            {city.label}
          </button>
        ))}
      </div>

      {/* Interactive High-Definition Live Map */}
      <div className="relative rounded-xl overflow-hidden border-2 border-[#C6A15D]/40 bg-zinc-100 shadow-md">
        
        {/* Real Leaflet Map Canvas */}
        <div ref={mapElementRef} className="w-full h-72 sm:h-80 z-0" />

        {/* Map Floating Instruction Pill */}
        <div className="absolute top-2.5 left-2.5 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] text-zinc-800 font-medium shadow-md border border-[#C6A15D]/30 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#3E1A1E]" />
          <span>Drag pin or click map to set location</span>
        </div>

        {/* Floating Center On My GPS Crosshair Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocatingGPS}
          title="Use Current Location"
          className="absolute bottom-6 right-3 z-[400] bg-white hover:bg-[#3E1A1E] text-zinc-800 hover:text-[#DFC89D] p-3 rounded-full shadow-xl border border-[#C6A15D]/50 transition-all hover:scale-105 active:scale-95 flex items-center justify-center group"
        >
          {isLocatingGPS ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#C6A15D]" />
          ) : (
            <Crosshair className="w-5 h-5 text-[#800020] group-hover:text-[#DFC89D] transition-colors" />
          )}
        </button>

        {/* Loading Overlay while Reverse Geocoding */}
        {isGeocoding && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-[500]">
            <div className="px-4 py-2 bg-white rounded-lg shadow-xl border border-[#C6A15D]/50 flex items-center gap-2.5 text-xs font-semibold text-[#3E1A1E]">
              <Loader2 className="w-4 h-4 animate-spin text-[#C6A15D]" />
              <span>Fetching location details...</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Address Preview & Confirmation Card */}
      {geocodedAddress && (
        <div className="p-4 bg-white rounded-xl border border-[#C6A15D]/40 shadow-sm space-y-3 animate-fadeIn">
          
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#3E1A1E] bg-[#DFC89D]/20 px-2 py-0.5 rounded border border-[#C6A15D]/30">
                <MapPin className="w-3 h-3 text-[#3E1A1E]" /> Selected Location
              </span>
              {isGpsActive && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                  ✓ GPS Located
                </span>
              )}
            </div>
          </div>

          <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200/70 space-y-1">
            <p className="font-serif text-sm font-bold text-zinc-900 leading-snug">
              {geocodedAddress.street || geocodedAddress.locality || geocodedAddress.city}
            </p>
            <p className="text-xs text-zinc-600">
              <span className="font-semibold text-zinc-800">{geocodedAddress.city}</span>, {geocodedAddress.state}
              {geocodedAddress.pincode ? (
                <>
                  {' '}—{' '}
                  <span className="font-mono font-bold text-[#3E1A1E] bg-white px-1.5 py-0.5 rounded border border-amber-300">
                    PIN: {geocodedAddress.pincode}
                  </span>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleConfirmLocation}
              className={`w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
                isConfirmed
                  ? 'bg-emerald-700 text-white shadow-emerald-700/20'
                  : 'bg-[#3E1A1E] hover:bg-[#522429] text-[#DFC89D] border border-[#C6A15D]/60 hover:shadow-lg'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isConfirmed ? 'Location Confirmed ✓' : 'Confirm Location & Enter Address Details'}</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

export default DeliveryLocationPicker;
