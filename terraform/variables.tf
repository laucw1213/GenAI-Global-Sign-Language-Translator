variable "project_id" {
  description = "GCP项目ID"
  type        = string
  # 移除默认值，用户必须提供项目ID
}

variable "region" {
  description = "GCP资源部署区域"
  type        = string
  default     = "us-central1"
}

variable "firestore_location" {
  description = "Firestore数据库位置"
  type        = string
  default     = "us-central1"
}

variable "hugging_face_token" {
  description = "Hugging Face API令牌（需要在terraform.tfvars中设置）"
  type        = string
  sensitive   = true
}

# 使用locals设置project_id
locals {
  project_id = var.project_id
  project_root = abspath("${path.module}/..")
}
