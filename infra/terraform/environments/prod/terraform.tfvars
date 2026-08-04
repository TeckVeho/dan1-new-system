# prod: 本番構成。docs/11_infrastructure.md §2, §3.1

project_id  = "dan1-system-prod"
region      = "asia-northeast1"
environment = "prod"

web_min_instances = 1
web_max_instances = 10
api_min_instances = 1
api_max_instances = 20

cloud_sql_tier                = "db-custom-2-8192"
cloud_sql_availability_type   = "ZONAL" # [要確認] HA (REGIONAL) は docs/11_infrastructure.md §6 の費用判断待ち
cloud_sql_disk_size_gb        = 100
cloud_sql_deletion_protection = true

storage_force_destroy = false

# Set to real Artifact Registry tags once CI publishes images.
# web_image        = "asia-northeast1-docker.pkg.dev/dan1-system-prod/dan1/web:latest"
# api_image        = "asia-northeast1-docker.pkg.dev/dan1-system-prod/dan1/api:latest"
# job_runner_image = "asia-northeast1-docker.pkg.dev/dan1-system-prod/dan1/job-runner:latest"
