package com.wheelcheck.admin

import com.fasterxml.jackson.databind.ObjectMapper
import com.ninjasquad.springmockk.MockkBean
import com.wheelcheck.auth.JwtAuthFilter
import com.wheelcheck.auth.JwtTokenProvider
import com.wheelcheck.common.AccessLevel
import com.wheelcheck.common.Category
import com.wheelcheck.place.Place
import com.wheelcheck.place.PlaceDto
import com.wheelcheck.place.PlaceService
import com.wheelcheck.review.AccessibilityReview
import com.wheelcheck.review.ReviewRepository
import com.wheelcheck.review.ReviewService
import com.wheelcheck.user.User
import com.wheelcheck.user.UserRepository
import com.wheelcheck.user.UserService
import io.mockk.every
import org.junit.jupiter.api.Test
import org.locationtech.jts.geom.Coordinate
import org.locationtech.jts.geom.GeometryFactory
import org.locationtech.jts.geom.PrecisionModel
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import com.wheelcheck.config.SecurityConfig
import org.springframework.security.authorization.AuthorizationDeniedException
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Instant
import java.util.Optional
import java.util.UUID

@WebMvcTest(AdminController::class)
@Import(SecurityConfig::class, AdminControllerTest.TestSecurityExceptionHandler::class)
@AutoConfigureMockMvc(addFilters = false)
class AdminControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @MockkBean
    private lateinit var jwtAuthFilter: JwtAuthFilter

    @MockkBean
    private lateinit var placeService: PlaceService

    @MockkBean
    private lateinit var reviewRepository: ReviewRepository

    @MockkBean
    private lateinit var reviewService: ReviewService

    @MockkBean
    private lateinit var userRepository: UserRepository

    @MockkBean
    private lateinit var jwtTokenProvider: JwtTokenProvider

    @MockkBean
    private lateinit var userService: UserService

    private val geometryFactory = GeometryFactory(PrecisionModel(), 4326)

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `GET admin places returns paginated places`() {
        val place = PlaceDto(
            id = UUID.randomUUID(),
            name = "Admin Place",
            nameMs = "Tempat Admin",
            latitude = 3.15,
            longitude = 101.7,
            address = "123 Admin Street",
            city = "Kuala Lumpur",
            category = Category.MALL,
            accessibilityLevel = AccessLevel.FULL,
            reviewCount = 4,
            createdAt = Instant.now()
        )
        every { placeService.findAll(any<Pageable>()) } returns PageImpl(listOf(place), PageRequest.of(0, 20), 1L)

        mockMvc.perform(get("/api/admin/places"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].name").value("Admin Place"))
            .andExpect(jsonPath("$.totalElements").value(1))
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `PUT admin place updates place`() {
        val placeId = UUID.randomUUID()
        val request = UpdatePlaceRequest(
            name = "Updated Place",
            nameMs = "Tempat Dikemas Kini",
            latitude = 3.16,
            longitude = 101.71,
            address = "Updated Address",
            city = "Petaling Jaya",
            category = Category.RESTAURANT,
            accessibilityLevel = AccessLevel.PARTIAL
        )
        val updatedPlace = PlaceDto(
            id = placeId,
            name = request.name,
            nameMs = request.nameMs,
            latitude = request.latitude,
            longitude = request.longitude,
            address = request.address,
            city = request.city,
            category = request.category,
            accessibilityLevel = request.accessibilityLevel,
            reviewCount = 2,
            createdAt = Instant.now()
        )
        every { placeService.update(placeId, request) } returns updatedPlace

        mockMvc.perform(
            put("/api/admin/places/$placeId")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("Updated Place"))
            .andExpect(jsonPath("$.city").value("Petaling Jaya"))
            .andExpect(jsonPath("$.accessibilityLevel").value("PARTIAL"))
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `DELETE admin place removes place`() {
        val placeId = UUID.randomUUID()
        every { placeService.delete(placeId) } returns Unit

        mockMvc.perform(delete("/api/admin/places/$placeId"))
            .andExpect(status().isNoContent)
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `GET admin reviews returns paginated reviews`() {
        val review = sampleReview()
        every { reviewRepository.findAll(any<Pageable>()) } returns PageImpl(listOf(review), PageRequest.of(0, 20), 1L)

        mockMvc.perform(get("/api/admin/reviews"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].notes").value("Admin review"))
            .andExpect(jsonPath("$.content[0].entrance").value("FULL"))
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `DELETE admin review removes review`() {
        val reviewId = UUID.randomUUID()
        every { reviewService.delete(reviewId) } returns Unit

        mockMvc.perform(delete("/api/admin/reviews/$reviewId"))
            .andExpect(status().isNoContent)
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `GET admin users returns paginated users`() {
        val user = sampleUser()
        every { userRepository.findAll(any<Pageable>()) } returns PageImpl(listOf(user), PageRequest.of(0, 20), 1L)

        mockMvc.perform(get("/api/admin/users"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].email").value(user.email))
            .andExpect(jsonPath("$.content[0].role").value("USER"))
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `PUT admin user role updates role`() {
        val userId = UUID.randomUUID()
        val existingUser = sampleUser(userId = userId, role = "USER")
        val request = UpdateUserRoleRequest(role = "admin")
        every { userRepository.findById(userId) } returns Optional.of(existingUser)
        every { userRepository.save(any()) } answers { firstArg() }

        mockMvc.perform(
            put("/api/admin/users/$userId/role")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.role").value("ADMIN"))
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `DELETE admin user removes user`() {
        val userId = UUID.randomUUID()
        every { userRepository.existsById(userId) } returns true
        every { userRepository.deleteById(userId) } returns Unit

        mockMvc.perform(delete("/api/admin/users/$userId"))
            .andExpect(status().isNoContent)
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `GET admin stats returns dashboard data`() {
        every { placeService.count() } returns 12L
        every { reviewRepository.count() } returns 34L
        every { userRepository.count() } returns 5L
        every { reviewRepository.findAll(any<Pageable>()) } returns PageImpl(listOf(sampleReview()), PageRequest.of(0, 5), 1L)

        mockMvc.perform(get("/api/admin/stats"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.totalPlaces").value(12))
            .andExpect(jsonPath("$.totalReviews").value(34))
            .andExpect(jsonPath("$.totalUsers").value(5))
            .andExpect(jsonPath("$.recentReviews[0].notes").value("Admin review"))
    }

    @Test
    @WithMockUser(roles = ["USER"])
    fun `non admin users get 403 for admin places`() {
        mockMvc.perform(get("/api/admin/places"))
            .andExpect(status().isForbidden)
    }

    @Test
    @WithMockUser(roles = ["USER"])
    fun `non admin users get 403 for admin place update`() {
        val placeId = UUID.randomUUID()
        val request = UpdatePlaceRequest(
            name = "Updated Place",
            nameMs = null,
            latitude = 3.16,
            longitude = 101.71,
            address = "Updated Address",
            city = "Petaling Jaya",
            category = Category.RESTAURANT,
            accessibilityLevel = AccessLevel.PARTIAL
        )

        mockMvc.perform(
            put("/api/admin/places/$placeId")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isForbidden)
    }

    @Test
    @WithMockUser(roles = ["USER"])
    fun `non admin users get 403 for admin place delete`() {
        mockMvc.perform(delete("/api/admin/places/${UUID.randomUUID()}"))
            .andExpect(status().isForbidden)
    }

    @Test
    @WithMockUser(roles = ["USER"])
    fun `non admin users get 403 for admin reviews`() {
        mockMvc.perform(get("/api/admin/reviews"))
            .andExpect(status().isForbidden)
    }

    @Test
    @WithMockUser(roles = ["USER"])
    fun `non admin users get 403 for admin review delete`() {
        mockMvc.perform(delete("/api/admin/reviews/${UUID.randomUUID()}"))
            .andExpect(status().isForbidden)
    }

    @Test
    @WithMockUser(roles = ["USER"])
    fun `non admin users get 403 for admin users`() {
        mockMvc.perform(get("/api/admin/users"))
            .andExpect(status().isForbidden)
    }

    @Test
    @WithMockUser(roles = ["USER"])
    fun `non admin users get 403 for admin user role update`() {
        mockMvc.perform(
            put("/api/admin/users/${UUID.randomUUID()}/role")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"ADMIN\"}")
        )
            .andExpect(status().isForbidden)
    }

    @Test
    @WithMockUser(roles = ["USER"])
    fun `non admin users get 403 for admin user delete`() {
        mockMvc.perform(delete("/api/admin/users/${UUID.randomUUID()}"))
            .andExpect(status().isForbidden)
    }

    @Test
    @WithMockUser(roles = ["USER"])
    fun `non admin users get 403 for admin stats`() {
        mockMvc.perform(get("/api/admin/stats"))
            .andExpect(status().isForbidden)
    }

    @RestControllerAdvice
    class TestSecurityExceptionHandler {
        @ExceptionHandler(AuthorizationDeniedException::class)
        fun handleAuthorizationDenied(): ResponseEntity<Void> {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        }
    }

    private fun sampleReview(): AccessibilityReview {
        val place = Place(
            id = UUID.randomUUID(),
            name = "Review Place",
            nameMs = null,
            location = geometryFactory.createPoint(Coordinate(101.7, 3.15)),
            address = "Review Address",
            city = "Kuala Lumpur",
            category = Category.RESTAURANT,
            accessibilityLevel = AccessLevel.PARTIAL,
            reviewCount = 1,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )

        return AccessibilityReview(
            id = UUID.randomUUID(),
            place = place,
            userId = UUID.randomUUID(),
            entrance = AccessLevel.FULL,
            toilet = AccessLevel.PARTIAL,
            parking = AccessLevel.FULL,
            internalNav = AccessLevel.FULL,
            notes = "Admin review",
            isVerified = true,
            createdAt = Instant.now()
        )
    }

    private fun sampleUser(userId: UUID = UUID.randomUUID(), role: String = "USER") = User(
        id = userId,
        email = "user@wheelcheck.my",
        passwordHash = "hashed-password",
        name = "WheelCheck User",
        isVerified = true,
        role = role,
        createdAt = Instant.now(),
        updatedAt = Instant.now()
    )
}
