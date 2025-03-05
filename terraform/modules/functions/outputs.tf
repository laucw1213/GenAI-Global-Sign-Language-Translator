# Functions模块输出

output "function_url" {
  description = "Cloud Function的URL"
  value       = google_cloudfunctions2_function.auth_function.service_config[0].uri
}

output "function_name" {
  description = "Cloud Function的名称"
  value       = google_cloudfunctions2_function.auth_function.name
}

output "function_id" {
  description = "Cloud Function的ID"
  value       = google_cloudfunctions2_function.auth_function.id
}
