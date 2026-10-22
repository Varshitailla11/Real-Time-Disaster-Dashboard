import joblib
import os


# Find the project root directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load the trained AI model
MODEL_PATH = os.path.join(BASE_DIR, "models", "disaster_model.pkl")

# Load TF-IDF vectorizer
VECTORIZER_PATH = os.path.join(BASE_DIR, "models", "tfidf_vectorizer.pkl")

model = joblib.load(MODEL_PATH)
tfidf = joblib.load(VECTORIZER_PATH)


def process_reports(reports):

    results = []

    for report in reports:

        # Convert report into TF-IDF features
        report_vector = tfidf.transform([report])

        # Predict
        prediction = model.predict(report_vector)[0]

        # Probability
        probabilities = model.predict_proba(report_vector)[0]

        disaster_probability = probabilities[1] * 100
        non_disaster_probability = probabilities[0] * 100

        result = {
            "text": report,
            "prediction": "DISASTER" if prediction == 1 else "NON-DISASTER",
            "disaster_probability": round(disaster_probability, 2),
            "non_disaster_probability": round(non_disaster_probability, 2)
        }

        results.append(result)

    return results