package com.authentiq.util;

import java.time.Duration;
import java.time.LocalDateTime;

public class GeoUtil {

    private static final double EARTH_RADIUS_KM = 6371.0;

    /**
     * Calculates great-circle distance between two points in kilometers using Haversine formula.
     */
    public static double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }

    /**
     * Calculates speed in km/h between two scans given coordinates and timestamps.
     */
    public static double calculateVelocityKmh(double lat1, double lon1, LocalDateTime time1,
                                             double lat2, double lon2, LocalDateTime time2) {
        if (time1 == null || time2 == null) return 0.0;
        long seconds = Math.abs(Duration.between(time1, time2).getSeconds());
        if (seconds == 0) {
            double dist = calculateDistanceKm(lat1, lon1, lat2, lon2);
            return dist > 0.5 ? 999999.0 : 0.0; // Instantaneous teleportation anomaly
        }
        double hours = seconds / 3600.0;
        double distanceKm = calculateDistanceKm(lat1, lon1, lat2, lon2);
        return distanceKm / hours;
    }
}
