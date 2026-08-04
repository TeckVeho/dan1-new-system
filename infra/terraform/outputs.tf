output "web_url" {
  value = module.cloud_run_web.service_url
}

output "api_url" {
  value = module.cloud_run_api.service_url
}

output "job_runner_name" {
  value = module.cloud_run_job_runner.job_name
}

output "cloud_sql_connection_name" {
  value = module.cloud_sql.connection_name
}

output "cloud_sql_private_ip" {
  value = module.cloud_sql.private_ip_address
}

output "storage_bucket_names" {
  value = module.storage.bucket_names
}

output "vpc_network_id" {
  value = module.vpc.network_id
}
