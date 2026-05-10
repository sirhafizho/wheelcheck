package com.wheelcheck.place

import com.wheelcheck.common.AccessLevel
import com.wheelcheck.common.Category
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

class PlaceServiceTest {
    
    private lateinit var placeRepository: PlaceRepository
    private lateinit var placeService: PlaceService
    private val geometryFactory = GeometryFactory(PrecisionModel(), 4326)
    
    @BeforeEach
    fun setup() {
        placeRepository = mockk()
        placeService = PlaceService(placeRepository)
    }
    
    @Test
    fun `findById returns place when exists`() {
        val placeId = UUID.randomUUID()
        val point = geometryFactory.createPoint(Coordinate(101.7123, 3.1535))
        val place = Place(
            id = placeId,
            name = "Test Place",
            nameMs = "Tempat Ujian",
            location = point,
            address = "Test Address",
            city = "Kuala Lumpur",
            category = Category.RESTAURANT,
            accessibilityLevel = AccessLevel.FULL,
            reviewCount = 5,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        
        every { placeRepository.findById(placeId) } returns Optional.of(place)
        
        val result = placeService.findById(placeId)
        
        assertNotNull(result)
        assertEquals(placeId, result?.id)
        assertEquals("Test Place", result?.name)
        assertEquals(3.1535, result?.latitude)
        assertEquals(101.7123, result?.longitude)
        verify { placeRepository.findById(placeId) }
    }
    
    @Test
    fun `findById returns null when not exists`() {
        val placeId = UUID.randomUUID()
        
        every { placeRepository.findById(placeId) } returns Optional.empty()
        
        val result = placeService.findById(placeId)
        
        assertNull(result)
        verify { placeRepository.findById(placeId) }
    }
    
    @Test
    fun `create creates new place with correct data`() {
        val request = CreatePlaceRequest(
            name = "New Restaurant",
            nameMs = "Restoran Baru",
            latitude = 3.15,
            longitude = 101.70,
            address = "123 Test St",
            city = "Kuala Lumpur",
            category = Category.RESTAURANT
        )
        
        every { placeRepository.save(any()) } answers { firstArg() }
        
        val result = placeService.create(request)
        
        assertNotNull(result)
        assertEquals("New Restaurant", result.name)
        assertEquals("Restoran Baru", result.nameMs)
        assertEquals(3.15, result.latitude)
        assertEquals(101.70, result.longitude)
        assertEquals(Category.RESTAURANT, result.category)
        assertEquals(AccessLevel.UNKNOWN, result.accessibilityLevel)
        assertEquals(0, result.reviewCount)
        
        verify { placeRepository.save(any()) }
    }
    
    @Test
    fun `searchByName returns matching places`() {
        val point = geometryFactory.createPoint(Coordinate(101.7123, 3.1535))
        val places = listOf(
            Place(
                name = "KL Restaurant",
                location = point,
                address = "Address 1",
                category = Category.RESTAURANT
            ),
            Place(
                name = "Restaurant KL",
                location = point,
                address = "Address 2",
                category = Category.RESTAURANT
            )
        )
        
        every { placeRepository.findByNameContainingIgnoreCase("restaurant") } returns places
        
        val results = placeService.searchByName("restaurant")
        
        assertEquals(2, results.size)
        verify { placeRepository.findByNameContainingIgnoreCase("restaurant") }
    }
}
