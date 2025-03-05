# Workflows模块 - 管理Workflows

# 创建workflows服务代理激活等待
resource "time_sleep" "wait_for_workflow_agent" {
  create_duration = "30s"
}

# 部署工作流
resource "google_workflows_workflow" "asl_workflow" {
  name            = "asl-translation-workflow"
  region          = var.region
  description     = "ASL翻译工作流"
  service_account = var.workflow_service_account_email
  project         = var.project_id
  
  source_contents = templatefile("${var.project_root}/backend/asl-workflow/workflow-terraform.yaml", {
    project_id = var.project_id
  })
  
  depends_on = [
    time_sleep.wait_for_workflow_agent
  ]
}
