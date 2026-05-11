package com.wheelcheck.review

import com.wheelcheck.common.AccessLevel
import com.wheelcheck.common.Category
import com.wheelcheck.place.Place
import com.wheelcheck.place.PlaceRepository
import com.wheelcheck.user.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.locationtech.jts.geom.Coordinate
import org.locationtech.jts.geom.GeometryFactory
import org.locationtech.jts.geom.PrecisionModel
import java.time.Instant
import java.util.*

class ReviewServiceTest {
    
    private lateinit var reviewRepository: ReviewRepository
    private lateinit var placeRepository: PlaceRepository
    private lateinit var userRepository: UserRepository
    private lateinit var reviewService: ReviewService
    private val geometryFactory = GeometryFactory(PrecisionModel(), 4326)
    
    @BeforeEach
    fun setup() {
        reviewRepository = mockk()
        placeRepository = mockk()
        userRepository = mockk()
        reviewService = ReviewService(reviewRepository, placeRepository, userRepository)
    }
    
    @Test
    fun `create review saves review and updates place`() {
        val placeId = UUID.randomUUID()
        val point = geometryFactory.createPoint(Coordinate(101.7123, 3.1535))
        val place = Place(
            id = placeId,
            name = "Test Place",
            location = point,
            address = "Test Address",
            category = Category.RESTAURANT,
            reviewCount = 0
        )
        
        val request = CreateReviewRequest(
            placeId = placeId,
            entrance = AccessLevel.FULL,
            toilet = AccessLevel.PARTIAL,
            parking = AccessLevel.FULL,
            internalNav = AccessLevel.FULL,
            notes = "Great accessibility"
        )
        
        every { placeRepository.findById(placeId) } returns Optional.of(place)
        every { reviewRepository.save(any()) } answers { firstArg() }
        every { reviewRepository.findByPlaceIdOrderByCreatedAtDesc(placeId) } returns emptyList()
        every { placeRepository.save(any()) } answers { firstArg() }
        
        val result = reviewService.create(request, null)
        
        assertNotNull(result)
        assertEquals(placeId, result.placeId)
        assertEquals(AccessLevel.FULL, result.entrance)
        assertEquals(AccessLevel.PARTIAL, result.toilet)
        assertNull(result.userId)
        assertEquals("Great accessibility", result.notes)
        assertFalse(result.isVerified)
        
        verify { reviewRepository.save(any()) }
    }
    
    @Test
    fun `create review with userId includes user`() {
        val placeId = UUID.randomUUID()
        val userId = UUID.randomUUID()
        val point = geometryFactory.createPoint(Coordinate(101.7123, 3.1535))
        val place = Place(
            id = placeId,
            name = "Test Place",
            location = point,
            address = "Test Address",
            category = Category.MALL
        )
        
        val request = CreateReviewRequest(
            placeId = placeId,
            entrance = AccessLevel.FULL,
            toilet = AccessLevel.FULL,
            parking = AccessLevel.FULL,
            internalNav = AccessLevel.FULL,
            notes = null
        )
        
        every { placeRepository.findById(placeId) } returns Optional.of(place)
        every { reviewRepository.save(any()) } answers { firstArg() }
        every { reviewRepository.findByPlaceIdOrderByCreatedAtDesc(placeId) } returns emptyList()
        every { placeRepository.save(any()) } answers { firstArg() }
        every { userRepository.findById(userId) } returns Optional.empty()
        
        val result = reviewService.create(request, userId)
        
        assertNotNull(result)
        assertEquals(userId, result.userId)
        
        verify { reviewRepository.save(any()) }
    }
    
    @Test
    fun `create review throws exception when place not found`() {
        val placeId = UUID.randomUUID()
        val request = CreateReviewRequest(
            placeId = placeId,
            entrance = AccessLevel.FULL,
            toilet = AccessLevel.FULL,
            parking = AccessLevel.FULL,
            internalNav = AccessLevel.FULL,
            notes = null
        )
        
        every { placeRepository.findById(placeId) } returns Optional.empty()
        
        assertThrows(IllegalArgumentException::class.java) {
            reviewService.create(request, null)
        }
    }

    @Test
    fun `calculateOverallAccessibility returns FULL when all dimensions are FULL`() {
        val point = geometryFactory.createPoint(Coordinate(101.7, 3.15))
        val place = Place(name = "Test", location = point, address = "Addr", category = Category.RESTAURANT)
        val reviews = listOf(
            AccessibilityReview(place = place, entrance = AccessLevel.FULL, toilet = AccessLevel.FULL, parking = AccessLevel.FULL, internalNav = AccessLevel.FULL)
        )
        val result = reviewService.calculateOverallAccessibility(reviews)
        assertEquals(AccessLevel.FULL, result)
    }

    @Test
    fun `calculateOverallAccessibility returns NOT_ACCESSIBLE when all dimensions are NOT_ACCESSIBLE`() {
        val point = geometryFactory.createPoint(Coordinate(101.7, 3.15))
        val place = Place(name = "Test", location = point, address = "Addr", category = Category.RESTAURANT)
        val reviews = listOf(
            AccessibilityReview(place = place, entrance = AccessLevel.NOT_ACCESSIBLE, toilet = AccessLevel.NOT_ACCESSIBLE, parking = AccessLevel.NOT_ACCESSIBLE, internalNav = AccessLevel.NOT_ACCESSIBLE)
        )
        val result = reviewService.calculateOverallAccessibility(reviews)
        assertEquals(AccessLevel.NOT_ACCESSIBLE, result)
    }

    @Test
    fun `calculateOverallAccessibility returns PARTIAL for mixed reviews`() {
        val point = geometryFactory.createPoint(Coordinate(101.7, 3.15))
        val place = Place(name = "Test", location = point, address = "Addr", category = Category.RESTAURANT)
        val reviews = listOf(
            AccessibilityReview(place = place, entrance = AccessLevel.FULL, toilet = AccessLevel.NOT_ACCESSIBLE, parking = AccessLevel.PARTIAL, internalNav = AccessLevel.FULL)
        )
        // Scores: 3 + 1 + 2 + 3 = 9 / 4 = 2.25 → PARTIAL (>= 1.5, < 2.5)
        val result = reviewService.calculateOverallAccessibility(reviews)
        assertEquals(AccessLevel.PARTIAL, result)
    }

    @Test
    fun `calculateOverallAccessibility ignores UNKNOWN dimensions`() {
        val point = geometryFactory.createPoint(Coordinate(101.7, 3.15))
        val place = Place(name = "Test", location = point, address = "Addr", category = Category.RESTAURANT)
        val reviews = listOf(
            AccessibilityReview(place = place, entrance = AccessLevel.FULL, toilet = AccessLevel.UNKNOWN, parking = AccessLevel.FULL, internalNav = AccessLevel.UNKNOWN)
        )
        // Only FULL scores: 3 + 3 = 6 / 2 = 3.0 → FULL
        val result = reviewService.calculateOverallAccessibility(reviews)
        assertEquals(AccessLevel.FULL, result)
    }

    @Test
    fun `calculateOverallAccessibility returns UNKNOWN for empty reviews`() {
        val result = reviewService.calculateOverallAccessibility(emptyList())
        assertEquals(AccessLevel.UNKNOWN, result)
    }

    @Test
    fun `calculateOverallAccessibility averages across multiple reviews`() {
        val point = geometryFactory.createPoint(Coordinate(101.7, 3.15))
        val place = Place(name = "Test", location = point, address = "Addr", category = Category.RESTAURANT)
        val reviews = listOf(
            AccessibilityReview(place = place, entrance = AccessLevel.FULL, toilet = AccessLevel.FULL, parking = AccessLevel.FULL, internalNav = AccessLevel.FULL),
            AccessibilityReview(place = place, entrance = AccessLevel.NOT_ACCESSIBLE, toilet = AccessLevel.NOT_ACCESSIBLE, parking = AccessLevel.NOT_ACCESSIBLE, internalNav = AccessLevel.NOT_ACCESSIBLE)
        )
        // Scores: (3+3+3+3 + 1+1+1+1) / 8 = 16/8 = 2.0 → PARTIAL
        val result = reviewService.calculateOverallAccessibility(reviews)
        assertEquals(AccessLevel.PARTIAL, result)
    }
}
