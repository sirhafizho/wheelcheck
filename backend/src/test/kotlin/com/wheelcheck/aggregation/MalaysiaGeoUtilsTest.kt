package com.wheelcheck.aggregation

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class MalaysiaGeoUtilsTest {

    @Test
    fun `KL coordinates resolve to Kuala Lumpur, WP KL`() {
        val geo = MalaysiaGeoUtils.lookup(3.15, 101.70)
        assertEquals("Kuala Lumpur", geo.city)
        assertEquals("Wilayah Persekutuan Kuala Lumpur", geo.state)
    }

    @Test
    fun `Putrajaya coordinates resolve to Putrajaya`() {
        val geo = MalaysiaGeoUtils.lookup(2.93, 101.70)
        assertEquals("Putrajaya", geo.city)
    }

    @Test
    fun `Petaling Jaya coordinates resolve to Selangor`() {
        // PJ bbox: 3.00..3.20, 101.55..101.72 — use coords clearly outside KL box (101.60..101.80)
        val geo = MalaysiaGeoUtils.lookup(3.04, 101.58)
        assertEquals("Petaling Jaya", geo.city)
        assertEquals("Selangor", geo.state)
    }

    @Test
    fun `Shah Alam coordinates resolve correctly`() {
        val geo = MalaysiaGeoUtils.lookup(3.09, 101.52)
        assertEquals("Shah Alam", geo.city)
        assertEquals("Selangor", geo.state)
    }

    @Test
    fun `Georgetown Penang resolves correctly`() {
        val geo = MalaysiaGeoUtils.lookup(5.42, 100.33)
        assertEquals("Georgetown", geo.city)
        assertEquals("Pulau Pinang", geo.state)
    }

    @Test
    fun `Ipoh Perak resolves correctly`() {
        val geo = MalaysiaGeoUtils.lookup(4.60, 101.08)
        assertEquals("Ipoh", geo.city)
        assertEquals("Perak", geo.state)
    }

    @Test
    fun `Johor Bahru resolves correctly`() {
        val geo = MalaysiaGeoUtils.lookup(1.49, 103.74)
        assertEquals("Johor Bahru", geo.city)
        assertEquals("Johor", geo.state)
    }

    @Test
    fun `Kota Bharu resolves correctly`() {
        val geo = MalaysiaGeoUtils.lookup(6.13, 102.26)
        assertEquals("Kota Bharu", geo.city)
        assertEquals("Kelantan", geo.state)
    }

    @Test
    fun `Kuching Sarawak resolves correctly`() {
        val geo = MalaysiaGeoUtils.lookup(1.56, 110.36)
        assertEquals("Kuching", geo.city)
        assertEquals("Sarawak", geo.state)
    }

    @Test
    fun `Kota Kinabalu Sabah resolves correctly`() {
        // KK city bbox: 5.96..6.08, 116.06..116.16
        val geo = MalaysiaGeoUtils.lookup(6.00, 116.12)
        assertEquals("Kota Kinabalu", geo.city)
        assertEquals("Sabah", geo.state)
    }

    @Test
    fun `Alor Setar Kedah resolves correctly`() {
        val geo = MalaysiaGeoUtils.lookup(6.12, 100.37)
        assertEquals("Alor Setar", geo.city)
        assertEquals("Kedah", geo.state)
    }

    @Test
    fun `coordinates outside Malaysia return generic fallback`() {
        // Use mid-ocean coordinates clearly outside Malaysia
        val geo = MalaysiaGeoUtils.lookup(10.00, 110.00)
        assertEquals("Malaysia", geo.city)
        assertEquals("Malaysia", geo.state)
    }

    @Test
    fun `city helper returns city string`() {
        assertEquals("Kuala Lumpur", MalaysiaGeoUtils.city(3.15, 101.70))
    }

    @Test
    fun `state helper returns state string`() {
        assertEquals("Wilayah Persekutuan Kuala Lumpur", MalaysiaGeoUtils.state(3.15, 101.70))
    }
}
