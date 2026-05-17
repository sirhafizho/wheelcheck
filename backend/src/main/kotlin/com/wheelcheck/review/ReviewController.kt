package com.wheelcheck.review

import jakarta.validation.Valid
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.nio.file.Files
import java.nio.file.Paths
import java.util.*

@RestController
@RequestMapping("/api/reviews")
class ReviewController(
    private val reviewService: ReviewService,
    @Value("\${wheelcheck.uploads.dir:uploads}") private val uploadsDir: String
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

    @PostMapping("/{id}/photos")
    fun uploadPhotos(
        @PathVariable id: UUID,
        @RequestParam("files") files: List<MultipartFile>,
        authentication: Authentication?
    ): ResponseEntity<ReviewDto> {
        val userId = authentication?.principal as? UUID
        val uploadPath = Paths.get(uploadsDir, "reviews", id.toString())
        Files.createDirectories(uploadPath)

        val urls = files.mapNotNull { file ->
            if (file.isEmpty) return@mapNotNull null
            val ext = file.originalFilename?.substringAfterLast('.', "jpg") ?: "jpg"
            val filename = "${UUID.randomUUID()}.$ext"
            val target = uploadPath.resolve(filename)
            file.transferTo(target.toFile())
            "/uploads/reviews/$id/$filename"
        }

        val updated = reviewService.addPhotos(id, urls, userId)
        return ResponseEntity.ok(updated)
    }
}
