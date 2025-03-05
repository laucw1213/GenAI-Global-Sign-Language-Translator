# Firebase模块 - 管理Firebase项目和Firestore数据库

# 创建Firebase项目
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id
}

# 添加延迟以确保Firebase设置完成
resource "time_sleep" "wait_for_firebase_setup" {
  depends_on = [
    google_firebase_project.default
  ]

  create_duration = "30s"
}

# 创建Firestore数据库
resource "google_firestore_database" "database" {
  provider    = google-beta
  project     = var.project_id
  name        = "(default)"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"
  
  depends_on = [
    time_sleep.wait_for_firebase_setup
  ]
}

# 部署Firestore规则
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

# 获取Web应用配置
resource "google_firebase_web_app" "app" {
  provider     = google-beta
  project      = var.project_id
  display_name = "ASL Translator Web App"
  depends_on   = [google_firebase_project.default]
}

# 获取Web应用的配置
data "google_firebase_web_app_config" "app" {
  provider   = google-beta
  web_app_id = google_firebase_web_app.app.app_id
}
