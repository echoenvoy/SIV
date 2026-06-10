import { MapContainer, Marker, Popup, TileLayer, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const busIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function TransitMap({ buses, stations = [], center = [33.5731, -7.5898], zoom = 12, onSelectBus }) {
  const markers = buses.filter((bus) => bus.latitude && bus.longitude);

  // Group stations by line ID to draw path lines separately for each line
  const stationsByLine = {};
  for (const station of stations) {
    const lineId = station.ligne_id || 'unassigned';
    if (!stationsByLine[lineId]) {
      stationsByLine[lineId] = [];
    }
    stationsByLine[lineId].push(station);
  }

  return (
    <div className="map-shell">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {Object.entries(stationsByLine).map(([lineId, lineStations]) => {
          const coords = [...lineStations]
            .sort((a, b) => a.ordre - b.ordre)
            .map((station) => [Number(station.latitude), Number(station.longitude)]);
          const lineColor = lineStations[0]?.ligne_couleur || '#3B82F6';

          return coords.length > 1 ? (
            <Polyline
              key={`polyline-line-${lineId}`}
              positions={coords}
              pathOptions={{ color: lineColor, weight: 4, opacity: 0.8 }}
            />
          ) : null;
        })}

        {stations.map((station) => {
          const lineColor = station.ligne_couleur || '#3B82F6';
          return (
            <CircleMarker
              key={`station-${station.id}`}
              center={[Number(station.latitude), Number(station.longitude)]}
              radius={6}
              pathOptions={{ fillColor: lineColor, color: '#FFFFFF', weight: 2, fillOpacity: 1 }}
            >
              <Popup>
                <strong>{station.nom}</strong>
                <p>Order: {station.ordre}</p>
              </Popup>
            </CircleMarker>
          );
        })}

        {markers.map((bus) => (
          <Marker
            key={bus.id}
            position={[Number(bus.latitude), Number(bus.longitude)]}
            icon={busIcon}
            eventHandlers={{ click: () => onSelectBus?.(bus.id) }}
          >
            <Popup>
              <strong>{bus.numero}</strong>
              <div>{bus.ligne_nom || 'No line'}</div>
              <div>Status: {bus.etat}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
