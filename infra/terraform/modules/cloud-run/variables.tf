variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name" {
  description = "Cloud Run resource name, e.g. dan1-web-dev."
  type        = string
}

variable "type" {
  description = "\"service\" for web/api, \"job\" for Cloud Run Jobs (imports/calculations/reports/...)."
  type        = string
  validation {
    condition     = contains(["service", "job"], var.type)
    error_message = "type must be \"service\" or \"job\"."
  }
}

variable "image" {
  description = "Container image URL, e.g. asia-northeast1-docker.pkg.dev/PROJECT/dan1/web:latest. Placeholder until CI pushes a real image."
  type        = string
  default     = "gcr.io/cloudrun/hello"
}

variable "service_account_email" {
  type    = string
  default = null
}

variable "cpu" {
  type    = string
  default = "1"
}

variable "memory" {
  type    = string
  default = "512Mi"
}

variable "timeout_seconds" {
  type    = number
  default = 300
}

variable "min_instances" {
  description = "Service only. See docs/11_infrastructure.md §2.1 for why min=1 is used in stg/prod."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Service: concurrent request scaling. Job: parallel task count."
  type        = number
  default     = 5
}

variable "task_count" {
  description = "Job only: number of tasks per execution."
  type        = number
  default     = 1
}

variable "max_retries" {
  description = "Job only."
  type        = number
  default     = 3
}

variable "allow_unauthenticated" {
  description = "Service only. Should be false for the api service (IAP/internal ingress instead)."
  type        = bool
  default     = false
}

variable "ingress" {
  description = "Service only: INGRESS_TRAFFIC_ALL | INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER | INGRESS_TRAFFIC_INTERNAL_ONLY."
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"
}

variable "vpc_connector_id" {
  description = "Serverless VPC Access connector ID (module.vpc.connector_id) for reaching Cloud SQL / Redis."
  type        = string
  default     = null
}

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "secret_env_vars" {
  description = "Map of env var name to { secret_id, version }, resolved via Secret Manager."
  type = map(object({
    secret_id = string
    version   = optional(string, "latest")
  }))
  default = {}
}
