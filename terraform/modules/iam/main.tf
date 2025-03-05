# IAM模块 - 集中管理所有服务账号和权限

# 创建工作流服务账号
resource "google_service_account" "workflow_sa" {
  account_id   = "workflow-service-account"
  display_name = "Workflow Service Account"
  description  = "用于执行ASL翻译工作流的服务账号"
  project      = var.project_id
}

# 创建认证函数服务账号
resource "google_service_account" "auth_function_sa" {
  account_id   = "auth-function-service-account"
  display_name = "Auth Function Service Account"
  description  = "专用于身份验证函数的服务账号"
  project      = var.project_id
}

# 获取默认服务账号
data "google_app_engine_default_service_account" "default" {
  project = var.project_id
}

# 工作流服务账号权限
resource "google_project_iam_member" "workflow_sa_permissions" {
  for_each = toset([
    "roles/datastore.user",              # Cloud Datastore User
    "roles/cloudtranslate.user",         # Cloud Translation API User
    "roles/logging.logWriter",           # Logs Writer
    "roles/serviceusage.serviceUsageConsumer", # Service Usage Consumer
    "roles/aiplatform.user",             # Vertex AI User
    "roles/workflows.invoker"            # Workflows Invoker
  ])
  
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.workflow_sa.email}"
}

# 认证函数服务账号权限
resource "google_project_iam_member" "auth_function_sa_permissions" {
  for_each = toset([
    "roles/firebase.admin",              # Firebase Admin
    "roles/iam.serviceAccountTokenCreator", # Token Creator
    "roles/workflows.admin"              # Workflows Admin
  ])
  
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.auth_function_sa.email}"
}

# 默认服务账号权限
resource "google_project_iam_member" "default_sa_permissions" {
  for_each = toset([
    "roles/identitytoolkit.admin",       # Identity Toolkit Admin
    "roles/firebase.developAdmin",       # Firebase Developer
    "roles/iam.serviceAccountTokenCreator", # Token Creator
    "roles/datastore.user"               # Datastore User
  ])
  
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${data.google_app_engine_default_service_account.default.email}"
}
