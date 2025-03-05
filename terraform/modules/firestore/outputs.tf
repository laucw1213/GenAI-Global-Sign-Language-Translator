# Firestore数据库输出
output "firestore_database" {
  value = google_firestore_database.database
}

# Firestore规则输出
output "firestore_rules" {
  value = google_firebaserules_release.firestore
}
