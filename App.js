import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Keyboard, Button } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { Appbar, Searchbar } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { API_KEY } from '@env';


export default function App() {
  const [location, setLocation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityName, setCityName] = useState('');
  const [searchedLocation, setSearchedLocation] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  const handleSearch = async () => {
    if (!cityName) {
      return;
    }

    Keyboard.dismiss(); // Dismiss keyboard after search
    await fetchWeatherDataByCity(cityName);
    setModalVisible(true);
  };

  const handleMapPress = async (e) => {
    const { coordinate } = e.nativeEvent;
    await fetchWeatherData(coordinate.latitude, coordinate.longitude);
    setModalVisible(true);
  };

  const fetchWeatherDataByCity = async (city) => {
    try {
      const response = await axios.get(
        `http://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}`
      );
      setWeatherData(response.data);
      setSelectedDayIndex(0); // Reset selected day index to the first day
    } catch (error) {
      console.error('Error fetching weather data:', error);
    }
  };

  const fetchWeatherData = async (latitude, longitude) => {
    try {
      const response = await axios.get(
        `http://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}`
      );
      setWeatherData(response.data);
      setSelectedDayIndex(0); // Reset selected day index to the first day
    } catch (error) {
      console.error('Error fetching weather data:', error);
    }
  };

  const renderWeatherData = () => {
    if (!weatherData || !weatherData.list || weatherData.list.length === 0) {
      return <Text>No weather data available</Text>;
    }

    const uniqueDates = [...new Set(weatherData.list.map(item => formatDate(item.dt)))];

    if (selectedDayIndex < 0) {
      setSelectedDayIndex(0);
    } else if (selectedDayIndex >= uniqueDates.length) {
      setSelectedDayIndex(uniqueDates.length - 1);
    }

    const selectedDayDate = uniqueDates[selectedDayIndex];
    const filteredData = weatherData.list.filter(
      item => formatDate(item.dt) === selectedDayDate
    );

    return (
      <>
        <View style={styles.weatherItem}>
          <Text style={styles.dayText}>Date: {selectedDayDate}</Text>
          {filteredData.map((item, index) => (
            <View key={index}>
              <Text style={styles.timeText}>{formatTime(item.dt)}</Text>
              <Text style={styles.weatherDescription}>{item.weather[0].description}</Text>
              <Text style={styles.temperature}>Temperature: {Math.round(item.main.temp - 273.15)}°C</Text>
            </View>
          ))}
        </View>
        <View style={styles.navigationButtons}>
          <Button
            title="Previous Day"
            onPress={() => setSelectedDayIndex(selectedDayIndex - 1)}
            disabled={selectedDayIndex === 0}
          />
          <Button
            title="Next Day"
            onPress={() => setSelectedDayIndex(selectedDayIndex + 1)}
            disabled={selectedDayIndex === uniqueDates.length - 1}
          />
        </View>
      </>
    );
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000).toLocaleDateString();
    return date;
  };

  const formatTime = (timestamp) => {
    const time = new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return time;
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.Content title="Weather App" />
        </Appbar.Header>

        <Text style={styles.instructionText}>Search or click from the map to see next 5 days weather</Text>

        <Searchbar
          placeholder="Enter city name..."
          onChangeText={setCityName}
          value={cityName}
          style={styles.searchBar}
          iconColor="#6200EE"
          inputStyle={{ fontSize: 16 }}
          onSubmitEditing={handleSearch}
        />

        <View style={styles.mapContainer}>
          {location && (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: searchedLocation?.latitude || (location?.coords.latitude || 0),
                longitude: searchedLocation?.longitude || (location?.coords.longitude || 0),
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              onPress={handleMapPress}
            >
              {/* Marker for searched location */}
              {searchedLocation && (
                <Marker
                  coordinate={{
                    latitude: searchedLocation.latitude,
                    longitude: searchedLocation.longitude,
                  }}
                  title="Searched Location"
                />
              )}

              {/* Marker for current location */}
              {location && (
                <Marker
                  coordinate={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }}
                  title="You are here"
                />
              )}
            </MapView>

          )}
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Weather at selected location:</Text>
              {weatherData && renderWeatherData()}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  instructionText: {
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBar: {
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F6F6F6',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  closeButtonText: {
    fontSize: 16,
    color: 'blue',
  },
  weatherItem: {
    marginBottom: 10,
  },
  dayText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  weatherDescription: {
    fontSize: 14,
  },
  temperature: {
    fontSize: 14,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
});
