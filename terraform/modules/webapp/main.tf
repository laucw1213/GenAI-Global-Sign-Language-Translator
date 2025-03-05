# Webapp模块 - 管理Web应用部署

# 部署Firebase前端
resource "null_resource" "deploy_frontend" {
  triggers = {
    always_run = "${timestamp()}"  # 添加触发器使其每次都运行
  }

  provisioner "local-exec" {
    working_dir = "${var.project_root}/als_translator"
    command     = "npm run deploy"
    environment = {
      PROJECT_ID = var.project_id
    }
  }
  
  depends_on = [
    var.env_file_created,
    var.firebase_project
  ]
}
