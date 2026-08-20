import assert from 'node:assert'

import type { APIActionRowComponent, APIComponentInMessageActionRow } from 'discord.js'
import { ButtonStyle, ComponentType } from 'discord.js'

import type Application from '../../application.js'
import { Instance } from '../../common/instance.js'
import type { SqliteManager } from '../../common/sqlite-manager.js'

import { ActionsInteraction } from './actions-interaction.js'
import type { DiscordPersistentInstance } from './button-database.js'
import { ButtonDatabase, DiscordInstanceHistoryButtonType } from './button-database.js'
import { DeleteExpiredActions } from './delete-expired-actions.js'

export class MinecraftActionButtons extends Instance {
  private static readonly ActionButtonId = 'minecraft-action-button'

  public readonly database: ButtonDatabase

  private readonly deleteExpiredActions: DeleteExpiredActions
  private readonly actionsInteraction: ActionsInteraction

  constructor(application: Application, sqliteManager: SqliteManager) {
    super(application, 'minecraft-interaction-buttons')

    this.database = new ButtonDatabase(sqliteManager)

    this.deleteExpiredActions = new DeleteExpiredActions(
      this.application,
      this,
      this.eventHelper,
      this.logger,
      this.errorHandler,
      this.abortController.signal,
      this.database
    )
    this.actionsInteraction = new ActionsInteraction(
      this.application,
      this,
      this.eventHelper,
      this.logger,
      this.errorHandler,
      this.abortController.signal,
      this.database
    )
  }

  public add(entry: DiscordPersistentInstance): void {
    this.database.add(entry)
  }

  public generateButtons(
    actionType: DiscordInstanceHistoryButtonType,
    enabled: boolean
  ): APIActionRowComponent<APIComponentInMessageActionRow> {
    return {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          custom_id: MinecraftActionButtons.ActionButtonId,
          style: ButtonStyle.Primary,
          disabled: !enabled,
          label: this.getButtonLabel(actionType)
        }
      ]
    }
  }

  private getButtonLabel(actionType: DiscordInstanceHistoryButtonType): string {
    switch (actionType) {
      case DiscordInstanceHistoryButtonType.InvitedToGuild: {
        return 'Join Guild'
      }
      case DiscordInstanceHistoryButtonType.RequestToJoinGuild: {
        return 'Accept Join Request'
      }
      default: {
        actionType satisfies never
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        assert.fail(`unknown action type=${actionType}`)
      }
    }
  }
}
