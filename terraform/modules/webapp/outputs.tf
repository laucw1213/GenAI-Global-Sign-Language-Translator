# Webapp模块输出

output "deployment_status" {
  description = "前端部署状态"
  value       = "已完成"
  depends_on  = [null_resource.deploy_frontend]
}
