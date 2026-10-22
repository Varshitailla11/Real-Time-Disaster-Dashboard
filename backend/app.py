from flask import Flask, request, jsonify
from flask_cors import CORS

import joblib
import os
import urllib.request
import json
from datetime import datetime, timedelta, timezone

from processor import process_reports


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)
CORS(app)


# =========================================================
# PROJECT PATHS
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "disaster_model.pkl"
)

VECTORIZER_PATH = os.path.join(
    BASE_DIR,
    "models",
    "tfidf_vectorizer.pkl"
)


# =========================================================
# LOAD TRAINED AI MODEL
# =========================================================

model = joblib.load(MODEL_PATH)
tfidf = joblib.load(VECTORIZER_PATH)


# =========================================================
# HOME
# =========================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "message":
        "Real-Time Disaster AI Backend is running successfully!"
    })


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "status": "healthy",
        "model": "loaded",
        "service": "Real-Time Disaster AI"
    })


# =========================================================
# AI PREDICTION
# =========================================================

@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    if not data or "text" not in data:

        return jsonify({
            "error":
            "Please provide disaster report text."
        }), 400

    report = data["text"]

    # Convert text into TF-IDF features
    report_vector = tfidf.transform([report])

    # AI prediction
    prediction = model.predict(report_vector)[0]

    # Prediction probabilities
    probabilities = model.predict_proba(report_vector)[0]

    disaster_probability = probabilities[1] * 100
    non_disaster_probability = probabilities[0] * 100

    result = {

        "text": report,

        "prediction":
        "DISASTER"
        if prediction == 1
        else "NON-DISASTER",

        "disaster_probability":
        round(disaster_probability, 2),

        "non_disaster_probability":
        round(non_disaster_probability, 2)
    }

    return jsonify(result)


# =========================================================
# PROCESS MULTIPLE REPORTS
# =========================================================

@app.route(
    "/process-reports",
    methods=["POST"]
)
def process_multiple_reports():

    data = request.get_json()

    if not data or "reports" not in data:

        return jsonify({
            "error":
            "Please provide a list of reports."
        }), 400

    reports = data["reports"]

    results = process_reports(reports)

    return jsonify({

        "total_reports": len(results),

        "results": results

    })


# =========================================================
# LIVE EARTHQUAKE DATA - USGS
# =========================================================

@app.route(
    "/earthquakes",
    methods=["GET"]
)
def get_earthquakes():

    url = (
        "https://earthquake.usgs.gov/"
        "earthquakes/feed/v1.0/summary/"
        "2.5_day.geojson"
    )

    try:

        with urllib.request.urlopen(
            url,
            timeout=10
        ) as response:

            data = response.read().decode(
                "utf-8"
            )

        earthquake_data = json.loads(data)

        earthquakes = []

        for feature in earthquake_data.get(
            "features",
            []
        ):

            properties = feature.get(
                "properties",
                {}
            )

            geometry = feature.get(
                "geometry",
                {}
            )

            coordinates = geometry.get(
                "coordinates",
                [None, None, None]
            )

            earthquake = {

                "id":
                feature.get("id"),

                "magnitude":
                properties.get("mag"),

                "place":
                properties.get("place"),

                "time":
                properties.get("time"),

                "url":
                properties.get("url"),

                "longitude":
                coordinates[0],

                "latitude":
                coordinates[1],

                "depth":
                coordinates[2]
            }

            earthquakes.append(
                earthquake
            )

        return jsonify({

            "source": "USGS",

            "total":
            len(earthquakes),

            "earthquakes":
            earthquakes
        })

    except Exception as error:

        return jsonify({

            "error":
            "Unable to fetch live earthquake data.",

            "details":
            str(error)

        }), 500


# =========================================================
# LIVE DISASTER DATA - GDACS + AI
# =========================================================

@app.route(
    "/disasters",
    methods=["GET"]
)
def get_disasters():

    try:

        # -------------------------------------------------
        # Fetch latest GDACS events
        # -------------------------------------------------

        url = (
            "https://www.gdacs.org/"
            "gdacsapi/api/Events/"
            "geteventlist/latest"
        )

        with urllib.request.urlopen(
            url,
            timeout=60
        ) as response:

            data = response.read().decode(
                "utf-8"
            )

        gdacs_data = json.loads(data)


        # -------------------------------------------------
        # Extract event list
        # -------------------------------------------------

        if isinstance(
            gdacs_data,
            dict
        ):

            raw_events = (
                gdacs_data.get("features")
                or gdacs_data.get("data")
                or gdacs_data.get("events")
                or []
            )

        elif isinstance(
            gdacs_data,
            list
        ):

            raw_events = gdacs_data

        else:

            raw_events = []


        disasters = []

        # -------------------------------------------------
        # Current time
        # -------------------------------------------------

        now = datetime.now(timezone.utc)

        # -------------------------------------------------
        # Only keep events from the last 7 days
        # -------------------------------------------------

        recent_limit = now - timedelta(days=7)


        # =================================================
        # PROCESS EACH GDACS EVENT
        # =================================================

        for event in raw_events:

            properties = event.get(
                "properties",
                event
            )

            geometry = event.get(
                "geometry",
                {}
            )

            coordinates = geometry.get(
                "coordinates",
                []
            )


            # -------------------------------------------------
            # Disaster type
            # -------------------------------------------------

            disaster_type = (

                properties.get("eventtype")

                or properties.get("eventType")

                or properties.get("type")

                or "Unknown"
            )


            # -------------------------------------------------
            # Event ID
            # -------------------------------------------------

            event_id = (

                properties.get("eventid")

                or properties.get("eventId")

                or event.get("id")
            )


            # -------------------------------------------------
            # Title
            # -------------------------------------------------

            title = (

                properties.get("name")

                or properties.get("description")

                or properties.get("title")

                or "Disaster event"
            )


            # -------------------------------------------------
            # Country
            # -------------------------------------------------

            country = (

                properties.get("country")

                or properties.get("countryname")

                or "Unknown"
            )


            # -------------------------------------------------
            # Alert level
            # -------------------------------------------------

            alert_level = (

                properties.get("alertlevel")

                or properties.get("alertLevel")

                or "Unknown"
            )


            # -------------------------------------------------
            # Event date
            # -------------------------------------------------

            event_date = (

                properties.get("fromdate")

                or properties.get("fromDate")

                or properties.get("date")
            )


            # =================================================
            # RECENT EVENT FILTER
            # =================================================

            if event_date:

                try:

                    date_string = str(
                        event_date
                    ).strip()

                    # Handle ISO dates ending with Z
                    if date_string.endswith("Z"):

                        date_string = (
                            date_string[:-1]
                            + "+00:00"
                        )

                    event_datetime = (
                        datetime.fromisoformat(
                            date_string
                        )
                    )

                    # If date has no timezone,
                    # assume UTC
                    if event_datetime.tzinfo is None:

                        event_datetime = (
                            event_datetime.replace(
                                tzinfo=timezone.utc
                            )
                        )

                    # Remove events older than 7 days
                    if event_datetime < recent_limit:

                        continue

                except Exception:

                    # If GDACS gives an unexpected
                    # date format, keep the event
                    # instead of deleting valid data.
                    pass


            # -------------------------------------------------
            # Coordinates
            # -------------------------------------------------

            latitude = None

            longitude = None

            if (
                isinstance(
                    coordinates,
                    list
                )
                and
                len(coordinates) >= 2
            ):

                longitude = coordinates[0]

                latitude = coordinates[1]


            # =================================================
            # CREATE TEXT FOR ML MODEL
            # =================================================

            ml_text = (
                f"{disaster_type} "
                f"in {country}. "
                f"{title}. "
                f"Alert level {alert_level}."
            )


            # =================================================
            # SEND GDACS EVENT THROUGH ML MODEL
            # =================================================

            report_vector = tfidf.transform(
                [ml_text]
            )

            prediction = model.predict(
                report_vector
            )[0]

            probabilities = (
                model.predict_proba(
                    report_vector
                )[0]
            )


            disaster_probability = (
                probabilities[1] * 100
            )

            non_disaster_probability = (
                probabilities[0] * 100
            )


            # =================================================
            # STORE COMPLETE EVENT
            # =================================================

            disasters.append({

                "id":
                event_id,

                "type":
                disaster_type,

                "title":
                title,

                "country":
                country,

                "alert_level":
                alert_level,

                "date":
                event_date,

                "latitude":
                latitude,

                "longitude":
                longitude,

                "source":
                "GDACS",

                # -----------------------------
                # AI RESULTS
                # -----------------------------

                "ml_text":
                ml_text,

                "ai_prediction":
                "DISASTER"
                if prediction == 1
                else "NON-DISASTER",

                "ai_disaster_probability":
                round(
                    disaster_probability,
                    2
                ),

                "ai_non_disaster_probability":
                round(
                    non_disaster_probability,
                    2
                )
            })


        # =================================================
        # FINAL RESPONSE
        # =================================================

        return jsonify({

            "source":
            "GDACS",

            "total":
            len(disasters),

            "filter":
            "Events from the last 7 days",

            "ai_processed":
            True,

            "disasters":
            disasters
        })


    except Exception as error:

        return jsonify({

            "error":
            "Unable to fetch live GDACS disaster data.",

            "details":
            str(error)

        }), 500


# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )