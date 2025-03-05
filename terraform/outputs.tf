# 根输出

output "project_id" {
  description = "GCP项目ID"
  value       = local.project_id
}

output "region" {
  description = "GCP区域"
  value       = var.region
}

output "firebase_auth_domain" {
  description = "Firebase认证域名"
  value       = "${local.project_id}.firebaseapp.com"
}

output "firebase_storage_bucket" {
  description = "Firebase存储桶"
  value       = "${local.project_id}.appspot.com"
}

output "workflow_url" {
  description = "工作流URL"
  value       = "https://workflowexecutions.googleapis.com/v1/projects/${local.project_id}/locations/${var.region}/workflows/${module.workflows.workflow_name}/executions"
}

output "auth_url" {
  description = "认证函数URL"
  value       = module.functions.function_url
}

output "video_bucket_url" {
  description = "视频存储桶URL"
  value       = module.storage.video_bucket_url
}
