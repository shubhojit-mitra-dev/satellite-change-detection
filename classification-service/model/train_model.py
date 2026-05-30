import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
import os

def get_label(delta):
    if delta > 0.15:
        return 'crop_growth'
    elif delta < -0.15:
        return 'crop_stress'
    elif 0.10 < abs(delta) <= 0.15:
        return 'significant_change'
    else:
        return 'no_change'

def main():
    print("Generating synthetic data...")
    # Generate 100,000 random delta values between -1.0 and 1.0
    X_train = np.random.uniform(-1.0, 1.0, 100000).reshape(-1, 1)
    
    # Label the data based on the rules
    y_train = np.array([get_label(float(x)) for x in X_train])
    
    print("Training RandomForestClassifier...")
    clf = RandomForestClassifier(n_estimators=10, random_state=42, max_depth=5)
    clf.fit(X_train, y_train)
    
    print("Saving model to app/services/model.joblib...")
    model_path = os.path.join(os.path.dirname(__file__), '..','app', 'services', 'model.joblib')
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(clf, model_path)
    
    print(f"Model successfully saved to {model_path}!")

if __name__ == "__main__":
    main()
