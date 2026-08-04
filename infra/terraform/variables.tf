variable "project_id" {
  description = "GCP project ID for this environment (dan1-system-dev / -stg / -prod)."
  type        = string
}

variable "region" {
  type    = string
  default = "asia-northeast1"
}

variable "environment" {
  description = "dev | stg | prod. See docs/11_infrastructure.md §3."
  type        = string
  validation {
    condition     = contains(["dev", "stg", "prod"], var.environment)
    error_message = "environment must be dev, stg, or prod."
  }
}

variable "web_image" {
  description = "Container image for the Next.js `web` Cloud Run service. Placeholder until CI publishes a real tag."
  type        = string
  default     = "gcr.io/cloudrun/hello"
}

variable "api_image" {
  description = "Container image for the Express `api` Cloud Run service."
  type        = string
  default     = "gcr.io/cloudrun/hello"
}

variable "job_runner_image" {
  description = "Container image for the jobs/runner Cloud Run Job (see jobs/runner)."
  type        = string
  default     = "gcr.io/cloudrun/hello"
}

variable "web_min_instances" {
  description = "Cloud Run `web` minimum instances. docs/11_infrastructure.md recommends >=1 for stg/prod to avoid cold starts before the daily deadline."
  type        = number
  default     = 0
}

variable "web_max_instances" {
  type    = number
  default = 10
}

variable "api_min_instances" {
  type    = number
  default = 0
}

variable "api_max_instances" {
  type    = number
  default = 20
}

variable "cloud_sql_tier" {
  description = "e.g. db-f1-micro (dev) or db-custom-2-8192 (stg/prod)."
  type        = string
  default     = "db-f1-micro"
}

variable "cloud_sql_availability_type" {
  type    = string
  default = "ZONAL"
}

variable "cloud_sql_disk_size_gb" {
  type    = number
  default = 20
}

variable "cloud_sql_deletion_protection" {
  type    = bool
  default = false
}

variable "storage_force_destroy" {
  description = "Allow bucket deletion with objects still inside. Must stay false in prod."
  type        = bool
  default     = false
}
