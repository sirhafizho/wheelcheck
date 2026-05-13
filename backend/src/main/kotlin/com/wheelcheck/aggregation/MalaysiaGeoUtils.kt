package com.wheelcheck.aggregation

object MalaysiaGeoUtils {

    data class GeoRegion(val city: String, val state: String)

    // Ordered from most-specific (city-level) to most-general (state-level).
    // First match wins, so put tight city boxes before wide state boxes.
    private val REGIONS: List<Pair<BoundingBox, GeoRegion>> = listOf(
        // ── Federal Territories ──────────────────────────────────────────────
        bbox(3.05, 101.60, 3.25, 101.80) to GeoRegion("Kuala Lumpur", "Wilayah Persekutuan Kuala Lumpur"),
        bbox(2.85, 101.67, 3.00, 101.82) to GeoRegion("Putrajaya", "Wilayah Persekutuan Putrajaya"),
        bbox(5.26, 115.15, 5.40, 115.30) to GeoRegion("Labuan", "Wilayah Persekutuan Labuan"),

        // ── Selangor major cities ────────────────────────────────────────────
        bbox(3.00, 101.55, 3.20, 101.72) to GeoRegion("Petaling Jaya", "Selangor"),
        bbox(3.05, 101.44, 3.15, 101.60) to GeoRegion("Shah Alam", "Selangor"),
        bbox(2.95, 101.35, 3.10, 101.55) to GeoRegion("Klang", "Selangor"),
        bbox(3.10, 101.53, 3.25, 101.68) to GeoRegion("Subang Jaya", "Selangor"),
        bbox(2.90, 101.65, 3.05, 101.85) to GeoRegion("Kajang", "Selangor"),
        bbox(3.20, 101.53, 3.40, 101.72) to GeoRegion("Rawang", "Selangor"),
        bbox(3.30, 101.40, 3.55, 101.60) to GeoRegion("Kuala Selangor", "Selangor"),
        bbox(2.70, 101.50, 2.95, 101.75) to GeoRegion("Sepang", "Selangor"),

        // ── Negeri Sembilan ──────────────────────────────────────────────────
        bbox(2.70, 101.90, 2.78, 102.00) to GeoRegion("Seremban", "Negeri Sembilan"),
        bbox(2.45, 102.15, 2.60, 102.30) to GeoRegion("Port Dickson", "Negeri Sembilan"),

        // ── Johor ────────────────────────────────────────────────────────────
        bbox(1.40, 103.60, 1.60, 103.85) to GeoRegion("Johor Bahru", "Johor"),
        bbox(1.80, 103.30, 2.05, 103.55) to GeoRegion("Batu Pahat", "Johor"),
        bbox(2.00, 102.55, 2.20, 102.80) to GeoRegion("Muar", "Johor"),
        bbox(1.85, 103.72, 2.00, 103.90) to GeoRegion("Kluang", "Johor"),
        bbox(1.52, 104.10, 1.65, 104.30) to GeoRegion("Pasir Gudang", "Johor"),
        bbox(1.83, 102.93, 1.97, 103.10) to GeoRegion("Segamat", "Johor"),

        // ── Melaka ──────────────────────────────────────────────────────────
        bbox(2.18, 102.20, 2.28, 102.30) to GeoRegion("Melaka Tengah", "Melaka"),
        bbox(2.27, 102.07, 2.42, 102.25) to GeoRegion("Alor Gajah", "Melaka"),

        // ── Pahang ──────────────────────────────────────────────────────────
        bbox(3.78, 103.28, 3.88, 103.38) to GeoRegion("Kuantan", "Pahang"),
        bbox(3.50, 102.40, 3.65, 102.55) to GeoRegion("Temerloh", "Pahang"),
        bbox(4.35, 101.70, 4.45, 101.80) to GeoRegion("Cameron Highlands", "Pahang"),
        bbox(3.32, 101.94, 3.45, 102.08) to GeoRegion("Bentong", "Pahang"),

        // ── Terengganu ──────────────────────────────────────────────────────
        bbox(5.30, 103.10, 5.42, 103.20) to GeoRegion("Kuala Terengganu", "Terengganu"),
        bbox(4.83, 103.32, 4.92, 103.42) to GeoRegion("Kemaman", "Terengganu"),
        bbox(5.55, 102.88, 5.65, 102.98) to GeoRegion("Dungun", "Terengganu"),

        // ── Kelantan ────────────────────────────────────────────────────────
        bbox(6.08, 102.22, 6.18, 102.32) to GeoRegion("Kota Bharu", "Kelantan"),
        bbox(5.93, 101.97, 6.03, 102.07) to GeoRegion("Kuala Krai", "Kelantan"),

        // ── Kedah ────────────────────────────────────────────────────────────
        bbox(6.11, 100.35, 6.21, 100.45) to GeoRegion("Alor Setar", "Kedah"),
        bbox(6.45, 100.25, 6.55, 100.38) to GeoRegion("Jitra", "Kedah"),
        bbox(5.60, 100.62, 5.72, 100.72) to GeoRegion("Sungai Petani", "Kedah"),
        bbox(6.05, 100.15, 6.18, 100.28) to GeoRegion("Langkawi", "Kedah"),

        // ── Penang ───────────────────────────────────────────────────────────
        bbox(5.38, 100.28, 5.47, 100.40) to GeoRegion("Georgetown", "Pulau Pinang"),
        bbox(5.28, 100.40, 5.38, 100.52) to GeoRegion("Bayan Lepas", "Pulau Pinang"),
        bbox(5.40, 100.42, 5.55, 100.58) to GeoRegion("Butterworth", "Pulau Pinang"),
        bbox(5.47, 100.20, 5.57, 100.32) to GeoRegion("Balik Pulau", "Pulau Pinang"),

        // ── Perak ────────────────────────────────────────────────────────────
        bbox(4.57, 101.05, 4.67, 101.15) to GeoRegion("Ipoh", "Perak"),
        bbox(5.00, 100.73, 5.10, 100.83) to GeoRegion("Taiping", "Perak"),
        bbox(4.85, 100.72, 4.95, 100.82) to GeoRegion("Teluk Intan", "Perak"),
        bbox(3.82, 103.32, 3.95, 103.45) to GeoRegion("Kuala Lipis", "Perak"),

        // ── Perlis ───────────────────────────────────────────────────────────
        bbox(6.43, 100.17, 6.53, 100.27) to GeoRegion("Kangar", "Perlis"),

        // ── Sabah ────────────────────────────────────────────────────────────
        bbox(5.96, 116.06, 6.08, 116.16) to GeoRegion("Kota Kinabalu", "Sabah"),
        bbox(5.83, 117.88, 5.93, 117.98) to GeoRegion("Sandakan", "Sabah"),
        bbox(4.23, 117.85, 4.33, 117.95) to GeoRegion("Tawau", "Sabah"),
        bbox(5.50, 118.07, 5.60, 118.17) to GeoRegion("Lahad Datu", "Sabah"),
        bbox(6.15, 116.44, 6.25, 116.54) to GeoRegion("Tuaran", "Sabah"),

        // ── Sarawak ──────────────────────────────────────────────────────────
        bbox(1.53, 110.32, 1.63, 110.42) to GeoRegion("Kuching", "Sarawak"),
        bbox(3.21, 113.02, 3.31, 113.12) to GeoRegion("Miri", "Sarawak"),
        bbox(2.28, 111.82, 2.38, 111.92) to GeoRegion("Sibu", "Sarawak"),
        bbox(2.04, 112.89, 2.14, 112.99) to GeoRegion("Sarikei", "Sarawak"),
        bbox(1.82, 110.30, 1.92, 110.40) to GeoRegion("Samarahan", "Sarawak"),

        // ── State-level fallbacks (after all city boxes) ─────────────────────
        bbox(1.38, 103.55, 2.10, 104.35) to GeoRegion("Johor", "Johor"),
        bbox(1.90, 102.00, 2.90, 102.85) to GeoRegion("Melaka", "Melaka"),
        bbox(2.40, 101.70, 3.50, 102.65) to GeoRegion("Negeri Sembilan", "Negeri Sembilan"),
        bbox(2.70, 101.95, 4.70, 103.50) to GeoRegion("Pahang", "Pahang"),
        bbox(2.40, 101.15, 3.90, 102.10) to GeoRegion("Selangor", "Selangor"),
        bbox(3.80, 100.65, 5.80, 102.00) to GeoRegion("Perak", "Perak"),
        bbox(5.60, 100.02, 6.70, 100.70) to GeoRegion("Kedah", "Kedah"),
        bbox(5.20, 100.15, 5.65, 100.70) to GeoRegion("Pulau Pinang", "Pulau Pinang"),
        bbox(5.65, 100.07, 6.73, 100.25) to GeoRegion("Perlis", "Perlis"),
        bbox(4.75, 101.65, 6.30, 103.20) to GeoRegion("Kelantan", "Kelantan"),
        bbox(4.57, 102.55, 5.90, 103.60) to GeoRegion("Terengganu", "Terengganu"),
        bbox(4.78, 115.76, 7.40, 117.88) to GeoRegion("Sabah", "Sabah"),
        bbox(0.85, 109.55, 5.05, 115.65) to GeoRegion("Sarawak", "Sarawak"),
    )

    fun lookup(lat: Double, lng: Double): GeoRegion {
        for ((box, region) in REGIONS) {
            if (lat in box.south..box.north && lng in box.west..box.east) return region
        }
        return GeoRegion("Malaysia", "Malaysia")
    }

    fun city(lat: Double, lng: Double): String = lookup(lat, lng).city

    fun state(lat: Double, lng: Double): String = lookup(lat, lng).state

    private fun bbox(south: Double, west: Double, north: Double, east: Double) =
        BoundingBox(south = south, west = west, north = north, east = east)
}
