package com.wheelcheck.place

import com.wheelcheck.review.ReviewDto
import com.wheelcheck.review.ReviewService
import jakarta.validation.Valid
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
    fun getAllPlaces(): ResponseEntity<List<PlaceDto>> {
        return ResponseEntity.ok(placeService.findAll())
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
