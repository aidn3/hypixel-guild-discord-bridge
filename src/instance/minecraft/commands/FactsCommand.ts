// noinspection SpellCheckingInspection

import MinecraftInstance from "../MinecraftInstance"
import {MinecraftCommandMessage} from "../common/ChatInterface"

let facts = [
    "☠ Itsfixit died to a trap and became a ghost.",
    "If aidn5 becomes a mayor perks will be -50% skill xp and triple hp for everyone to chill with their friends instead of grinding.",
    "Imagine having a life.",
    "[CROWD] Sniper: SlasherGames missed the shot! No way!! Hahaha man with 50ms missed a shot",
    "Condemned guild was once a tryhard one with kick-knife on everyone' throats.",
    "aidn5 to SlasherGames: once upon a time, I found sf and bought it. I was happy",
    "Wanna hear a joke? %s is a joke.",
    "e",
    "Condemned has a GreenScreen* cult.",
    "no way u shower - Snappaz_is_a_qt 5/1/22",
    "ulite is the oldest member in Condemned guild. joined 5/2/20",
    "Go get them tiger - ulite",
    "how bout aidn5 = furry",
    "aidn5 mains healer lol. thats a good one.",
    "spectralapple is stalker",
    "no.",
    "Once upon a time, %s was a big L. end of story, nothing changed. *clatch clatch clatch*",
    "Did you know %s wanted to have F? It stands for FIGHT! Bring it on!",
    "I once met %s. was a lovely person with a good personality, but has an ugly face. BUT GOOD personality. (but still has a hilariously ugly face)",
    "%s, you know I don't give facts for free, right? Pay me with you soul! nvm, you don't have one. fine, here is a fact: Your life is a joke.",
    "Did you know there is a tree growing right now and its only purpose is to become your coffin in the future.",
    "McFieldStation once gaveaway everything before quitting skyblock. He returned one week after and ended up with 40 skill average but only 3 million networth. L",
    "You can soulbound all your fancy possessions. So, in case you get hacked, nothing will be stolen!",
    "I once watched anime. It was a lovely evening.",
    "I hate you. jk, I despise you! :D",
    "i got scammed for thigh pics - Roadman_ticcy 29/10/21",
    "everyone in this guild ive ever goven things to to craft or star has been trustworthy u dont need to worry about getting scammed - kplo 28/11/21",
    "*Someone leaves the guild*, everyone: L. *Someone joins the guild*, everyone WHALECUM",
    "Hi everyone ⭐️! My name is 💫slasher-chan💫, ufufu 💛. I’m just an ordinary high school 15 year old Minecraft player uwu ✨✨.I like to stab orphan-kun heehee 😝😝. What’s that? Oh onii-chan you baka, I’m talking about Minecraft of course! Tehe~~⭐️⭐️😆😆",
    "Hi i am Itsfixit. I like men! only men. Okay. i also idenify as a female.",
    "aidn5: \"this command is aids :/ I'll add way to disable it.\" everyone: \"NOOO!\"",
    "itsfixit didn't get paid cause hypixel is dumb",
    "You are not allowed under any circumstances to /p warp finited out of limbo.",
    "If finited is out of limbo, you must return it there as fast as possible by /p warp to main lobby and leaving the party!",
    "invite when u need me for the f7 so u dont throw harder than my dad threw me as a child - GreenScreenKun",
    "Slasher u are `uwu~ anime fem boi",
    "~uwu~ step grand master sama - GreenScreenKun",
    "☠ Illusvie fell into the void."
]


export default <MinecraftCommandMessage>{
    triggers: ['fact', 'facts', 'f'],
    enabled: true,
    handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {

        let randomIndex = Math.floor(Math.random() * facts.length)
        let selectedIndex = Math.abs(Math.floor(Number(args[0])))
        let index = (selectedIndex || selectedIndex === 0) ? Math.min(selectedIndex, facts.length - 1) : randomIndex

        return facts[index]
    }
}
