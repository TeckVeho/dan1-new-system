# VPC network shared by Cloud Run (via Serverless VPC Access) and Cloud SQL (via Private IP).
# 参照: docs/11_infrastructure.md §2.5 Serverless VPC Access / Private IP

resource "google_compute_network" "main" {
  project                 = var.project_id
  name                    = var.network_name
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  project       = var.project_id
  name          = "${var.network_name}-${var.region}"
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = var.subnet_cidr

  private_ip_google_access = true
}

# Serverless VPC Access connector: lets Cloud Run reach Cloud SQL / Memorystore over Private IP.
resource "google_vpc_access_connector" "main" {
  project        = var.project_id
  name           = "${var.network_name}-connector"
  region         = var.region
  network        = google_compute_network.main.name
  ip_cidr_range  = var.connector_cidr
  min_instances  = var.connector_min_instances
  max_instances  = var.connector_max_instances
}

# Reserved range + private service connection required for Cloud SQL Private IP.
resource "google_compute_global_address" "private_service_range" {
  project       = var.project_id
  name          = "${var.network_name}-private-service-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
}
