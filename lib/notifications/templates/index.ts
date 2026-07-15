import type {
  NotificationPriority,
  NotificationTask,
  RecipientType,
} from '@/lib/notifications/types'

export type NotificationTemplateId =
  | 'deadline-24h'
  | 'deadline-3h'
  | 'deadline-1h'
  | 'deadline-15m'
  | 'stage-opened'
  | 'stage-closed'

export interface NotificationTemplate {
  title: string
  body: string
  placeholders: readonly string[]
  priority: NotificationPriority
}

export const NOTIFICATION_TEMPLATES: Record<
  NotificationTemplateId,
  NotificationTemplate
> = {
  'deadline-24h': {
    title: '{{editionLabel}} — pronosticuri',
    body: 'Mai ai 24 de ore până la închiderea etapei „{{stageName}}”. Încă nu ai completat toate pronosticurile!',
    placeholders: ['editionLabel', 'stageName'],
    priority: 'high',
  },
  'deadline-3h': {
    title: '{{editionLabel}} — pronosticuri',
    body: 'Mai ai 3 ore până la închiderea etapei „{{stageName}}”. Încă nu ai completat toate pronosticurile!',
    placeholders: ['editionLabel', 'stageName'],
    priority: 'high',
  },
  'deadline-1h': {
    title: '{{editionLabel}} — pronosticuri',
    body: 'Mai ai 1 oră până la închiderea etapei „{{stageName}}”. Încă nu ai completat toate pronosticurile!',
    placeholders: ['editionLabel', 'stageName'],
    priority: 'high',
  },
  'deadline-15m': {
    title: '{{editionLabel}} — pronosticuri',
    body: 'Mai ai 15 minute până la închiderea etapei „{{stageName}}”. Încă nu ai completat toate pronosticurile!',
    placeholders: ['editionLabel', 'stageName'],
    priority: 'high',
  },
  'stage-opened': {
    title: '{{editionLabel}} — {{stageName}}',
    body: 'S-a deschis {{stageName}} ({{stageLabel}}). Intră și pune-ți pronosticurile!',
    placeholders: ['editionLabel', 'stageName', 'stageLabel'],
    priority: 'normal',
  },
  'stage-closed': {
    title: '{{editionLabel}} — {{stageName}}',
    body: 'Pronosticurile pentru {{stageName}} s-au închis. Poți vedea acum ce au pariat colegii. Mult succes!',
    placeholders: ['editionLabel', 'stageName'],
    priority: 'normal',
  },
}

export type TemplateValues = Record<string, string | number>

function renderText(template: string, values: TemplateValues): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(values[key] ?? `{{${key}}}`),
  )
}

export function renderNotificationTemplate(
  templateId: NotificationTemplateId,
  values: TemplateValues,
): Pick<NotificationTask, 'title' | 'body' | 'priority'> {
  const template = NOTIFICATION_TEMPLATES[templateId]
  const missing = template.placeholders.filter((key) => values[key] == null)
  if (missing.length > 0) {
    throw new Error(
      `Template ${templateId}: lipsesc placeholder-ele ${missing.join(', ')}`,
    )
  }
  return {
    title: renderText(template.title, values),
    body: renderText(template.body, values),
    priority: template.priority,
  }
}

interface CreateTemplatedTaskInput {
  templateId: NotificationTemplateId
  values: TemplateValues
  id: string
  notificationKey: string
  recipientType: RecipientType
  recipientIds: string[]
  scheduledFor?: number | null
  metadata: Record<string, unknown>
  createdAt: number
}

export function createTemplatedNotificationTask(
  input: CreateTemplatedTaskInput,
): NotificationTask {
  const rendered = renderNotificationTemplate(input.templateId, input.values)
  return {
    id: input.id,
    notificationKey: input.notificationKey,
    type: input.templateId,
    ...rendered,
    recipientType: input.recipientType,
    recipientIds: input.recipientIds,
    scheduledFor: input.scheduledFor ?? null,
    metadata: input.metadata,
    createdAt: input.createdAt,
  }
}
