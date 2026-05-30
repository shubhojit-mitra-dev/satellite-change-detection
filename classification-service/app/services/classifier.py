import os
import joblib
import numpy as np

# Load the trained RandomForest model globally so it's only loaded once in memory
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.joblib')
try:
    classifier_model = joblib.load(MODEL_PATH)
except Exception as e:
    classifier_model = None
    print(f"Failed to load model.joblib: {e}")

def classify_deltas(delta_array):
    """
    Classifies a list of NDVI delta values into predefined categories using
    a pre-trained RandomForestClassifier.
    
    Returns:
        dict: A dictionary containing the percentage breakdown of each class
              and the individual label for each pixel.
    """
    labels = []
    counts = {
        'crop_growth': 0,
        'crop_stress': 0,
        'significant_change': 0,
        'no_change': 0
    }
    
    total_pixels = len(delta_array)
    if total_pixels == 0:
        return {
            "percentages": {k: 0.0 for k in counts.keys()},
            "labels": labels
        }
    
    # Use the ML model if available
    if classifier_model is not None:
        # Predict all pixels in a single vectorized batch
        X = np.array(delta_array).reshape(-1, 1)
        predictions = classifier_model.predict(X)
        labels = predictions.tolist()
        
        for label in labels:
            if label in counts:
                counts[label] += 1
            else:
                counts[label] = 1 # Fallback just in case
    else:
        # Fallback to if/else rules if model missing
        for delta in delta_array:
            if delta > 0.15:
                label = 'crop_growth'
            elif delta < -0.15:
                label = 'crop_stress'
            elif 0.10 < abs(delta) <= 0.15:
                label = 'significant_change'
            else:
                label = 'no_change'
            labels.append(label)
            counts[label] += 1
            
    percentages = {
        label: round((count / total_pixels) * 100, 2)
        for label, count in counts.items()
    }
    
    return {
        "percentages": percentages,
        "labels": labels
    }
