package com.wheelcheck.review

import jakarta.validation.Valid
import org.imgscalr.Scalr
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.nio.file.Files
import java.nio.file.Paths
import java.util.*
import javax.imageio.ImageIO

@RestController
@RequestMapping("/api/reviews")
class ReviewController(
    private val reviewService: ReviewService,
    @Value("\${wheelcheck.uploads.dir:uploads}") private val uploadsDir: String
) {

    companion object {
        private val ALLOWED_CONTENT_TYPES = setOf("image/jpeg", "image/jpg", "image/png")
        private const val MAX_FILE_SIZE = 10L * 1024 * 1024 // 10MB
        private const val MAX_DIMENSION = 1200
    }
    
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

    @PutMapping("/{id}")
    fun updateReview(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateReviewRequest,
        authentication: Authentication?
    ): ResponseEntity<ReviewDto> {
        val userId = authentication?.principal as? UUID
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val updated = reviewService.update(id, request, userId)
        return ResponseEntity.ok(updated)
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

            // Validate content type
            if (file.contentType !in ALLOWED_CONTENT_TYPES) {
                throw IllegalArgumentException("Invalid image type: ${file.contentType}. Only JPEG and PNG are allowed.")
            }

            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                throw IllegalArgumentException("File too large. Maximum size is 10MB.")
            }

            // Verify magic bytes match a real image
            val bytes = file.bytes
            if (!isValidImageContent(bytes)) {
                throw IllegalArgumentException("File content does not match a valid image format.")
            }

            // Re-encode through ImageIO to strip EXIF and sanitize content
            val image = ImageIO.read(file.inputStream)
                ?: throw IllegalArgumentException("Unable to read image file.")
            val processed = if (image.width > MAX_DIMENSION || image.height > MAX_DIMENSION) {
                Scalr.resize(image, Scalr.Method.QUALITY, Scalr.Mode.FIT_TO_WIDTH, MAX_DIMENSION, MAX_DIMENSION, Scalr.OP_ANTIALIAS)
            } else {
                image
            }

            // Always save as .jpg with a random UUID filename
            val filename = "${UUID.randomUUID()}.jpg"
            val target = uploadPath.resolve(filename)
            ImageIO.write(processed, "jpg", target.toFile())
            "/uploads/reviews/$id/$filename"
        }

        val updated = reviewService.addPhotos(id, urls, userId)
        return ResponseEntity.ok(updated)
    }

    private fun isValidImageContent(bytes: ByteArray): Boolean {
        if (bytes.size < 4) return false
        // JPEG: FF D8 FF
        if (bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte() && bytes[2] == 0xFF.toByte()) return true
        // PNG: 89 50 4E 47
        if (bytes[0] == 0x89.toByte() && bytes[1] == 0x50.toByte() && bytes[2] == 0x4E.toByte() && bytes[3] == 0x47.toByte()) return true
        return false
    }
}
