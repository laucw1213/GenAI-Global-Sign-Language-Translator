# IAM模块输出

output "workflow_service_account_email" {
  description = "工作流服务账号的电子邮件地址"
  value       = google_service_account.workflow_sa.email
}

output "auth_function_service_account_email" {
  description = "认证函数服务账号的电子邮件地址"
  value       = google_service_account.auth_function_sa.email
}

output "default_service_account_email" {
  description = "默认App Engine服务账号的电子邮件地址"
  value       = data.google_app_engine_default_service_account.default.email
}
