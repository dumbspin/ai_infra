package infra.security

import future.keywords.in

# Deny public access
deny[msg] {
  resource := input.resource_changes[_]
  resource.change.after.public_access == true
  msg := sprintf("resource %s has public_access set to true", [resource.address])
}

deny[msg] {
  resource := input.resource_changes[_]
  some label in resource.change.after.labels
  label.label == "public_access"
  label.value == "true"
  msg := sprintf("resource %s has public_access enabled in labels", [resource.address])
}

# Deny SSH
deny[msg] {
  resource := input.resource_changes[_]
  resource.change.after.ssh_enabled == true
  msg := "SSH must not be enabled on generated infrastructure"
}

deny[msg] {
  resource := input.resource_changes[_]
  some label in resource.change.after.labels
  label.label == "ssh_enabled"
  label.value == "true"
  msg := sprintf("resource %s has ssh_enabled in labels", [resource.address])
}

# Require owner tag or label
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "docker_container"
  not has_owner(resource.change.after)
  msg := sprintf("resource %s missing required 'owner' tag", [resource.address])
}

has_owner(after) {
  after.tags.owner != ""
}

has_owner(after) {
  some label in after.labels
  label.label == "owner"
  label.value != ""
}
