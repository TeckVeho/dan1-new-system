# dev: 開発者の動作確認用。最小構成。docs/11_infrastructure.md §3.1

project_id  = "dan1-system-dev"
region      = "asia-northeast1"
environment = "dev"

web_min_instances = 0
web_max_instances = 3
api_min_instances = 0
api_max_instances = 5

cloud_sql_tier                = "db-f1-micro"
cloud_sql_availability_type   = "ZONAL"
cloud_sql_disk_size_gb        = 20
cloud_sql_deletion_protection = false

storage_force_destroy = true

# Set to real Artifact Registry tags once CI publishes images.
# web_image        = "asia-northeast1-docker.pkg.dev/dan1-system-dev/dan1/web:latest"
# api_image        = "asia-northeast1-docker.pkg.dev/dan1-system-dev/dan1/api:latest"
# job_runner_image = "asia-northeast1-docker.pkg.dev/dan1-system-dev/dan1/job-runner:latest"
