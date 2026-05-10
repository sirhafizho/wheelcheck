package com.wheelcheck.photo

import org.springframework.core.io.FileSystemResource
import org.springframework.core.io.Resource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.util.*

@RestController
@RequestMapping("/api/photos")
@CrossOrigin(origins = ["*"])
class PhotoController(
    private val photoService: PhotoService
) {
    
    @GetMapping("/place/{placeId}")
    fun getPhotosByPlace(@PathVariable placeId: UUID): ResponseEntity<List<Photo>> {
        val photos = photoService.findByPlaceId(placeId)
        return ResponseEntity.ok(photos)
    }
    
    @PostMapping("/upload")
    fun uploadPhoto(
        @RequestParam placeId: UUID,
        @RequestParam file: MultipartFile,
        @RequestParam(required = false) description: String?,
        authentication: Authentication?
    ): ResponseEntity<Photo> {
        val userId = authentication?.principal as? UUID
        
        val photo = photoService.uploadPhoto(placeId, file, userId, description)
        return ResponseEntity.status(HttpStatus.CREATED).body(photo)
    }
    
    @GetMapping("/{photoId}")
    fun getPhoto(@PathVariable photoId: UUID): ResponseEntity<Resource> {
        val file = photoService.getPhotoFile(photoId)
            ?: return ResponseEntity.notFound().build()
        
        val resource = FileSystemResource(file)
        
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_JPEG)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"${file.name}\"")
            .body(resource)
    }
}
