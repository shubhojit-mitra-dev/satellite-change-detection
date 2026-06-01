import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { getFields, triggerIngestion } from '../service/api';

type Field = {
  id: string;
  name: string;
  createdAt: string;
};

export default function FieldListScreen() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const data = await getFields();
      setFields(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch fields.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanNow = async () => {
    try {
      // Triggering with hardcoded Tumkur coords for the demo
      await triggerIngestion(
        '1', // Hardcoded Tumkur field ID
        76.0, 
        13.0, 
        77.0, 
        14.0, 
        '2024-01-06',
        '2024-01-21'
      );
      Alert.alert('Success', 'Ingestion triggered successfully for Tumkur field!');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to trigger ingestion.');
    }
  };

  const renderItem = ({ item }: { item: Field }) => {
    const formattedDate = new Date(item.createdAt).toLocaleDateString();

    return (
      <TouchableOpacity
        className="bg-slate-800 rounded-xl p-4 mx-4 my-2 flex-row justify-between items-center"
        onPress={() =>
          router.push({
            pathname: '/change-map',
            params: {
              fieldId: item.id,
              fieldName: item.name,
              date1: '2024-01-06',
              date2: '2024-01-21',
            },
          })
        }
      >
        <View>
          <Text className="text-white text-lg font-bold">{item.name}</Text>
          <Text className="text-slate-400 text-sm">Last scanned: {formattedDate}</Text>
        </View>
        <View className="bg-green-500 rounded-full px-3 py-1">
          <Text className="text-white text-xs font-bold">HEALTHY</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-slate-900">
      <Stack.Screen 
        options={{ 
          title: 'Fields',
          headerRight: () => (
            <TouchableOpacity onPress={handleScanNow}>
              <Text className="text-blue-400 text-base font-bold">Scan Now</Text>
            </TouchableOpacity>
          )
        }} 
      />
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      ) : (
        <FlatList
          data={fields}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 16 }}
          ListEmptyComponent={
            <Text className="text-slate-400 text-center mt-10">No fields found.</Text>
          }
        />
      )}
    </View>
  );
}