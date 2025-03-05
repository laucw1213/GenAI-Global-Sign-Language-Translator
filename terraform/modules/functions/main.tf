# Functions模块 - 管理Cloud Functions

# 部署云函数 (2nd Gen)
resource "google_cloudfunctions2_function" "auth_function" {
  name        = "get-auth-token"
  location    = var.region
  description = "获取GCP身份验证令牌的函数"
  project     = var.project_id
  
  build_config {
    runtime     = "python39"
    entry_point = "get_auth_token"
    source {
      storage_source {
        bucket = var.function_bucket_name
        object = var.function_zip_object
      }
    }
  }
  
  service_config {
    max_instance_count = 1
    available_memory   = "256Mi"
    timeout_seconds    = 60
    environment_variables = {
      PROJECT_ID = var.project_id
    }
    service_account_email = var.function_service_account_email
  }
}

# 允许所有用户调用云函数
resource "google_cloud_run_service_iam_member" "function_invoker" {
  location = var.region
  project  = var.project_id
  service  = google_cloudfunctions2_function.auth_function.name
  role     = "roles/run.invoker"
  member   = "allUsers"  # 允许所有用户调用，包括未经身份验证的用户
}
