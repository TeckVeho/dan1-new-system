output "network_id" {
  description = "Self link / ID of the VPC network."
  value       = google_compute_network.main.id
}

output "network_name" {
  value = google_compute_network.main.name
}

output "subnetwork_id" {
  value = google_compute_subnetwork.main.id
}

output "connector_id" {
  description = "Serverless VPC Access connector ID, to be attached to Cloud Run services."
  value       = google_vpc_access_connector.main.id
}

output "private_vpc_connection" {
  description = "Private service networking connection used as a dependency for Cloud SQL Private IP."
  value       = google_service_networking_connection.private_vpc_connection.id
}
