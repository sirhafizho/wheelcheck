package com.wheelcheck.aggregation

import com.fasterxml.jackson.databind.ObjectMapper
import com.ninjasquad.springmockk.MockkBean
import com.wheelcheck.auth.JwtAuthFilter
import com.wheelcheck.auth.JwtTokenProvider
import com.wheelcheck.config.SecurityConfig
import io.mockk.every
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@WebMvcTest(RoutingController::class)
@Import(SecurityConfig::class)
@AutoConfigureMockMvc(addFilters = false)
class RoutingControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @MockkBean
    private lateinit var orsRoutingAdapter: OrsRoutingAdapter

    @MockkBean
    private lateinit var jwtAuthFilter: JwtAuthFilter

    @MockkBean
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private val validRequest = RouteRequest(
        from = LatLng(lat = 3.1535, lng = 101.7123),
        to = LatLng(lat = 3.1600, lng = 101.7200)
    )

    @Test
    @WithMockUser
    fun `POST wheelchair route returns route when adapter enabled and route found`() {
        every { orsRoutingAdapter.isEnabled } returns true
        every { orsRoutingAdapter.getRoute(any(), any(), any()) } returns WheelchairRoute(
            distanceMeters = 850.0,
            durationSeconds = 510.0,
            geometry = "encodedPolyline",
            warnings = emptyList()
        )

        mockMvc.perform(
            post("/api/routing/wheelchair")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.distanceMeters").value(850.0))
            .andExpect(jsonPath("$.durationSeconds").value(510.0))
            .andExpect(jsonPath("$.geometry").value("encodedPolyline"))
    }

    @Test
    @WithMockUser
    fun `POST wheelchair route returns 503 when adapter is disabled`() {
        every { orsRoutingAdapter.isEnabled } returns false

        mockMvc.perform(
            post("/api/routing/wheelchair")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest))
        )
            .andExpect(status().isServiceUnavailable)
    }

    @Test
    @WithMockUser
    fun `POST wheelchair route returns 404 when ORS finds no route`() {
        every { orsRoutingAdapter.isEnabled } returns true
        every { orsRoutingAdapter.getRoute(any(), any(), any()) } returns null

        mockMvc.perform(
            post("/api/routing/wheelchair")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest))
        )
            .andExpect(status().isNotFound)
    }

    @Test
    @WithMockUser
    fun `POST wheelchair route passes custom options to adapter`() {
        every { orsRoutingAdapter.isEnabled } returns true
        every { orsRoutingAdapter.getRoute(any(), any(), any()) } returns WheelchairRoute(
            distanceMeters = 600.0,
            durationSeconds = 400.0,
            geometry = "geom"
        )

        val requestWithOptions = RouteRequest(
            from = LatLng(3.15, 101.70),
            to = LatLng(3.16, 101.71),
            options = WheelchairRouteOptions(
                maximumInclinePercent = 3,
                maximumSlopedKerbMeters = 0.03,
                minimumWidthMeters = 1.2
            )
        )

        mockMvc.perform(
            post("/api/routing/wheelchair")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestWithOptions))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.distanceMeters").value(600.0))
    }

    @Test
    @WithMockUser
    fun `POST wheelchair route returns route with warnings`() {
        every { orsRoutingAdapter.isEnabled } returns true
        every { orsRoutingAdapter.getRoute(any(), any(), any()) } returns WheelchairRoute(
            distanceMeters = 1200.0,
            durationSeconds = 720.0,
            geometry = "geom",
            warnings = listOf("Route may have restrictions", "Steep section detected")
        )

        mockMvc.perform(
            post("/api/routing/wheelchair")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.warnings[0]").value("Route may have restrictions"))
            .andExpect(jsonPath("$.warnings[1]").value("Steep section detected"))
    }

    @Test
    @WithMockUser(roles = ["USER"])
    fun `POST wheelchair route succeeds for regular authenticated user`() {
        every { orsRoutingAdapter.isEnabled } returns true
        every { orsRoutingAdapter.getRoute(any(), any(), any()) } returns WheelchairRoute(
            distanceMeters = 300.0,
            durationSeconds = 180.0,
            geometry = "geom"
        )

        mockMvc.perform(
            post("/api/routing/wheelchair")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest))
        )
            .andExpect(status().isOk)
    }
}
