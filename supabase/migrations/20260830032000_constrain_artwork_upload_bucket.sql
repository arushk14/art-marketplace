/*
# Constrain the artworks storage bucket

## Purpose
The `artworks` public bucket previously accepted any file type or size from
authenticated uploaders (relying entirely on client-side JS validation, which
is not trustworthy). This adds server-side enforcement so Supabase Storage
itself rejects non-image uploads and oversized files, defense-in-depth
alongside the client-side checks in uploadArtworkImage().

## Changes
- file_size_limit: 8 MB (matches the client-side limit)
- allowed_mime_types: common web image formats only

No data is modified or deleted; this only tightens future uploads.
*/

UPDATE storage.buckets
SET
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'artworks';
