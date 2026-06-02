import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
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

export default function TransitMap({ buses, center = [33.5731, -7.5898], zoom = 12, onSelectBus }) {
  const markers = buses.filter((bus) => bus.latitude && bus.longitude);

  return (
    <div className="map-shell">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
