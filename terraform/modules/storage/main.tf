# Storage模块 - 管理所有存储桶和函数代码打包

# 创建视频存储桶
resource "google_storage_bucket" "video_bucket" {
  name     = "${var.project_id}-video-files"
  location = var.region
  project  = var.project_id
  
  uniform_bucket_level_access = true
  
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

# 创建函数代码存储桶
resource "google_storage_bucket" "function_bucket" {
  name     = "${var.project_id}-function-code"
  location = var.region
  project  = var.project_id
  
  uniform_bucket_level_access = true
}

# 创建云函数部署包
data "archive_file" "function_zip" {
  type        = "zip"
  output_path = "${path.module}/function.zip"
  
  source {
    content  = file("${var.project_root}/backend/get-auth-token/get_auth_token.py")
    filename = "main.py"
  }
  
  source {
    content  = file("${var.project_root}/backend/get-auth-token/requirements.txt")
    filename = "requirements.txt"
  }
}

# 上传函数到存储桶
resource "google_storage_bucket_object" "function_zip" {
  name   = "function-${data.archive_file.function_zip.output_md5}.zip"
  bucket = google_storage_bucket.function_bucket.name
  source = data.archive_file.function_zip.output_path
}

# 等待Cloud Build API完全启用
resource "time_sleep" "wait_for_cloudbuild" {
  create_duration = "30s"
  
  depends_on = [
    google_storage_bucket_object.function_zip
  ]
}
