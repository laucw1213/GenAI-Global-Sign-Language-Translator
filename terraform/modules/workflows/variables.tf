# Workflows模块变量

variable "project_id" {
  description = "GCP项目ID"
  type        = string
}

variable "region" {
  description = "GCP区域"
  type        = string
  default     = "us-central1"
}

variable "project_root" {
  description = "项目根目录路径"
  type        = string
}

variable "workflow_service_account_email" {
  description = "工作流服务账号的电子邮件地址"
  type        = string
}
