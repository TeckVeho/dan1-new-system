# dan1-new-system — Terraform skeleton for GCP (dev / stg / prod).
#
# This scaffolds the infrastructure described in docs/11_infrastructure.md but does NOT
# apply cleanly out of the box: it requires a real GCP project with billing enabled and
# credentials configured locally (or via Workload Identity in CI). See README.md.

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Partial backend config: run `terraform init -backend-config=environments/<env>/backend.hcl`
  # so each environment's state lives in its own GCS bucket/prefix (docs/11_infrastructure.md §3.3).
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  name_prefix = "dan1-${var.environment}"
}

# --- APIs required by the resources below. Enabling them is idempotent. ---
resource "google_project_service" "required" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "vpcaccess.googleapis.com",
    "servicenetworking.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
    "artifactregistry.googleapis.com",
    "compute.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

module "vpc" {
  source = "./modules/vpc"

  project_id   = var.project_id
  region       = var.region
  network_name = "${local.name_prefix}-vpc"

  depends_on = [google_project_service.required]
}

module "cloud_sql" {
  source = "./modules/cloud-sql"

  project_id             = var.project_id
  region                 = var.region
  instance_name          = "${local.name_prefix}-mysql"
  tier                   = var.cloud_sql_tier
  availability_type      = var.cloud_sql_availability_type
  disk_size_gb           = var.cloud_sql_disk_size_gb
  deletion_protection    = var.cloud_sql_deletion_protection
  network_id             = module.vpc.network_id
  private_vpc_connection = module.vpc.private_vpc_connection
}

module "storage" {
  source = "./modules/storage"

  project_id    = var.project_id
  region        = var.region
  environment   = var.environment
  force_destroy = var.storage_force_destroy
}

module "cloud_run_web" {
  source = "./modules/cloud-run"

  project_id             = var.project_id
  region                 = var.region
  name                   = "${local.name_prefix}-web"
  type                   = "service"
  image                  = var.web_image
  cpu                    = "1"
  memory                 = "512Mi"
  min_instances          = var.web_min_instances
  max_instances          = var.web_max_instances
  allow_unauthenticated  = true
  vpc_connector_id       = module.vpc.connector_id
  env_vars = {
    NODE_ENV             = var.environment == "prod" ? "production" : var.environment
    NEXT_PUBLIC_API_URL  = module.cloud_run_api.service_url
  }
}

module "cloud_run_api" {
  source = "./modules/cloud-run"

  project_id             = var.project_id
  region                 = var.region
  name                   = "${local.name_prefix}-api"
  type                   = "service"
  image                  = var.api_image
  cpu                    = "2"
  memory                 = "1Gi"
  min_instances          = var.api_min_instances
  max_instances          = var.api_max_instances
  allow_unauthenticated  = false
  vpc_connector_id       = module.vpc.connector_id
  env_vars = {
    NODE_ENV = var.environment == "prod" ? "production" : var.environment
  }
  secret_env_vars = {
    DATABASE_URL = {
      secret_id = module.cloud_sql.db_password_secret_id
    }
  }
}

module "cloud_run_job_runner" {
  source = "./modules/cloud-run"

  project_id       = var.project_id
  region           = var.region
  name             = "${local.name_prefix}-job-runner"
  type             = "job"
  image            = var.job_runner_image
  cpu              = "2"
  memory           = "2Gi"
  timeout_seconds  = 1800 # 30分。docs/11_infrastructure.md §2.4
  task_count       = 1
  max_retries      = 3
  vpc_connector_id = module.vpc.connector_id
  env_vars = {
    NODE_ENV = var.environment == "prod" ? "production" : var.environment
  }
  secret_env_vars = {
    DATABASE_URL = {
      secret_id = module.cloud_sql.db_password_secret_id
    }
  }
}
