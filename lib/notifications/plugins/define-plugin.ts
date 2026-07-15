import type {
  NotificationPriority,
  NotificationRule,
  NotificationTask,
  RecipientType,
  RuleContext,
} from '@/lib/notifications/types'

export type TemplateValues = Record<string, string | number>

export interface NotificationTemplate {
  id: string
  title: string
  body: string
  placeholders: readonly string[]
  priority: NotificationPriority
}

export interface NotificationDraft {
  values: TemplateValues
  id: string
  notificationKey: string
  recipientType: RecipientType
  recipientIds: string[]
  scheduledFor?: number | null
  metadata: Record<string, unknown>
  createdAt: number
}

export interface NotificationPlugin {
  id: string
  description: string
  enabled: boolean
  template: NotificationTemplate
  evaluate(context: RuleContext): NotificationDraft[] | Promise<NotificationDraft[]>
}

export function defineNotificationTemplate(
  template: NotificationTemplate,
): NotificationTemplate {
  return template
}

function renderText(template: string, values: TemplateValues): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(values[key] ?? `{{${key}}}`),
  )
}

function renderDraft(
  template: NotificationTemplate,
  draft: NotificationDraft,
): NotificationTask {
  const missing = template.placeholders.filter(
    (key) => draft.values[key] == null,
  )
  if (missing.length > 0) {
    throw new Error(
      `Template ${template.id}: lipsesc placeholder-ele ${missing.join(', ')}`,
    )
  }
  return {
    id: draft.id,
    notificationKey: draft.notificationKey,
    type: template.id,
    title: renderText(template.title, draft.values),
    body: renderText(template.body, draft.values),
    priority: template.priority,
    recipientType: draft.recipientType,
    recipientIds: draft.recipientIds,
    scheduledFor: draft.scheduledFor ?? null,
    metadata: draft.metadata,
    createdAt: draft.createdAt,
  }
}

export function defineNotificationPlugin(
  plugin: NotificationPlugin,
): NotificationPlugin {
  if (plugin.id !== plugin.template.id) {
    throw new Error(
      `Pluginul ${plugin.id} trebuie să folosească template-ul cu același id`,
    )
  }
  return plugin
}

/** Adaptorul unic plugin → engine. NotificationEngine rămâne generic. */
export function pluginAsRule(plugin: NotificationPlugin): NotificationRule {
  return {
    id: plugin.id,
    description: plugin.description,
    enabled: plugin.enabled,
    async evaluate(context) {
      const drafts = await plugin.evaluate(context)
      return drafts.map((draft) => renderDraft(plugin.template, draft))
    },
  }
}
