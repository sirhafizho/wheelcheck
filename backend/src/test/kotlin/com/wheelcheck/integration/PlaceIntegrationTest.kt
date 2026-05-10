package com.wheelcheck.integration

import com.wheelcheck.common.AccessLevel
import com.wheelcheck.common.Category
import com.wheelcheck.place.CreatePlaceRequest
import com.wheelcheck.place.NearbyPlacesRequest
import com.wheelcheck.place.PlaceService
import com.wheelcheck.review.CreateReviewRequest
import com.wheelcheck.review.ReviewService
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@ActiveProfiles("test")
@Import(TestContainersConfig::class)
@Transactional
@EnabledIfEnvironmentVariable(named = "INTEGRATION_TESTS", matches = "true")
class PlaceIntegrationTest {
    
    @Autowired
    private lateinit var placeService: PlaceService
    
    @Autowired
    private lateinit var reviewService: ReviewService
    
    @Test
    fun `create place and add review updates accessibility level`() {
        // Create a place
        val createRequest = CreatePlaceRequest(
            name = "Integration Test Place",
            nameMs = "Tempat Ujian Integrasi",
            latitude = 3.15,
            longitude = 101.70,
            address = "123 Test Street",
            city = "Kuala Lumpur",
            category = Category.RESTAURANT
        )
        
        val createdPlace = placeService.create(createRequest)
        
        assertNotNull(createdPlace)
        assertEquals("Integration Test Place", createdPlace.name)
        assertEquals(AccessLevel.UNKNOWN, createdPlace.accessibilityLevel)
        assertEquals(0, createdPlace.reviewCount)
        
        // Add a review
        val reviewRequest = CreateReviewRequest(
            placeId = createdPlace.id,
            entrance = AccessLevel.FULL,
            toilet = AccessLevel.FULL,
            parking = AccessLevel.FULL,
            internalNav = AccessLevel.FULL,
            notes = "Fully accessible restaurant"
        )
        
        val createdReview = reviewService.create(reviewRequest, null)
        
        assertNotNull(createdReview)
        assertEquals(createdPlace.id, createdReview.placeId)
        assertEquals(AccessLevel.FULL, createdReview.entrance)
        
        // Verify place was updated
        val updatedPlace = placeService.findById(createdPlace.id)
        assertNotNull(updatedPlace)
        assertEquals(1, updatedPlace?.reviewCount)
        assertEquals(AccessLevel.FULL, updatedPlace?.accessibilityLevel)
    }
    
    @Test
    fun `find nearby places returns correct results`() {
        // Create multiple places
        val place1 = placeService.create(
            CreatePlaceRequest(
                name = "Nearby Place 1",
                latitude = 3.1500,
                longitude = 101.7000,
                address = "Address 1",
                category = Category.RESTAURANT
            )
        )
        
        val place2 = placeService.create(
            CreatePlaceRequest(
                name = "Nearby Place 2",
                latitude = 3.1505,
                longitude = 101.7005,
                address = "Address 2",
                category = Category.MALL
            )
        )
        
        // Search nearby
        val nearbyRequest = NearbyPlacesRequest(
            latitude = 3.1500,
            longitude = 101.7000,
            radius = 1000,
            limit = 10
        )
        
        val results = placeService.findNearby(nearbyRequest)
        
        assertTrue(results.isNotEmpty())
        assertTrue(results.any { it.id == place1.id })
    }
    
    @Test
    fun `search by name finds matching places`() {
        placeService.create(
            CreatePlaceRequest(
                name = "Unique Restaurant Name",
                latitude = 3.15,
                longitude = 101.70,
                address = "Address",
                category = Category.RESTAURANT
            )
        )
        
        val results = placeService.searchByName("Unique")
        
        assertTrue(results.isNotEmpty())
        assertTrue(results.any { it.name.contains("Unique") })
    }
}
