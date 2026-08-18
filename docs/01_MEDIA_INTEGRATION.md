# Product Media & Cloudinary Integration

## Overview

The Product Media layer manages product-level media assets (images and videos) for the e-commerce catalog. The architecture uses **Cloudinary** for binary asset storage and global CDN delivery, while **PostgreSQL** (`product_media` table) stores metadata and cloud references (`publicId`, `url`, `altText`, `displayOrder`).

---

## Architectural Principles

1. **Cloudinary owns actual media files**: Binary media files are streamed directly to Cloudinary and rendered via Cloudinary CDN URLs.
2. **PostgreSQL owns metadata**: Database maintains ownership relationships (`ProductMedia.productId -> Product.id`), asset display ordering, accessibility alt text, and the backend cloud identifier (`publicId`).
3. **Storage Abstraction**: The Catalog module communicates through the provider-independent `MediaStorageProvider` interface (`MEDIA_STORAGE_PROVIDER` token), allowing Cloudinary to be swapped for AWS S3 or Azure Blob Storage in the future.
4. **Network vs Transaction Boundaries**: Network calls to Cloudinary operate outside PostgreSQL ACID transactions.
5. **Compensating Actions & Deletion Strategy**:
   - **Upload Compensation**: If Cloudinary upload succeeds but PostgreSQL insertion fails, a compensating Cloudinary deletion is triggered immediately.
   - **Deletion Order**: When an asset is deleted via API, Cloudinary asset deletion is invoked first (idempotent), followed by removing the PostgreSQL `product_media` record.

---

## Data Flow Diagram

```
                      +-----------------------------+
                      |   Frontend / Web Client     |
                      +--------------+--------------+
                                     |
                1. Multipart Upload  |  3. Render Image via CDN
                 (POST /media)       |     (Direct URL)
                                     v
+------------------------------------+------------------------------------+
|  NestJS Backend Architecture                                            |
|                                                                         |
|  +---------------------------+       +-------------------------------+  |
|  | ProductMediaController    |       | Cloudinary Delivery CDN       |  |
|  +-------------+-------------+       +---------------+---------------+  |
|                |                                     ^                  |
|                v                                     |                  |
|  +-------------+-------------+      2. Secure        |                  |
|  | ProductMediaService       | ---- Upload Request --+                  |
|  +------+--------------+-----+                                          |
|         |              |                                                |
|         |              v                                                |
|         |    +---------+-----------------------+                        |
|         |    | MediaStorageProvider            | (Storage Abstraction)  |
|         |    |   └─ CloudinaryMediaProvider    |                        |
|         |    +---------------------------------+                        |
|         v                                                               |
|  +------+--------------------+                                          |
|  | PostgreSQL DB             |                                          |
|  |   └─ product_media table  |                                          |
|  +---------------------------+                                          |
+-------------------------------------------------------------------------+
```

---

## Environment Configuration

Configure the following environment variables in `.env` / `.env.development`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=products
MEDIA_IMAGE_MAX_SIZE_BYTES=5242880
MEDIA_VIDEO_MAX_SIZE_BYTES=52428800
```

> [!IMPORTANT]
> Never expose `CLOUDINARY_API_SECRET` through API responses or DTOs.

---

## API Endpoints

### 1. Upload Product Media (Admin Only)
- **Route**: `POST /api/v1/catalog/products/:productId/media` (or `/api/v1/products/:productId/media`)
- **Header**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Content-Type**: `multipart/form-data`
- **Payload**:
  - `file` (binary, required)
  - `altText` (string, optional)
  - `displayOrder` (integer, optional, default 0)
  - `type` (`IMAGE` or `VIDEO`, optional)
- **Response** (`201 Created`):
```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "productId": "e5f6a7b8-9012-34cd-ef56-789012345678",
  "url": "https://res.cloudinary.com/demo/image/upload/v12345/products/e5f6a7b8/prod-media-123.jpg",
  "slug": "prod-media-e5f6a7b8-12345678",
  "type": "IMAGE",
  "altText": "Nike black running shoe side view",
  "displayOrder": 0,
  "isActive": true,
  "createdAt": "2026-08-16T22:00:00.000Z",
  "updatedAt": "2026-08-16T22:00:00.000Z"
}
```

### 2. Delete Product Media (Admin Only)
- **Route**: `DELETE /api/v1/catalog/products/:productId/media/:mediaId` (or `/api/v1/products/:productId/media/:mediaId`)
- **Header**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response**: `204 No Content`

---

## Supported Media Formats & Validation

| Media Type | Allowed MIME Types | Default Max Size | Config Key |
| :--- | :--- | :--- | :--- |
| **IMAGE** | `image/jpeg`, `image/png`, `image/webp` | 5 MB (`5,242,880` bytes) | `MEDIA_IMAGE_MAX_SIZE_BYTES` |
| **VIDEO** | `video/mp4`, `video/webm` | 50 MB (`52,428,800` bytes) | `MEDIA_VIDEO_MAX_SIZE_BYTES` |

---

## Local Development & Testing

1. Ensure PostgreSQL and Redis containers are active (`docker compose up -d`).
2. Run database migrations:
   `npm run migration:run`
3. Execute unit test suite:
   `npm run test src/modules/catalog/services/product-media.service.spec.ts`
4. Execute application build:
   `npm run build`
