def classify_deltas(delta_array):
    """
    Classifies a list of NDVI delta values into predefined categories.
    
    Categories:
    - crop_growth: delta > 0.15
    - crop_stress: delta < -0.15
    - significant_change: 0.10 < |delta| <= 0.15
    - no_change: |delta| <= 0.10
    
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
