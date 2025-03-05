# Functions模块变量

variable "project_id" {
  description = "GCP项目ID"
  type        = string
}

variable "region" {
  description = "GCP区域"
  type        = string
  default     = "us-central1"
}

variable "function_service_account_email" {
  description = "函数服务账号的电子邮件地址"
  type        = string
}

variable "function_bucket_name" {
  description = "函数代码存储桶名称"
  type        = string
}

variable "function_zip_object" {
  description = "函数ZIP文件对象名称"
  type        = string
}
