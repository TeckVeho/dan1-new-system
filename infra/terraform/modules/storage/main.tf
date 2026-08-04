# Cloud Storage buckets. 参照: docs/11_infrastructure.md §2.3
# Default set: dan1-uploads / dan1-reports / dan1-documents / dan1-exports / dan1-backups

resource "google_storage_bucket" "buckets" {
  for_each = var.buckets

  project                     = var.project_id
  name                        = "dan1-${each.key}-${var.environment}"
  location                    = var.region
  storage_class               = each.value.storage_class
  uniform_bucket_level_access = true
  force_destroy               = var.force_destroy

  public_access_prevention = "enforced"

  versioning {
    enabled = each.value.versioning
  }

  dynamic "lifecycle_rule" {
    for_each = each.value.lifecycle_rules
    content {
      condition {
        age = lifecycle_rule.value.age_days
      }
      action {
        type          = try(lifecycle_rule.value.delete, false) ? "Delete" : "SetStorageClass"
        storage_class = try(lifecycle_rule.value.delete, false) ? null : lifecycle_rule.value.storage_class
      }
    }
  }
}
