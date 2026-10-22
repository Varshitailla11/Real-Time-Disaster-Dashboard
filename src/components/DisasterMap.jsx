
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";


// Fix Leaflet marker icons in React/Vite
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
});


function DisasterMap({ earthquakes = [], disasters = [] }) {

  const earthquakeMarkers = earthquakes.filter(
    (earthquake) =>
      earthquake.latitude !== null &&
      earthquake.longitude !== null
  );

  const disasterMarkers = disasters.filter(
    (disaster) =>
      disaster.latitude !== null &&
      disaster.longitude !== null
  );


  return (
    <div className="disaster-map-container">

      <MapContainer
        center={[20, 78]}
        zoom={4}
        scrollWheelZoom={true}
        className="disaster-map"
      >

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />


        {/* Earthquake markers */}

        {earthquakeMarkers.map((earthquake) => (

          <Marker
            key={`earthquake-${earthquake.id}`}
            position={[
              earthquake.latitude,
              earthquake.longitude
            ]}
          >

            <Popup>

              <strong>🌍 Earthquake</strong>

              <br />

              <strong>
                Magnitude:
              </strong>{" "}
              {earthquake.magnitude}

              <br />

              <strong>
                Location:
              </strong>{" "}
              {earthquake.place}

            </Popup>

          </Marker>

        ))}


        {/* GDACS disaster markers */}

        {disasterMarkers.map((disaster, index) => (

          <Marker
            key={`disaster-${disaster.id || index}`}
            position={[
              disaster.latitude,
              disaster.longitude
            ]}
          >

            <Popup>

              <strong>
                🚨 {disaster.type}
              </strong>

              <br />

              <strong>
                Event:
              </strong>{" "}
              {disaster.title}

              <br />

              <strong>
                Country:
              </strong>{" "}
              {disaster.country}

              <br />

              <strong>
                Alert:
              </strong>{" "}
              {disaster.alert_level}

            </Popup>

          </Marker>

        ))}

      </MapContainer>


      {/* Map legend */}

      <div className="map-legend">

        <div className="map-legend-title">
          Live Disaster Map
        </div>

        <div className="map-legend-item">
          🌍 Earthquakes
        </div>

        <div className="map-legend-item">
          🚨 GDACS Disasters
        </div>

      </div>

    </div>
  );
}


export default DisasterMap;