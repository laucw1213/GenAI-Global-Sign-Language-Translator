# Storage模块输出

output "video_bucket_name" {
  description = "视频存储桶名称"
  value       = google_storage_bucket.video_bucket.name
}

output "video_bucket_url" {
  description = "视频存储桶URL"
  value       = "gs://${google_storage_bucket.video_bucket.name}"
}

output "function_bucket_name" {
  description = "函数代码存储桶名称"
  value       = google_storage_bucket.function_bucket.name
}

output "function_zip_object" {
  description = "函数ZIP文件对象名称"
  value       = google_storage_bucket_object.function_zip.name
}

output "function_zip_md5" {
  description = "函数ZIP文件MD5哈希值"
  value       = data.archive_file.function_zip.output_md5
}
