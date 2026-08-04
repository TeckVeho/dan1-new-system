output "bucket_names" {
  description = "Map of logical bucket key (uploads/reports/...) to actual bucket name."
  value       = { for key, bucket in google_storage_bucket.buckets : key => bucket.name }
}

output "bucket_urls" {
  value = { for key, bucket in google_storage_bucket.buckets : key => bucket.url }
}
