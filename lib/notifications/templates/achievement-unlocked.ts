import { defineNotificationTemplate } from '@/lib/notifications/plugins/define-plugin'

export default defineNotificationTemplate({
  id: 'achievement-unlocked',
  title: 'Achievement deblocat: {{achievementTitle}}',
  body: '{{achievementDescription}}',
  placeholders: ['achievementTitle', 'achievementDescription'],
  priority: 'normal',
})
