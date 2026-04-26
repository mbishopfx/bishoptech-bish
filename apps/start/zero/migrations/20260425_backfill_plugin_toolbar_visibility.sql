UPDATE org_plugin_installations
SET
  nav_visible = true,
  activated_at = COALESCE(activated_at, created_at),
  updated_at = (extract(epoch from now()) * 1000)::bigint
WHERE activation_status = 'active'
  AND nav_visible = false;
