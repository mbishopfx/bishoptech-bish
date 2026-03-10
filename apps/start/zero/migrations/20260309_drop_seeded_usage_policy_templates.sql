DELETE FROM usage_policy_template
WHERE id IN (
  'usage_policy_plus_chat_message',
  'usage_policy_pro_chat_message',
  'usage_policy_scale_chat_message',
  'usage_policy_enterprise_chat_message'
);
