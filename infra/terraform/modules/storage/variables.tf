variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "environment" {
  description = "dev / stg / prod. Used to make bucket names globally unique."
  type        = string
}

variable "force_destroy" {
  description = "Allow bucket deletion even if it still contains objects. Keep false for prod."
  type        = bool
  default     = false
}

variable "buckets" {
  description = "Bucket definitions. See docs/11_infrastructure.md §2.3 for the default set."
  type = map(object({
    storage_class = string
    versioning    = bool
    lifecycle_rules = list(object({
      age_days      = number
      storage_class = optional(string) # set for SetStorageClass actions
      delete        = optional(bool, false)
    }))
  }))

  default = {
    uploads = {
      storage_class    = "STANDARD"
      versioning       = false
      lifecycle_rules  = [{ age_days = 90, storage_class = "NEARLINE" }]
    }
    reports = {
      storage_class = "STANDARD"
      versioning    = true
      lifecycle_rules = [
        { age_days = 365, storage_class = "NEARLINE" },
        { age_days = 1095, storage_class = "COLDLINE" },
      ]
    }
    documents = {
      storage_class   = "STANDARD"
      versioning      = true
      lifecycle_rules = [{ age_days = 365, storage_class = "NEARLINE" }]
    }
    exports = {
      storage_class   = "STANDARD"
      versioning      = false
      lifecycle_rules = [{ age_days = 30, delete = true }]
    }
    backups = {
      storage_class   = "NEARLINE"
      versioning      = false
      lifecycle_rules = [{ age_days = 365, storage_class = "COLDLINE" }]
    }
  }
}
