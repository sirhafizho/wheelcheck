package com.wheelcheck.review

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = ["*"])
class ReviewController(
    private val reviewService: ReviewService
) {
    
    @GetMapping("/{id}")
    fun getReviewById(@PathVariable id: UUID): ResponseEntity<ReviewDto> {
        val review = reviewService.findById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(review)
    }
    
    @GetMapping("/place/{placeId}")
    fun getReviewsByPlace(@PathVariable placeId: UUID): ResponseEntity<List<ReviewDto>> {
        val reviews = reviewService.findByPlaceId(placeId)
        return ResponseEntity.ok(reviews)
    }
    
    @GetMapping("/user/{userId}")
    fun getReviewsByUser(@PathVariable userId: UUID): ResponseEntity<List<ReviewDto>> {
        val reviews = reviewService.findByUserId(userId)
        return ResponseEntity.ok(reviews)
    }
    
    @PostMapping
    fun createReview(
        @Valid @RequestBody request: CreateReviewRequest,
        authentication: Authentication?
    ): ResponseEntity<ReviewDto> {
        val userId = authentication?.principal as? UUID
        val review = reviewService.create(request, userId)
        return ResponseEntity.status(HttpStatus.CREATED).body(review)
    }
}
