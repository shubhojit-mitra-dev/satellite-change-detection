import { Platform } from 'react-native';

// Use 10.0.2.2 for Android emulator to hit host localhost, otherwise use localhost
const BASE_URL = Platform.OS === 'android' ? 'http://192.168.1.6:8080' : 'http://localhost:8080';

export async function getFields() {
  try {
    const response = await fetch(`${BASE_URL}/api/data/fields`);
    if (!response.ok) {
      throw new Error(`Failed to fetch fields: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getFields:', error);
    throw error;
  }
}

export async function getChangeMap(fieldId: string, date1: string, date2: string) {
  try {
    const response = await fetch(`${BASE_URL}/api/change/${fieldId}/${date1}/${date2}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch change map: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getChangeMap:', error);
    throw error;
  }
}

export async function getAlerts(fieldId: string) {
  try {
    const response = await fetch(`${BASE_URL}/api/alerts/${fieldId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch alerts: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getAlerts:', error);
    throw error;
  }
}

export async function acknowledgeAlert(alertId: string) {
  try {
    const response = await fetch(`${BASE_URL}/api/alerts/acknowledge/${alertId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to acknowledge alert: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in acknowledgeAlert:', error);
    throw error;
  }
}

export async function triggerIngestion(
  fieldId: string,
  lonMin: number,
  latMin: number,
  lonMax: number,
  latMax: number,
  date1: string,
  date2: string
) {
  try {
    const response = await fetch(`${BASE_URL}/api/ingest/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fieldId,
        lonMin,
        latMin,
        lonMax,
        latMax,
        date1,
        date2,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to trigger ingestion: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in triggerIngestion:', error);
    throw error;
  }
}