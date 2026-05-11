package com.wheelcheck.comment

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/comments")
@CrossOrigin(origins = ["*"])
class CommentController(
    private val commentService: CommentService
) {

    @GetMapping("/place/{placeId}")
    fun getCommentsByPlace(
        @PathVariable placeId: UUID,
        authentication: Authentication?
    ): ResponseEntity<List<CommentDto>> {
        val userId = authentication?.principal as? UUID
        return ResponseEntity.ok(commentService.getCommentsForPlace(placeId, userId))
    }

    @PostMapping
    fun createComment(
        @Valid @RequestBody request: CreateCommentRequest,
        authentication: Authentication?
    ): ResponseEntity<CommentDto> {
        val userId = authentication?.principal as? UUID
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        val comment = commentService.createComment(request, userId)
        return ResponseEntity.status(HttpStatus.CREATED).body(comment)
    }

    @PutMapping("/{id}")
    fun updateComment(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateCommentRequest,
        authentication: Authentication?
    ): ResponseEntity<CommentDto> {
        val userId = authentication?.principal as? UUID
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return ResponseEntity.ok(commentService.updateComment(id, request, userId))
    }

    @DeleteMapping("/{id}")
    fun deleteComment(
        @PathVariable id: UUID,
        authentication: Authentication?
    ): ResponseEntity<Void> {
        val userId = authentication?.principal as? UUID
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        commentService.deleteComment(id, userId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/vote")
    fun voteComment(
        @PathVariable id: UUID,
        @RequestParam type: String,
        authentication: Authentication?
    ): ResponseEntity<CommentDto> {
        val userId = authentication?.principal as? UUID
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        val isUpvote = when (type.lowercase()) {
            "up" -> true
            "down" -> false
            else -> throw IllegalArgumentException("Vote type must be 'up' or 'down'")
        }

        return ResponseEntity.ok(commentService.voteComment(id, userId, isUpvote))
    }
}
