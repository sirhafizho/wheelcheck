package com.wheelcheck.photo

import com.drew.imaging.ImageMetadataReader
import com.drew.metadata.exif.ExifIFD0Directory
import com.wheelcheck.place.PlaceRepository
import org.imgscalr.Scalr
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.awt.image.BufferedImage
import java.io.File
import java.nio.file.Files
import java.nio.file.Paths
import java.util.*
import javax.imageio.ImageIO

@Service
class PhotoService(
    private val photoRepository: PhotoRepository,
    private val placeRepository: PlaceRepository,
    @Value("\${app.upload.directory:uploads}") private val uploadDirectory: String
) {
    
    init {
        Files.createDirectories(Paths.get(uploadDirectory))
    }
    
    @Transactional(readOnly = true)
    fun findByPlaceId(placeId: UUID): List<Photo> {
        return photoRepository.findByPlaceIdOrderByCreatedAtDesc(placeId)
    }
    
    @Transactional
    fun uploadPhoto(
        placeId: UUID,
        file: MultipartFile,
        userId: UUID? = null,
        description: String? = null
    ): Photo {
        val place = placeRepository.findByIdOrNull(placeId)
            ?: throw IllegalArgumentException("Place not found: $placeId")
        
        if (!isValidImageType(file.contentType)) {
            throw IllegalArgumentException("Invalid image type: ${file.contentType}. Only JPEG and PNG are allowed.")
        }

        // 10MB max file size
        if (file.size > 10 * 1024 * 1024) {
            throw IllegalArgumentException("File too large. Maximum size is 10MB.")
        }

        // Verify file content matches claimed type (magic bytes)
        val bytes = file.bytes
        if (!isValidImageContent(bytes)) {
            throw IllegalArgumentException("File content does not match a valid image format.")
        }
        
        val filename = "${UUID.randomUUID()}.jpg"
        val filePath = Paths.get(uploadDirectory, filename)
        
        // Read image, strip EXIF, resize
        val image = ImageIO.read(file.inputStream)
        val processedImage = processImage(image)
        
        // Save processed image
        ImageIO.write(processedImage, "jpg", filePath.toFile())
        
        val photo = Photo(
            place = place,
            userId = userId,
            filePath = filename,
            fileSize = Files.size(filePath),
            contentType = "image/jpeg",
            description = description
        )
        
        return photoRepository.save(photo)
    }
    
    private fun processImage(image: BufferedImage): BufferedImage {
        val maxDimension = 1200
        
        return if (image.width > maxDimension || image.height > maxDimension) {
            Scalr.resize(
                image,
                Scalr.Method.QUALITY,
                Scalr.Mode.FIT_TO_WIDTH,
                maxDimension,
                maxDimension,
                Scalr.OP_ANTIALIAS
            )
        } else {
            image
        }
    }
    
    private fun isValidImageType(contentType: String?): Boolean {
        return contentType in listOf("image/jpeg", "image/jpg", "image/png")
    }

    /** Verify magic bytes to prevent disguised file uploads */
    private fun isValidImageContent(bytes: ByteArray): Boolean {
        if (bytes.size < 4) return false
        // JPEG: FF D8 FF
        if (bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte() && bytes[2] == 0xFF.toByte()) return true
        // PNG: 89 50 4E 47
        if (bytes[0] == 0x89.toByte() && bytes[1] == 0x50.toByte() && bytes[2] == 0x4E.toByte() && bytes[3] == 0x47.toByte()) return true
        return false
    }
    
    fun getPhotoFile(photoId: UUID): File? {
        val photo = photoRepository.findByIdOrNull(photoId) ?: return null
        val file = Paths.get(uploadDirectory, photo.filePath).toFile()
        return if (file.exists()) file else null
    }
}
