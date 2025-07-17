# Metrics

hypixel-guild-discord-bridge supports [Prometheus](https://github.com/prometheus/prometheus) metrics, and it is
**enabled by default** on port `9095`.
Many metrics are automatically collected in memory and await prometheus to scrap them.

## Available Metrics

These are the currently monitored metrics. No usernames or anything personal is monitored. All metrics have the default
prefix `guild_bridge_`. It can be changed in `config.yaml` under `metrics`.

| Metric                        | Description                  | Source                                                  | metadata                                                                                                                                        |
| ----------------------------- | ---------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `PREFIX_guild_members`        | Guild members count          | Hypixel API `/guild` end point                          | `name`: Guild name                                                                                                                              |
| `PREFIX_guild_members_online` | Guild current online members | In-game periodic execution of `/guild list`             | `name`: Guild name                                                                                                                              |
| `PREFIX_chat`                 | Messages count of all chat   | In-game guild chat/Discord bot                          | `location`: Discord, webhook, in-game.<br>`scope`: private, officer, public chat.<br>`instance`: name of the source registered in `config.yaml` |
| `PREFIX_command`              | Commands usage count         | Discord commands interactions and in-game chat commands | Same as chat metrics + `command`: command name                                                                                                  |
| `PREFIX_event`                | Events count                 | Discord server events and in-game chat                  | same as chat metrics + `event`: event name (e.g. offline, join, mute, etc.)                                                                     |

## Metrics With Grafana

Metrics can be directly used from the Prometheus server by querying it directly.
However, to visualise the data, another server is required to do the job.
[Grafana](https://grafana.com) is one of the most popular and easy to use out there.
Many tutorials exist on the internet showcasing Grafana setups and configs.

Here are examples of **Prometheus queries** and their results displayed using Grafana:

- Guild Chat:

```prometheus
sum(increase(guild_bridge_chat[1h])) by (scope,location)
```

![](https://raw.githubusercontent.com/aidn3/hypixel-guild-discord-bridge/media/metrics_guild_chat.png)

- Guild Total Experience:

```prometheus
increase(guild_bridge_guild_exp_total[10m])
```

![](https://raw.githubusercontent.com/aidn3/hypixel-guild-discord-bridge/media/metrics_guild_experience_total.png)

- Guild Current Online Members:

```
guild_bridge_guild_members_online
```

![](https://raw.githubusercontent.com/aidn3/hypixel-guild-discord-bridge/media/metrics_guild_members_online.png)
