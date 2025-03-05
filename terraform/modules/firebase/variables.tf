# Firebase模块变量

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

variable "service_account_email" {
  description = "服务账号电子邮件地址"
  type        = string
  default     = null
}
