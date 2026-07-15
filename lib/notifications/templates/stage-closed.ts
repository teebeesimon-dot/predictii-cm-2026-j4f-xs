import { defineNotificationTemplate } from '@/lib/notifications/plugins/define-plugin'

export default defineNotificationTemplate({
  id: 'stage-closed',
  title: '{{editionLabel}} — {{stageName}}',
  body: 'Pronosticurile pentru {{stageName}} s-au închis. Poți vedea acum ce au pariat colegii. Mult succes!',
  placeholders: ['editionLabel', 'stageName'],
  priority: 'normal',
})
