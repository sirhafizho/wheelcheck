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

    // Legacy named shortcuts kept for backwards compatibility
    @PostMapping("/import/kl")
    fun importKL(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.KL)

    @PostMapping("/import/selangor")
    fun importSelangor(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.SELANGOR)

    // State-level endpoints
    @PostMapping("/import/johor")
    fun importJohor(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.JOHOR)

    @PostMapping("/import/kedah")
    fun importKedah(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.KEDAH)

    @PostMapping("/import/kelantan")
    fun importKelantan(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.KELANTAN)

    @PostMapping("/import/melaka")
    fun importMelaka(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.MELAKA)

    @PostMapping("/import/negeri-sembilan")
    fun importNegeriSembilan(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.NEGERI_SEMBILAN)

    @PostMapping("/import/pahang")
    fun importPahang(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.PAHANG)

    @PostMapping("/import/penang")
    fun importPenang(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.PENANG)

    @PostMapping("/import/perak")
    fun importPerak(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.PERAK)

    @PostMapping("/import/perlis")
    fun importPerlis(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.PERLIS)

    @PostMapping("/import/sabah")
    fun importSabah(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.SABAH)

    @PostMapping("/import/sarawak")
    fun importSarawak(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.SARAWAK)

    @PostMapping("/import/terengganu")
    fun importTerengganu(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.TERENGGANU)

    // Multi-state convenience endpoints
    @PostMapping("/import/peninsular")
    fun importPeninsular(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.PENINSULAR)

    @PostMapping("/import/malaysia")
    fun importMalaysia(): List<ImportStats> =
        aggregationService.importFromRegion(AggregationService.MalaysiaRegion.FULL_MALAYSIA)

    // Generic region endpoint — POST /api/aggregation/import/region/SABAH
    @PostMapping("/import/region/{region}")
    fun importRegion(@PathVariable region: AggregationService.MalaysiaRegion): List<ImportStats> =
        aggregationService.importFromRegion(region)

    // Arbitrary bounding box for custom areas
    @PostMapping("/import/custom")
    fun importCustom(@RequestBody bbox: BoundingBox): List<ImportStats> =
        aggregationService.importFromAllSources(bbox)

    @GetMapping("/adapters")
    fun listAdapters(): AdaptersInfo =
        aggregationService.getAdaptersInfo()

    @GetMapping("/regions")
    fun listRegions(): List<RegionInfo> =
        AggregationService.MalaysiaRegion.entries.map {
            RegionInfo(
                name = it.name,
                displayName = it.name.replace('_', ' ').lowercase()
                    .replaceFirstChar { c -> c.uppercase() },
                bbox = it.bbox
            )
        }
}

data class RegionInfo(
    val name: String,
    val displayName: String,
    val bbox: BoundingBox
)

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
