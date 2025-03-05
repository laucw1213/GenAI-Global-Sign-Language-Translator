# Firebase模块输出

output "firebase_project" {
  description = "Firebase项目"
  value       = google_firebase_project.default
}

output "firebase_app_id" {
  description = "Firebase Web应用ID"
  value       = google_firebase_web_app.app.app_id
}

output "web_app_config" {
  description = "Firebase Web应用配置"
  value       = data.google_firebase_web_app_config.app
}

output "firestore_database" {
  description = "Firestore数据库"
  value       = google_firestore_database.database
}

output "firestore_rules" {
  description = "Firestore规则"
  value       = google_firebaserules_release.firestore
}
