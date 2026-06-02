# Privacy Notice

During the configuration in application, you may choose whether to allow sending anonymous data to display at the main page of this project.
The metrics will help

## Commitment

All data are saved on a private server to avoid the hosting provider from harvesting the data.  
There will never be a plan to ever share the raw data with anyone including other contributors.  
Only aggregated data of EVERYONE are displayed at the main page of the project.

## Usage

Everything is done only to:

- showcase the popularity of the project at the main page
- Decide which platform to focus on more
- Decide which set of features are most commonly used to prioritize their maintenance

## Opt Out

To opt out of sending anonymous data,
open the file `config.yaml` and navigate to `general` category, `shareMetrics` field and set it to `false`.
This will stop ALL metrics from being collected.

## Collected Data

For further understanding of the data collected, you can check [the implementation code directly.](../src/instance/metrics/metrics-instance.ts)

- Basic environment data such as whether it is hosted inside a Docker Container, the name of the OS
- How many total instances are hosted and which version of the project is being used the most
- How many chat messages have been processed and how many chat commands have been executed
- How many in-game guilds are connected via the bridge and how many online people have access to bridge

## What will never be collected

- Any internet metadata including IP, port, country/region, latency, proxies, etc
- Any identifying hosting data such as the admin name, directory path, user permissions, etc
- Any identifying information such as guild name, application chosen code name, Discord servers names or ID, etc
- Any user data including their name, chat message content, roles, etc
- Any metadata such as chat frequency, tracking people's online activities, latency, etc

## Collection Process

The project uses [SHM](https://github.com/kOlapsis/shm) to collect and saves data.
The data is sent by an embedded [SHM SDK Client](https://github.com/kOlapsis/shm/tree/main/sdk/nodejs)
and saved at a privately hosted database that is also managed by SHM. The entire backend is hosted at my server.
Data are automatically aggregated by SHM and displayed at the main page of this project.
