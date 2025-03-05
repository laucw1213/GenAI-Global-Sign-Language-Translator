# 主配置文件 - 调用各个模块

# 启用所需API
resource "google_project_service" "services" {
  for_each = toset([
    "firebase.googleapis.com",          # Firebase API
    "firestore.googleapis.com",         # Firestore数据库
    "cloudfunctions.googleapis.com",    # Cloud Functions
    "run.googleapis.com",               # Cloud Run (用于第二代Cloud Functions)
    "eventarc.googleapis.com",          # Eventarc (用于第二代Cloud Functions)
    "workflows.googleapis.com",         # Workflows
    "storage.googleapis.com",           # Cloud Storage
    "translate.googleapis.com",         # Translation API
    "aiplatform.googleapis.com",        # Vertex AI (Gemini)
    "artifactregistry.googleapis.com",  # Artifact Registry
    "cloudbuild.googleapis.com",        # Cloud Build
    "identitytoolkit.googleapis.com"    # Identity Platform
  ])
  
  project = local.project_id
  service = each.key
  
  disable_on_destroy = false
}

# 使用IAM模块
module "iam" {
  source = "./modules/iam"
  
  project_id = local.project_id
  region     = var.region
  
  depends_on = [
    google_project_service.services
  ]
}

# 使用Storage模块
module "storage" {
  source = "./modules/storage"
  
  project_id   = local.project_id
  region       = var.region
  project_root = local.project_root
  
  depends_on = [
    google_project_service.services
  ]
}

# 使用Firebase模块
module "firebase" {
  source = "./modules/firebase"
  
  project_id           = local.project_id
  firestore_location   = var.firestore_location
  project_root         = local.project_root
  service_account_email = module.iam.default_service_account_email
  
  depends_on = [
    google_project_service.services,
    module.iam
  ]
}

# 使用Workflows模块
module "workflows" {
  source = "./modules/workflows"
  
  project_id                   = local.project_id
  region                       = var.region
  project_root                 = local.project_root
  workflow_service_account_email = module.iam.workflow_service_account_email
  
  depends_on = [
    google_project_service.services,
    module.iam
  ]
}

# 使用Functions模块
module "functions" {
  source = "./modules/functions"
  
  project_id                   = local.project_id
  region                       = var.region
  function_service_account_email = module.iam.auth_function_service_account_email
  function_bucket_name         = module.storage.function_bucket_name
  function_zip_object          = module.storage.function_zip_object
  
  depends_on = [
    google_project_service.services,
    module.iam,
    module.storage
  ]
}

# 创建.env文件
resource "local_file" "env_file" {
  filename = "${local.project_root}/als_translator/.env"
  content = <<-EOT
# Firebase配置（前端使用）
REACT_APP_FIREBASE_API_KEY=${module.firebase.web_app_config.api_key}
REACT_APP_FIREBASE_AUTH_DOMAIN=${local.project_id}.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=${local.project_id}
REACT_APP_FIREBASE_STORAGE_BUCKET=${local.project_id}.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=${module.firebase.web_app_config.messaging_sender_id}
REACT_APP_FIREBASE_APP_ID=${module.firebase.firebase_app_id}
REACT_APP_FIREBASE_MEASUREMENT_ID=${module.firebase.web_app_config.measurement_id}

# API配置（前端使用）
REACT_APP_HUGGING_FACE_TOKEN=${var.hugging_face_token}
REACT_APP_WORKFLOW_URL=https://workflowexecutions.googleapis.com/v1/projects/${local.project_id}/locations/${var.region}/workflows/${module.workflows.workflow_name}/executions
REACT_APP_AUTH_URL=${module.functions.function_url}
EOT

  depends_on = [
    module.firebase,
    module.functions,
    module.workflows
  ]
}

# 使用Webapp模块
module "webapp" {
  source = "./modules/webapp"
  
  project_id       = local.project_id
  project_root     = local.project_root
  firebase_project = module.firebase.firebase_project
  env_file_created = local_file.env_file
  
  depends_on = [
    google_project_service.services,
    module.firebase,
    local_file.env_file
  ]
}
