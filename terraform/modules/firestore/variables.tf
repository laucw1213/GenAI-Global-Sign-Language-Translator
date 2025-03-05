variable "project_id" {
  description = "GCP项目ID"
  type        = string
}

variable "firestore_location" {
  description = "Firestore数据库位置"
  type        = string
  default     = "us-central1"
}

variable "project_root" {
  description = "项目根目录路径"
  type        = string
}

variable "firebase_project" {
  description = "Firebase项目资源"
  type        = any
}

variable "service_account_email" {
  description = "服务账号电子邮件"
  type        = string
}
