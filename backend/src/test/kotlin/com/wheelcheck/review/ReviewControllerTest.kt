package com.wheelcheck.review

import com.fasterxml.jackson.databind.ObjectMapper
import com.ninjasquad.springmockk.MockkBean
import com.wheelcheck.auth.JwtTokenProvider
import com.wheelcheck.common.AccessLevel
import com.wheelcheck.user.UserService
import io.mockk.every
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.time.Instant
import java.util.*

@WebMvcTest(ReviewController::class)
@AutoConfigureMockMvc(addFilters = false)
class ReviewControllerTest {
    
    @Autowired
    private lateinit var mockMvc: MockMvc
    
    @Autowired
    private lateinit var objectMapper: ObjectMapper
    
    @MockkBean
    private lateinit var reviewService: ReviewService
    
    @MockkBean
    private lateinit var jwtTokenProvider: JwtTokenProvider
    
    @MockkBean
    private lateinit var userService: UserService
    
    @Test
    fun `GET reviews by place returns list`() {
        val placeId = UUID.randomUUID()
        val reviews = listOf(
            ReviewDto(
                id = UUID.randomUUID(),
                placeId = placeId,
                userId = null,
                entrance = AccessLevel.FULL,
                toilet = AccessLevel.PARTIAL,
                parking = AccessLevel.FULL,
                internalNav = AccessLevel.FULL,
                notes = "Good accessibility",
                isVerified = false,
                createdAt = Instant.now()
            )
        )
        
        every { reviewService.findByPlaceId(placeId) } returns reviews
        
        mockMvc.perform(get("/api/reviews/place/$placeId"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].entrance").value("FULL"))
            .andExpect(jsonPath("$[0].toilet").value("PARTIAL"))
    }
    
    @Test
    @WithMockUser
    fun `POST create review succeeds`() {
        val placeId = UUID.randomUUID()
        val request = CreateReviewRequest(
            placeId = placeId,
            entrance = AccessLevel.FULL,
            toilet = AccessLevel.FULL,
            parking = AccessLevel.PARTIAL,
            internalNav = AccessLevel.FULL,
            notes = "Test review"
        )
        
        val reviewDto = ReviewDto(
            id = UUID.randomUUID(),
            placeId = placeId,
            userId = null,
            entrance = AccessLevel.FULL,
            toilet = AccessLevel.FULL,
            parking = AccessLevel.PARTIAL,
            internalNav = AccessLevel.FULL,
            notes = "Test review",
            isVerified = false,
            createdAt = Instant.now()
        )
        
        every { reviewService.create(any(), any()) } returns reviewDto
        
        mockMvc.perform(
            post("/api/reviews")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.notes").value("Test review"))
    }
}
