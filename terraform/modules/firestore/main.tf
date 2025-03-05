# Firestore模块 - 处理Firestore数据库和规则

# 创建 Firestore 数据库
resource "google_firestore_database" "database" {
  provider = google-beta
  project  = var.project_id
  name     = "(default)"
  location_id = var.firestore_location
  type     = "FIRESTORE_NATIVE"
  
  depends_on = [
    var.firebase_project
  ]
}

# 为默认服务账号分配Firestore权限
resource "google_project_iam_member" "default_sa_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"  # Datastore User (替代 firestore.dataUser)
  member  = "serviceAccount:${var.service_account_email}"
}

# 部署 Firestore 规则
resource "google_firebaserules_ruleset" "firestore" {
  provider = google-beta
  project  = var.project_id
  source {
    files {
      name    = "firestore.rules"
      content = file("${var.project_root}/als_translator/firestore.rules")
    }
  }
}

resource "google_firebaserules_release" "firestore" {
  provider     = google-beta
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name
  project      = var.project_id
}
