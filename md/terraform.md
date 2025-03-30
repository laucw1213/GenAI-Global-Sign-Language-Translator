# Terraform 基础设施概述

本文档详细说明了ASL翻译应用的Terraform基础设施配置。

## 目录

1. [整体架构](#整体架构)
2. [核心API启用](#核心api启用)
3. [前端基础设施 (Webapp模块)](#前端基础设施-webapp模块)
4. [数据存储 (Firestore模块)](#数据存储-firestore模块)
5. [工作流处理 (Workflows模块)](#工作流处理-workflows模块)
6. [认证和令牌处理 (Functions模块)](#认证和令牌处理-functions模块)
7. [前端配置和部署](#前端配置和部署)
8. [资源依赖关系](#资源依赖关系)
9. [安全性考虑](#安全性考虑)
10. [部署指南](#部署指南)

## 整体架构

ASL翻译应用的基础设施由以下主要组件组成：

- **Firebase项目和Web应用**：用于前端托管和用户认证
- **Firestore数据库**：用于存储翻译记录和用户数据
- **Cloud Functions**：用于认证和令牌管理
- **Workflows**：用于ASL翻译处理流程
- **Cloud Storage**：用于存储视频文件和函数代码

这些组件通过Terraform配置文件进行管理，确保基础设施的一致性和可重复性。

## 核心API启用

首先，Terraform启用所有必要的Google Cloud API：

```hcl
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
}
```

## 前端基础设施 (Webapp模块)

### Firebase项目和Web应用

```hcl
# 创建Firebase项目
resource "google_firebase_project" "default" {
  project = var.project_id
}

# 创建Firebase Web应用
resource "google_firebase_web_app" "app" {
  display_name = "ASL Translator Web App"
}
```

### 服务账号和权限

```hcl
# 为默认服务账号分配权限
resource "google_project_iam_member" "default_sa_firebase_auth" {
  role    = "roles/identitytoolkit.admin"
}

resource "google_project_iam_member" "default_sa_firebase_develop" {
  role    = "roles/firebase.developAdmin"
}

resource "google_project_iam_member" "default_sa_token_creator" {
  role    = "roles/iam.serviceAccountTokenCreator"
}
```

## 数据存储 (Firestore模块)

### Firestore数据库

```hcl
# 创建Firestore数据库
resource "google_firestore_database" "database" {
  name         = "(default)"
  location_id  = var.firestore_location
  type         = "FIRESTORE_NATIVE"
}
```

### Firestore规则

```hcl
# 部署Firestore规则
resource "google_firebaserules_ruleset" "firestore" {
  source {
    files {
      name    = "firestore.rules"
      content = file("${var.project_root}/als_translator/firestore.rules")
    }
  }
}

resource "google_firebaserules_release" "firestore" {
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name
}
```

## 工作流处理 (Workflows模块)

### 工作流服务账号和权限

```hcl
# 创建工作流服务账号
resource "google_service_account" "workflow_sa" {
  account_id = "workflow-service-account"
}

# 分配多种权限
resource "google_project_iam_member" "workflow_sa_datastore" { 
  role = "roles/datastore.user" 
}
resource "google_project_iam_member" "workflow_sa_translate" { 
  role = "roles/cloudtranslate.user" 
}
resource "google_project_iam_member" "workflow_sa_ai_platform" { 
  role = "roles/aiplatform.user" 
}
# 以及其他权限...
```

### 视频存储桶

```hcl
# 创建视频存储桶
resource "google_storage_bucket" "video_bucket" {
  name     = "${var.project_id}-video-files"
  location = var.region
  
  cors {
    origin = ["*"]
    method = ["GET", "HEAD"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}
```

### 工作流定义

```hcl
# 部署工作流
resource "google_workflows_workflow" "asl_workflow" {
  name            = "asl-translation-workflow"
  service_account = google_service_account.workflow_sa.email
  source_contents = templatefile("${var.project_root}/backend/asl-workflow/workflow-terraform.yaml", {
    project_id = var.project_id
  })
}
```

## 认证和令牌处理 (Functions模块)

### 认证函数服务账号和权限

```hcl
# 创建认证函数服务账号
resource "google_service_account" "auth_function_sa" {
  account_id = "auth-function-service-account"
}

# 分配权限
resource "google_project_iam_member" "auth_function_firebase_auth" { 
  role = "roles/firebase.admin" 
}
resource "google_project_iam_member" "auth_function_token_creator" { 
  role = "roles/iam.serviceAccountTokenCreator" 
}
resource "google_project_iam_member" "auth_function_workflow_admin" { 
  role = "roles/workflows.admin" 
}
```

### 函数代码存储

```hcl
# 创建函数代码存储桶
resource "google_storage_bucket" "function_bucket" {
  name = "${var.project_id}-function-code"
}

# 打包和上传函数代码
data "archive_file" "function_zip" {
  type        = "zip"
  output_path = "${path.module}/function.zip"
  
  source {
    content  = file("${var.project_root}/backend/get-auth-token/get_auth_token.py")
    filename = "main.py"
  }
  
  source {
    content  = file("${var.project_root}/backend/get-auth-token/requirements.txt")
    filename = "requirements.txt"
  }
}

resource "google_storage_bucket_object" "function_zip" {
  name   = "function-${data.archive_file.function_zip.output_md5}.zip"
  bucket = google_storage_bucket.function_bucket.name
  source = data.archive_file.function_zip.output_path
}
```

### 云函数部署 (第二代)

```hcl
# 部署云函数 (2nd Gen)
resource "google_cloudfunctions2_function" "auth_function" {
  name        = "get-auth-token"
  description = "获取GCP身份验证令牌的函数"
  
  build_config {
    runtime     = "python39"
    entry_point = "get_auth_token"
    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.function_zip.name
      }
    }
  }
  
  service_config {
    max_instance_count = 1
    available_memory   = "256Mi"
    timeout_seconds    = 60
    environment_variables = {
      PROJECT_ID = var.project_id
    }
    service_account_email = google_service_account.auth_function_sa.email
  }
}

# 允许所有用户调用云函数
resource "google_cloud_run_service_iam_member" "function_invoker" {
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

## 前端配置和部署

### 环境变量配置

```hcl
# 创建.env文件
resource "local_file" "env_file" {
  filename = "${local.project_root}/als_translator/.env"
  content = <<-EOT
    # Firebase配置
    REACT_APP_FIREBASE_API_KEY=${module.webapp.web_app_config.api_key}
    REACT_APP_FIREBASE_AUTH_DOMAIN=${module.webapp.firebase_auth_domain}
    REACT_APP_FIREBASE_PROJECT_ID=${local.project_id}
    REACT_APP_FIREBASE_STORAGE_BUCKET=${module.webapp.web_app_config.storage_bucket}
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID=${module.webapp.web_app_config.messaging_sender_id}
    REACT_APP_FIREBASE_APP_ID=${module.webapp.firebase_app_id}
    REACT_APP_FIREBASE_MEASUREMENT_ID=${module.webapp.web_app_config.measurement_id}

    # API配置
    REACT_APP_HUGGING_FACE_TOKEN=${var.hugging_face_token}
    REACT_APP_WORKFLOW_URL=https://workflowexecutions.googleapis.com/v1/projects/${local.project_id}/locations/${var.region}/workflows/${module.workflows.workflow_name}/executions
    REACT_APP_AUTH_URL=${module.functions.function_url}
  EOT
}
```

### 前端部署

```hcl
# 部署Firebase前端
resource "null_resource" "deploy_frontend" {
  provisioner "local-exec" {
    working_dir = "${local.project_root}/als_translator"
    command     = "npm run deploy"
    environment = {
      PROJECT_ID = local.project_id
    }
  }
}
```

## 资源依赖关系

Terraform配置中的依赖关系确保资源按正确顺序创建：

1. 首先启用所有必要的API
2. 然后创建Firebase项目和Web应用
3. 接着创建Firestore数据库和规则
4. 同时部署工作流和云函数
5. 最后生成环境配置文件并部署前端

这些依赖关系通过`depends_on`参数进行管理，确保资源按正确的顺序创建。

## 安全性考虑

配置包含多个安全设置：

1. **服务账号隔离**：为不同组件使用专用服务账号
   - `auth-function-service-account`用于认证函数
   - `workflow-service-account`用于工作流
   - 默认App Engine服务账号用于Firebase操作

2. **最小权限原则**：每个服务账号只分配必要的权限
   - 认证函数服务账号：Firebase Admin、Token Creator、Workflows Admin
   - 工作流服务账号：Datastore User、Translation User、AI Platform User等

3. **认证控制**：使用Firebase认证和Cloud Functions进行令牌管理
   - 前端通过Firebase进行用户认证
   - 认证函数生成具有适当权限的GCP令牌

4. **Firestore规则**：通过规则文件控制数据访问
   - 规则定义在`als_translator/firestore.rules`文件中
   - 通过Terraform部署到Firestore

## 部署指南

### 前提条件

- 安装Terraform (v1.0.0+)
- 安装Google Cloud SDK
- 配置gcloud认证
- 创建Google Cloud项目

### 部署步骤

1. **初始化Terraform**
   ```bash
   cd terraform
   terraform init
   ```

2. **查看部署计划**
   ```bash
   terraform plan
   ```

3. **应用配置**
   ```bash
   terraform apply
   ```

4. **分步部署（可选）**
   ```bash
   # 只部署webapp模块
   terraform apply -target=module.webapp
   
   # 只部署firestore模块
   terraform apply -target=module.firestore
   
   # 只部署functions模块
   terraform apply -target=module.functions
   
   # 只部署workflows模块
   terraform apply -target=module.workflows
   ```

5. **销毁基础设施（谨慎使用）**
   ```bash
   terraform destroy
   ```

### 注意事项

- 首次部署可能需要10-15分钟
- 某些API可能需要手动启用
- 匿名登录需要在Firebase控制台中手动启用
- 确保已设置正确的IAM权限
