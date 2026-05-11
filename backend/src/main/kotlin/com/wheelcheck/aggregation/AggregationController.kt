package com.wheelcheck.aggregation

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/aggregation")
@PreAuthorize("hasRole('ADMIN')")
class AggregationController(
    private val aggregationService: AggregationService
) {

    @PostMapping("/import/kl")
    fun importKL(): List<ImportStats> =
        aggregationService.importFromAllSources(AggregationService.KL_BBOX)

    @PostMapping("/import/selangor")
    fun importSelangor(): List<ImportStats> =
        aggregationService.importFromAllSources(AggregationService.SELANGOR_BBOX)

    @PostMapping("/import/custom")
    fun importCustom(@RequestBody bbox: BoundingBox): List<ImportStats> =
        aggregationService.importFromAllSources(bbox)

    @GetMapping("/adapters")
    fun listAdapters(): AdaptersInfo =
        aggregationService.getAdaptersInfo()
}

@RestController
@RequestMapping("/api/routing")
class RoutingController(
    private val orsRoutingAdapter: OrsRoutingAdapter?
) {
    @PostMapping("/wheelchair")
    fun getWheelchairRoute(@RequestBody request: RouteRequest): ResponseEntity<WheelchairRoute> {
        val adapter = orsRoutingAdapter
            ?: return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build()

        if (!adapter.isEnabled) return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build()

        val route = adapter.getRoute(request.from, request.to, request.options ?: WheelchairRouteOptions())
            ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(route)
    }
}

data class RouteRequest(
    val from: LatLng,
    val to: LatLng,
    val options: WheelchairRouteOptions? = null
)

data class AdapterInfo(
    val source: String,
    val displayName: String,
    val enabled: Boolean,
    val priority: Int
)

data class AdaptersInfo(
    val placeAdapters: List<AdapterInfo>,
    val routingAdapters: List<AdapterInfo>
)
