variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "instance_name" {
  description = "Cloud SQL instance name, e.g. dan1-mysql-dev."
  type        = string
}

variable "database_name" {
  type    = string
  default = "dan1"
}

variable "database_user" {
  type    = string
  default = "dan1"
}

variable "tier" {
  description = "Machine tier, e.g. db-f1-micro (dev) or db-custom-2-8192 (stg/prod). See docs/11_infrastructure.md §2.2."
  type        = string
}

variable "disk_size_gb" {
  type    = number
  default = 100
}

variable "availability_type" {
  description = "ZONAL or REGIONAL (HA)."
  type        = string
  default     = "ZONAL"
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "backup_retained_backups" {
  type    = number
  default = 30
}

variable "network_id" {
  description = "VPC network ID for Private IP connectivity (module.vpc.network_id)."
  type        = string
}

variable "private_vpc_connection" {
  description = "Dependency on module.vpc's private service networking connection."
  type        = string
}
