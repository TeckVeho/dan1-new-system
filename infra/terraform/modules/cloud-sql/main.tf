# Cloud SQL for MySQL 8.0, Private IP only.
# 参照: docs/11_infrastructure.md §2.2

resource "google_sql_database_instance" "main" {
  project             = var.project_id
  name                = var.instance_name
  region              = var.region
  database_version    = "MYSQL_8_0"
  deletion_protection = var.deletion_protection

  settings {
    tier              = var.tier
    availability_type = var.availability_type
    disk_size         = var.disk_size_gb
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "18:00" # 03:00 JST
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = var.backup_retained_backups
      }
    }

    # innodb_buffer_pool_size should be set to ~70% of instance memory (docs/11_infrastructure.md §2.2).
    # The exact MB value depends on `var.tier` and must be computed / confirmed before apply.
    database_flags {
      name  = "ngram_token_size"
      value = "2"
    }
    database_flags {
      name  = "slow_query_log"
      value = "on"
    }
    database_flags {
      name  = "long_query_time"
      value = "1"
    }
    database_flags {
      name  = "max_connections"
      value = "200"
    }
  }

  depends_on = [var.private_vpc_connection]
}

resource "google_sql_database" "main" {
  project   = var.project_id
  name      = var.database_name
  instance  = google_sql_database_instance.main.name
  charset   = "utf8mb4"
  collation = "utf8mb4_0900_ai_ci"
}

resource "random_password" "db_user" {
  length  = 24
  special = false
}

resource "google_sql_user" "main" {
  project  = var.project_id
  name     = var.database_user
  instance = google_sql_database_instance.main.name
  password = random_password.db_user.result
}

# The generated password should be stored in Secret Manager (out of scope for this skeleton)
# and referenced by Cloud Run via `--set-secrets` rather than passed as a plain env var.
resource "google_secret_manager_secret" "db_password" {
  project   = var.project_id
  secret_id = "${var.instance_name}-db-password"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_user.result
}
