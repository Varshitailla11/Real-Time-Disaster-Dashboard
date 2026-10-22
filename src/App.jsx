import { useEffect, useState } from "react";
import "./App.css";
import DisasterMap from "./components/DisasterMap";

const BACKEND_URL = "http://127.0.0.1:5000";

function App() {
  const [report, setReport] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // =========================================================
  // SAVED AI REPORTS
  // =========================================================

  const [recentReports, setRecentReports] = useState(() => {
    try {
      const savedReports = localStorage.getItem(
        "disasterwatch_reports"
      );

      return savedReports ? JSON.parse(savedReports) : [];
    } catch (error) {
      console.error(
        "Unable to load saved reports:",
        error
      );

      return [];
    }
  });

  // =========================================================
  // LIVE EARTHQUAKE STATES
  // =========================================================

  const [earthquakes, setEarthquakes] = useState([]);
  const [earthquakeLoading, setEarthquakeLoading] =
    useState(true);
  const [earthquakeError, setEarthquakeError] =
    useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // =========================================================
  // LIVE GDACS DISASTER STATES
  // =========================================================

  const [disasters, setDisasters] = useState([]);
  const [disasterLoading, setDisasterLoading] =
    useState(true);
  const [disasterError, setDisasterError] =
    useState("");
  const [disasterUpdated, setDisasterUpdated] =
    useState(null);

  // =========================================================
  // AI REPORT ANALYSIS
  // =========================================================

  const analyzeReport = async () => {
    if (!report.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `${BACKEND_URL}/predict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: report,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data = await response.json();

      setResult(data);

      const newReport = {
        id: Date.now(),
        text: data.text,
        prediction: data.prediction,
        disaster_probability:
          data.disaster_probability,
        non_disaster_probability:
          data.non_disaster_probability,
        time: new Date().toLocaleTimeString(),
      };

      setRecentReports((previous) => [
        newReport,
        ...previous,
      ]);
    } catch (error) {
      console.error(
        "Prediction error:",
        error
      );

      setResult({
        error:
          "Unable to connect to the AI backend. Make sure Flask is running on port 5000.",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LIVE EARTHQUAKE DATA
  // =========================================================

  const fetchEarthquakes = async () => {
    try {
      setEarthquakeError("");

      const response = await fetch(
        `${BACKEND_URL}/earthquakes`
      );

      if (!response.ok) {
        throw new Error(
          "Unable to fetch earthquake data"
        );
      }

      const data = await response.json();

      setEarthquakes(
        data.earthquakes || []
      );

      setLastUpdated(new Date());
    } catch (error) {
      console.error(
        "Earthquake API error:",
        error
      );

      setEarthquakeError(
        "Unable to fetch live earthquake data. Please check the backend connection."
      );
    } finally {
      setEarthquakeLoading(false);
    }
  };

  // =========================================================
  // LIVE GDACS DISASTER DATA
  // =========================================================

  const fetchDisasters = async () => {
    try {
      setDisasterError("");

      const response = await fetch(
        `${BACKEND_URL}/disasters`
      );

      if (!response.ok) {
        throw new Error(
          "Unable to fetch disaster data"
        );
      }

      const data = await response.json();

      setDisasters(
        data.disasters || []
      );

      setDisasterUpdated(new Date());
    } catch (error) {
      console.error(
        "GDACS API error:",
        error
      );

      setDisasterError(
        "Unable to fetch live disaster alerts. Please check the backend connection."
      );
    } finally {
      setDisasterLoading(false);
    }
  };

  // =========================================================
  // LOAD LIVE DATA + AUTO REFRESH
  // =========================================================

  useEffect(() => {
    fetchEarthquakes();
    fetchDisasters();

    const interval = setInterval(() => {
      fetchEarthquakes();
      fetchDisasters();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // SAVE REPORTS TO LOCAL STORAGE
  // =========================================================

  useEffect(() => {
    localStorage.setItem(
      "disasterwatch_reports",
      JSON.stringify(recentReports)
    );
  }, [recentReports]);

  // =========================================================
  // STATISTICS
  // =========================================================

  const totalReports =
    recentReports.length;

  const disasterReports =
    recentReports.filter(
      (item) =>
        item.prediction === "DISASTER"
    ).length;

  const safeReports =
    recentReports.filter(
      (item) =>
        item.prediction === "NON-DISASTER"
    ).length;

  // =========================================================
  // EARTHQUAKE TIME FORMATTER
  // =========================================================

  const formatEarthquakeTime = (
    timestamp
  ) => {
    if (!timestamp) {
      return "Unknown time";
    }

    return new Date(
      timestamp
    ).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // =========================================================
  // EARTHQUAKE MAGNITUDE CLASS
  // =========================================================

  const getMagnitudeClass = (
    magnitude
  ) => {
    if (magnitude >= 5) {
      return "magnitude-high";
    }

    if (magnitude >= 4) {
      return "magnitude-medium";
    }

    return "magnitude-low";
  };

  // =========================================================
  // EARTHQUAKE MAGNITUDE TEXT
  // =========================================================

  const getMagnitudeText = (
    magnitude
  ) => {
    if (magnitude >= 5) {
      return "HIGH";
    }

    if (magnitude >= 4) {
      return "MODERATE";
    }

    return "LOW";
  };

  // =========================================================
  // DISASTER DATE FORMATTER
  // =========================================================

  const formatDisasterDate = (
    date
  ) => {
    if (!date) {
      return "Unknown date";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date;
    }

    return parsedDate.toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  };

  // =========================================================
  // DISASTER ICON
  // =========================================================

  const getDisasterIcon = (
    type
  ) => {
    const disasterType =
      String(type || "")
        .toUpperCase();

    switch (disasterType) {
      case "FL":
        return "🌊";

      case "EQ":
        return "🌍";

      case "TC":
        return "🌀";

      case "VO":
        return "🌋";

      case "WF":
        return "🔥";

      case "DR":
        return "☀️";

      default:
        return "⚠️";
    }
  };

  // =========================================================
  // DISASTER TYPE NAME
  // =========================================================

  const getDisasterTypeName = (
    type
  ) => {
    const disasterType =
      String(type || "")
        .toUpperCase();

    switch (disasterType) {
      case "FL":
        return "Flood";

      case "EQ":
        return "Earthquake";

      case "TC":
        return "Tropical Cyclone";

      case "VO":
        return "Volcanic Activity";

      case "WF":
        return "Wildfire";

      case "DR":
        return "Drought";

      default:
        return "Disaster";
    }
  };

  // =========================================================
  // DISASTER ALERT CLASS
  // =========================================================

  const getAlertClass = (
    alertLevel
  ) => {
    const level =
      String(alertLevel || "")
        .toLowerCase();

    if (level.includes("red")) {
      return "alert-red";
    }

    if (level.includes("orange")) {
      return "alert-orange";
    }

    if (level.includes("green")) {
      return "alert-green";
    }

    return "alert-unknown";
  };

  // =========================================================
  // CLEAR REPORT
  // =========================================================

  const clearReport = () => {
    setReport("");
    setResult(null);
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="header">

        <div className="brand">

          <div className="brand-icon">
            DW
          </div>

          <div>
            <h1>
              DisasterWatch AI
            </h1>

            <p>
              Real-Time Disaster Information
              Aggregation
            </p>
          </div>

        </div>

        <div className="backend-status">

          <span className="status-dot"></span>

          AI Backend Connected

        </div>

      </header>


      {/* =====================================================
          MAIN DASHBOARD
      ====================================================== */}

      <main className="dashboard">

        {/* ===================================================
            WELCOME
        ==================================================== */}

        <section className="welcome-section">

          <div className="eyebrow">
            AI-POWERED DISASTER MONITORING
          </div>

          <h2>
            Welcome to{" "}
            <span>
              DisasterWatch AI
            </span>
          </h2>

          <p className="welcome-text">
            Analyze disaster-related reports
            using machine learning and monitor
            live disaster activity from
            trusted real-time data sources.
          </p>

        </section>


        {/* ===================================================
            STATISTICS
        ==================================================== */}

        <section className="stats-grid">

          <div className="stat-card">

            <div className="stat-icon reports-icon">
              #
            </div>

            <div>
              <p>Total Reports</p>

              <h3>
                {totalReports}
              </h3>
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon disaster-icon">
              !
            </div>

            <div>
              <p>Disasters Detected</p>

              <h3>
                {disasterReports}
              </h3>
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon safe-icon">
              ✓
            </div>

            <div>
              <p>
                Non-Disaster Reports
              </p>

              <h3>
                {safeReports}
              </h3>
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon ai-icon">
              AI
            </div>

            <div>
              <p>AI Model</p>

              <h3>
                Active
              </h3>
            </div>

          </div>

        </section>


        {/* ===================================================
            AI ANALYSIS
        ==================================================== */}

        <section className="content-grid">

          <div className="analysis-card">

            <div className="section-heading">

              <div>
                <h3>
                  Analyze Disaster Report
                </h3>
              </div>

              <span className="model-badge">
                ML MODEL
              </span>

            </div>

            <p className="section-description">
              Enter a report or message and let
              the trained machine-learning model
              determine whether it is related to
              a disaster.
            </p>

            <textarea
              value={report}
              onChange={(event) =>
                setReport(
                  event.target.value
                )
              }
              placeholder="Example: A powerful earthquake has struck Mumbai causing severe damage..."
            />

            <div className="analysis-actions">

              <button
                className="analyze-button"
                onClick={analyzeReport}
                disabled={
                  loading ||
                  !report.trim()
                }
              >

                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <span>→</span>
                    Analyze Report
                  </>
                )}

              </button>


              <button
                className="clear-button"
                onClick={clearReport}
              >
                Clear
              </button>

            </div>

          </div>


          {/* AI RESULT */}

          <div className="result-card">

            <div className="section-heading">

              <div>
                <h3>
                  AI Analysis Result
                </h3>
              </div>

            </div>


            {!result && (

              <div className="empty-result">

                <div className="empty-icon">
                  AI
                </div>

                <h4>
                  No analysis yet
                </h4>

                <p>
                  Submit a disaster report to
                  see the machine-learning
                  prediction and confidence.
                </p>

              </div>

            )}


            {result &&
              result.error && (

                <div className="backend-error">

                  <div className="error-symbol">
                    !
                  </div>

                  <h4>
                    Backend Connection Error
                  </h4>

                  <p>
                    {result.error}
                  </p>

                  <small>
                    Backend:{" "}
                    {BACKEND_URL}
                  </small>

                </div>

              )}


            {result &&
              !result.error && (

                <div className="prediction-result">

                  <div
                    className={`prediction-status ${
                      result.prediction ===
                      "DISASTER"
                        ? "danger"
                        : "safe"
                    }`}
                  >

                    <div className="prediction-symbol">

                      {result.prediction ===
                      "DISASTER"
                        ? "!"
                        : "✓"}

                    </div>

                    <div>

                      <span>
                        AI CLASSIFICATION
                      </span>

                      <strong>
                        {result.prediction}
                      </strong>

                    </div>

                  </div>


                  <div className="probability-section">

                    <div className="probability-header">

                      <span>
                        Disaster Probability
                      </span>

                      <strong>
                        {
                          result.disaster_probability
                        }%
                      </strong>

                    </div>


                    <div className="progress-bar">

                      <div
                        className="progress-fill disaster-progress"
                        style={{
                          width: `${result.disaster_probability}%`,
                        }}
                      ></div>

                    </div>


                    <div className="probability-header">

                      <span>
                        Non-Disaster Probability
                      </span>

                      <strong>
                        {
                          result.non_disaster_probability
                        }%
                      </strong>

                    </div>


                    <div className="progress-bar">

                      <div
                        className="progress-fill safe-progress"
                        style={{
                          width: `${result.non_disaster_probability}%`,
                        }}
                      ></div>

                    </div>

                  </div>


                  <div className="analyzed-report">

                    <span>
                      Analyzed Report
                    </span>

                    <p>
                      {result.text}
                    </p>

                  </div>

                </div>

              )}

          </div>

        </section>


        {/* ===================================================
            LIVE EARTHQUAKE ACTIVITY
        ==================================================== */}

        <section className="recent-section earthquake-section">

          <div className="section-heading recent-heading">

            <div>

              <h3>
                Live Earthquake Activity
              </h3>

              <p className="section-description">
                Real-time earthquake information
                retrieved from the USGS earthquake
                data service.
              </p>

            </div>


            <div className="earthquake-header-right">

              <span className="live-badge">

                <span className="live-dot"></span>

                LIVE

              </span>


              <button
                className="refresh-button"
                onClick={fetchEarthquakes}
                disabled={
                  earthquakeLoading
                }
              >
                ↻ Refresh
              </button>

            </div>

          </div>


          {lastUpdated &&
            !earthquakeLoading && (

              <div className="earthquake-updated">

                Last updated:
                {" "}
                {lastUpdated.toLocaleTimeString(
                  "en-IN"
                )}

                <span>
                  • Automatic refresh every
                  5 minutes
                </span>

              </div>

            )}


          {earthquakeLoading && (

            <div className="earthquake-loading">

              <span className="earthquake-spinner"></span>

              <p>
                Loading live earthquake data...
              </p>

            </div>

          )}


          {!earthquakeLoading &&
            earthquakeError && (

              <div className="earthquake-error">

                <div className="error-symbol">
                  !
                </div>

                <div>

                  <h4>
                    Live data unavailable
                  </h4>

                  <p>
                    {earthquakeError}
                  </p>

                </div>

              </div>

            )}


          {!earthquakeLoading &&
            !earthquakeError &&
            earthquakes.length === 0 && (

              <div className="no-reports">

                <div className="empty-icon">
                  ✓
                </div>

                <h4>
                  No earthquake records found
                </h4>

                <p>
                  The live earthquake service
                  did not return any records at
                  the moment.
                </p>

              </div>

            )}


          {!earthquakeLoading &&
            !earthquakeError &&
            earthquakes.length > 0 && (

              <div className="earthquake-list">

                {earthquakes.map(
                  (earthquake) => (

                    <div
                      className="earthquake-row"
                      key={earthquake.id}
                    >

                      <div
                        className={`earthquake-magnitude ${getMagnitudeClass(
                          earthquake.magnitude
                        )}`}
                      >

                        <strong>
                          {earthquake.magnitude !==
                            null &&
                          earthquake.magnitude !==
                            undefined
                            ? earthquake.magnitude.toFixed(
                                1
                              )
                            : "—"}
                        </strong>

                        <span>
                          MAG
                        </span>

                      </div>


                      <div className="earthquake-info">

                        <div className="earthquake-place">

                          <strong>
                            {earthquake.place ||
                              "Unknown location"}
                          </strong>


                          <span
                            className={`magnitude-label ${getMagnitudeClass(
                              earthquake.magnitude
                            )}`}
                          >
                            {getMagnitudeText(
                              earthquake.magnitude ||
                                0
                            )}
                          </span>

                        </div>


                        <div className="earthquake-meta">

                          <span>
                            🕐{" "}
                            {formatEarthquakeTime(
                              earthquake.time
                            )}
                          </span>


                          <span>
                            🌊 Depth:{" "}
                            {earthquake.depth !==
                              null &&
                            earthquake.depth !==
                              undefined
                              ? `${earthquake.depth.toFixed(
                                  1
                                )} km`
                              : "Unknown"}
                          </span>


                          <span>
                            📍{" "}
                            {earthquake.latitude !==
                              null &&
                            earthquake.longitude !==
                              null
                              ? `${earthquake.latitude.toFixed(
                                  2
                                )}, ${earthquake.longitude.toFixed(
                                  2
                                )}`
                              : "Coordinates unavailable"}
                          </span>

                        </div>

                      </div>


                      {earthquake.url && (

                        <a
                          className="earthquake-link"
                          href={
                            earthquake.url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View USGS ↗
                        </a>

                      )}

                    </div>

                  )
                )}

              </div>

            )}

        </section>


        {/* ===================================================
            LIVE GDACS DISASTER ALERTS
        ==================================================== */}

        <section className="recent-section disaster-alerts-section">

          <div className="section-heading recent-heading">

            <div>

              <h3>
                Live Disaster Alerts
              </h3>

              <p className="section-description">
                Real-time global disaster events
                retrieved from the GDACS disaster
                information service.
              </p>

            </div>


            <div className="earthquake-header-right">

              <span className="live-badge">

                <span className="live-dot"></span>

                LIVE

              </span>


              <button
                className="refresh-button"
                onClick={fetchDisasters}
                disabled={
                  disasterLoading
                }
              >
                ↻ Refresh
              </button>

            </div>

          </div>


          {/* LAST UPDATED */}

          {disasterUpdated &&
            !disasterLoading && (

              <div className="earthquake-updated">

                Last updated:
                {" "}
                {disasterUpdated.toLocaleTimeString(
                  "en-IN"
                )}

                <span>
                  • Automatic refresh every
                  5 minutes
                </span>

              </div>

            )}


          {/* LOADING */}

          {disasterLoading && (

            <div className="earthquake-loading">

              <span className="earthquake-spinner"></span>

              <p>
                Loading live disaster alerts...
              </p>

            </div>

          )}


          {/* ERROR */}

          {!disasterLoading &&
            disasterError && (

              <div className="earthquake-error">

                <div className="error-symbol">
                  !
                </div>

                <div>

                  <h4>
                    Live disaster data unavailable
                  </h4>

                  <p>
                    {disasterError}
                  </p>

                </div>

              </div>

            )}


          {/* NO DISASTERS */}

          {!disasterLoading &&
            !disasterError &&
            disasters.length === 0 && (

              <div className="no-reports">

                <div className="empty-icon">
                  ✓
                </div>

                <h4>
                  No disaster alerts found
                </h4>

                <p>
                  GDACS did not return any active
                  disaster events at the moment.
                </p>

              </div>

            )}


          {/* DISASTER LIST */}

          {!disasterLoading &&
            !disasterError &&
            disasters.length > 0 && (

              <div className="disaster-alert-list">

                {disasters.map(
                  (disaster) => (

                    <div
                      className={`disaster-alert-row ${getAlertClass(
                        disaster.alert_level
                      )}`}
                      key={
                        disaster.id ||
                        `${disaster.type}-${disaster.date}-${disaster.country}`
                      }
                    >

                      {/* ICON */}

                      <div
                        className={`disaster-alert-icon ${getAlertClass(
                          disaster.alert_level
                        )}`}
                      >

                        {getDisasterIcon(
                          disaster.type
                        )}

                      </div>


                      {/* INFORMATION */}

                      <div className="disaster-alert-info">

                        <div className="disaster-alert-title">

                          <strong>
                            {disaster.title ||
                              "Disaster event"}
                          </strong>

                          <span className="disaster-type-badge">

                            {getDisasterTypeName(
                              disaster.type
                            )}

                          </span>

                        </div>


                        <div className="disaster-alert-meta">

                          <span>
                            📍{" "}
                            {disaster.country ||
                              "Unknown location"}
                          </span>


                          <span>
                            🕐{" "}
                            {formatDisasterDate(
                              disaster.date
                            )}
                          </span>


                          <span>
                            🌐 GDACS
                          </span>

                        </div>

                      </div>


                      {/* ALERT LEVEL */}

                      <div
                        className={`disaster-alert-level ${getAlertClass(
                          disaster.alert_level
                        )}`}
                      >

                        <span className="alert-level-dot"></span>

                        <div>

                          <small>
                            ALERT LEVEL
                          </small>

                          <strong>
                            {disaster.alert_level ||
                              "Unknown"}
                          </strong>

                        </div>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

        </section>


        {/* ===================================================
            LIVE DISASTER MAP
        ==================================================== */}

        <section className="recent-section disaster-map-section">

          <div className="section-heading recent-heading">

            <div>

              <h3>
                Live Disaster Map
              </h3>

              <p className="section-description">
                Interactive map showing live
                earthquake activity and GDACS
                disaster events.
              </p>

            </div>


            <span className="live-badge">

              <span className="live-dot"></span>

              LIVE

            </span>

          </div>


          <DisasterMap
            earthquakes={earthquakes}
            disasters={disasters}
          />

        </section>


        {/* ===================================================
            RECENT AI REPORTS
        ==================================================== */}

        <section className="recent-section">

          <div className="section-heading recent-heading">

            <div>

              <h3>
                Recent AI Reports
              </h3>

            </div>

            <span className="report-count">
              {recentReports.length} reports
            </span>

          </div>


          {recentReports.length === 0 && (

            <div className="no-reports">

              <div className="empty-icon">
                #
              </div>

              <h4>
                No reports analyzed yet
              </h4>

              <p>
                Your analyzed reports will
                appear here.
              </p>

            </div>

          )}


          {recentReports.length > 0 && (

            <div className="reports-list">

              {recentReports.map(
                (item) => (

                  <div
                    className="report-row"
                    key={item.id}
                  >

                    <div
                      className={`report-status ${
                        item.prediction ===
                        "DISASTER"
                          ? "report-danger"
                          : "report-safe"
                      }`}
                    >

                      {item.prediction ===
                      "DISASTER"
                        ? "!"
                        : "✓"}

                    </div>


                    <div className="report-content">

                      <p>
                        {item.text}
                      </p>

                      <span>
                        Analyzed at{" "}
                        {item.time}
                      </span>

                    </div>


                    <div className="report-probability">

                      <strong>

                        {item.prediction ===
                        "DISASTER"
                          ? item.disaster_probability
                          : item.non_disaster_probability}

                        %

                      </strong>

                      <span>
                        confidence
                      </span>

                    </div>


                    <div
                      className={`report-label ${
                        item.prediction ===
                        "DISASTER"
                          ? "label-danger"
                          : "label-safe"
                      }`}
                    >

                      {item.prediction}

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default App;