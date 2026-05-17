package com.wheelcheck.place

import com.fasterxml.jackson.databind.ObjectMapper
import com.ninjasquad.springmockk.MockkBean
import com.wheelcheck.auth.JwtTokenProvider
import com.wheelcheck.common.Category
import com.wheelcheck.user.UserService
import io.mockk.every
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.time.Instant
import java.util.*

@WebMvcTest(PlaceController::class)
@AutoConfigureMockMvc(addFilters = false)
class PlaceControllerTest {
    
    @Autowired
    private lateinit var mockMvc: MockMvc
    
    @Autowired
    private lateinit var objectMapper: ObjectMapper
    
    @MockkBean
    private lateinit var placeService: PlaceService
    
    @MockkBean
    private lateinit var jwtTokenProvider: JwtTokenProvider
    
    @MockkBean
    private lateinit var userService: UserService

    @MockkBean
    private lateinit var userRepository: com.wheelcheck.user.UserRepository
    
    @MockkBean
    private lateinit var reviewService: com.wheelcheck.review.ReviewService
    
    @Test
    fun `GET all places returns list`() {
        val places = listOf(
            PlaceDto(
                id = UUID.randomUUID(),
                name = "Test Place 1",
                nameMs = null,
                latitude = 3.15,
                longitude = 101.70,
                address = "Address 1",
                city = "Kuala Lumpur",
                category = Category.RESTAURANT,
                accessibilityLevel = com.wheelcheck.common.AccessLevel.FULL,
                reviewCount = 5,
                createdAt = Instant.now()
            )
        )
        val page = org.springframework.data.domain.PageImpl(places)
        
        every { placeService.findAll(any()) } returns page
        
        mockMvc.perform(get("/api/places"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].name").value("Test Place 1"))
    }
    
    @Test
    fun `GET place by id returns place when exists`() {
        val placeId = UUID.randomUUID()
        val place = PlaceDto(
            id = placeId,
            name = "Test Place",
            nameMs = null,
            latitude = 3.15,
            longitude = 101.70,
            address = "Test Address",
            city = "Kuala Lumpur",
            category = Category.MALL,
            accessibilityLevel = com.wheelcheck.common.AccessLevel.PARTIAL,
            reviewCount = 3,
            createdAt = Instant.now()
        )
        
        every { placeService.findById(placeId) } returns place
        
        mockMvc.perform(get("/api/places/$placeId"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("Test Place"))
            .andExpect(jsonPath("$.category").value("MALL"))
    }
    
    @Test
    fun `GET place by id returns 404 when not found`() {
        val placeId = UUID.randomUUID()
        
        every { placeService.findById(placeId) } returns null
        
        mockMvc.perform(get("/api/places/$placeId"))
            .andExpect(status().isNotFound)
    }
    
    @Test
    @WithMockUser
    fun `POST nearby places returns matching places`() {
        val request = NearbyPlacesRequest(
            latitude = 3.15,
            longitude = 101.70,
            radius = 5000,
            limit = 20
        )
        
        val places = listOf(
            PlaceDto(
                id = UUID.randomUUID(),
                name = "Nearby Place",
                nameMs = null,
                latitude = 3.15,
                longitude = 101.70,
                address = "Nearby Address",
                city = "Kuala Lumpur",
                category = Category.PARK,
                accessibilityLevel = com.wheelcheck.common.AccessLevel.FULL,
                reviewCount = 10,
                createdAt = Instant.now(),
                distance = 150.0
            )
        )
        
        every { placeService.findNearby(any()) } returns places
        
        mockMvc.perform(
            post("/api/places/nearby")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].name").value("Nearby Place"))
    }
}
