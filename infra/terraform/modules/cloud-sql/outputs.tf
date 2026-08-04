output "instance_name" {
  value = google_sql_database_instance.main.name
}

output "connection_name" {
  description = "Instance connection name, e.g. project:region:instance."
  value       = google_sql_database_instance.main.connection_name
}

output "private_ip_address" {
  value = google_sql_database_instance.main.private_ip_address
}

output "database_name" {
  value = google_sql_database.main.name
}

output "database_user" {
  value = google_sql_user.main.name
}

output "db_password_secret_id" {
  description = "Secret Manager secret ID holding the generated DB user password."
  value       = google_secret_manager_secret.db_password.secret_id
}
