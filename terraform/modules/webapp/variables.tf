# Webapp模块变量

variable "project_id" {
  description = "GCP项目ID"
  type        = string
}

variable "project_root" {
  description = "项目根目录路径"
  type        = string
}

variable "firebase_project" {
  description = "Firebase项目资源"
  type        = any
}

variable "env_file_created" {
  description = "环境文件创建标志"
  type        = any
  default     = null
}
