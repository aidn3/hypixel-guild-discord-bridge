# Guide to Contributing

## Issue Reporting, Suggestions and Feedback

You can [open a ticket here](https://github.com/aidn3/hypixel-guild-discord-bridge/issues/new)
if you have any suggestion, bug reporting, or facing a problem with the project.

You can also check [Existing tickets](https://github.com/aidn3/hypixel-guild-discord-bridge/issues) and reply to them if you have anything to add to them.

You can join the Discord server or contact us directly there as well.

## Considerations

This is a list of some of the considerations that have been contemplated when designing the project and its sub-features.

- All staff are immune to any punishment
- Sticky messages on Discord side such as an embed must look clean and not contain footer or any additional information such as "made by aidn5" etc
- Although not a hard rule, Discord slash commands are mostly reserved for managing/diagnosing the application. Chat commands are used for Quality of Life features.
- All events where the player needs to do math, the question and answer must not contain any fraction to prevent the float precision problem.
- Chat commands use `-` instead of `|` as a separator between various parts. `|` looks awfully close to various Latin letters like `H`, `T`, `I`, which makes it harder to read.

## Will Not Implement

This is list of features and patches that have been contemplated, but will ultimately not implement for one reason or another.

- Fully automated kicking based on in-game guild conditions: It is easy to misconfigure, or partially fill out conditions information, which will result in unintentionally nuke kicking most guild members
- Discord Admin logs channel: the entire philosophy of the project is to empower the users and reduce dependency on host provider and subsequently admins. All information are directly provided on their relevant channels and at least officer role can manage it

## Development

Check [Development Documentation and Design](./docs/DEVELOPMENT.md) before delving deep into coding.

### Setting up environment

Clone the project and install dependencies:

```shell
git clone https://github.com/aidn3/hypixel-guild-discord-bridge.git
cd hypixel-guild-discord-bridge
npm install
```

> It is recommended that you use an IDE that manages the linter and compiler for you.

### Committing changes

After done with changes, make sure to run `npm run validate` to validate all changes
and ensure they are fully compatible with the project as a whole.

Project follows strict coding style. The validation command will enforce the style as well.

Make sure the git commit message follows [git convention](https://www.conventionalcommits.org/)
