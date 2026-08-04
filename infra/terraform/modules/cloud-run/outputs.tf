output "service_url" {
  description = "Public URL, set only when type = \"service\"."
  value       = var.type == "service" ? google_cloud_run_v2_service.service[0].uri : null
}

output "service_name" {
  value = var.type == "service" ? google_cloud_run_v2_service.service[0].name : null
}

output "job_name" {
  description = "Set only when type = \"job\"."
  value       = var.type == "job" ? google_cloud_run_v2_job.job[0].name : null
}
