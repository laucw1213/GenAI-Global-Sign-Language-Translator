# Workflows模块输出

output "workflow_name" {
  description = "工作流名称"
  value       = google_workflows_workflow.asl_workflow.name
}

output "workflow_id" {
  description = "工作流ID"
  value       = google_workflows_workflow.asl_workflow.id
}

output "workflow_revision_id" {
  description = "工作流修订版本ID"
  value       = google_workflows_workflow.asl_workflow.revision_id
}
