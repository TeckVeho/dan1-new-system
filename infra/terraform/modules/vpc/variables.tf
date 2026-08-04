variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "GCP region, e.g. asia-northeast1."
  type        = string
}

variable "network_name" {
  description = "Name of the VPC network."
  type        = string
}

variable "subnet_cidr" {
  description = "Primary CIDR range for the regional subnet."
  type        = string
  default     = "10.10.0.0/20"
}

variable "connector_cidr" {
  description = "/28 CIDR range reserved for the Serverless VPC Access connector."
  type        = string
  default     = "10.10.16.0/28"
}

variable "connector_min_instances" {
  description = "Minimum number of Serverless VPC Access connector instances."
  type        = number
  default     = 2
}

variable "connector_max_instances" {
  description = "Maximum number of Serverless VPC Access connector instances."
  type        = number
  default     = 3
}
