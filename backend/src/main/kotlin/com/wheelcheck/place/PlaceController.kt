package com.wheelcheck.place

import com.wheelcheck.review.ReviewDto
import com.wheelcheck.review.ReviewService
import jakarta.validation.Valid
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/places")
@CrossOrigin(origins = ["*"])
class PlaceController(
    private val placeService: PlaceService,
    private val reviewService: ReviewService
) {
    
    @GetMapping
    fun getAllPlaces(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<Page<PlaceDto>> {
        val pageable = PageRequest.of(page, size.coerceAtMost(100))
        return ResponseEntity.ok(placeService.findAll(pageable))
    }
    
    @GetMapping("/{id}")
    fun getPlaceById(@PathVariable id: UUID): ResponseEntity<PlaceDto> {
        val place = placeService.findById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(place)
    }

    @GetMapping("/{id}/reports")
    fun getPlaceReports(@PathVariable id: UUID): ResponseEntity<List<ReviewDto>> {
        val reviews = reviewService.findByPlaceId(id)
        return ResponseEntity.ok(reviews)
    }
    
    @PostMapping("/nearby")
    fun findNearbyPlaces(
        @Valid @RequestBody request: NearbyPlacesRequest
    ): ResponseEntity<List<PlaceDto>> {
        val places = placeService.findNearby(request)
        return ResponseEntity.ok(places)
    }
    
    @GetMapping("/search")
    fun searchPlaces(@RequestParam name: String): ResponseEntity<List<PlaceDto>> {
        val places = placeService.searchByName(name)
        return ResponseEntity.ok(places)
    }
    
    @PostMapping
    fun createPlace(
        @Valid @RequestBody request: CreatePlaceRequest
    ): ResponseEntity<PlaceDto> {
        val place = placeService.create(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(place)
    }
}
