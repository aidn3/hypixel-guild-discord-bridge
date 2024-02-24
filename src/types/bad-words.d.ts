declare module 'bad-words' {
  interface BadWordsConstructor {
    new (options?: BadWordsOptions): BadWords

    (options?: BadWordsOptions): BadWords
  }

  declare const constructor: BadWordsConstructor
  export = constructor

  export class BadWords {
    clean: (text: string) => string
    removeWords: (...arguments_: string[]) => void
  }

  export interface BadWordsOptions {
    emptyList?: boolean
    list?: string[]
    placeHolder?: string
    regex?: string
    replaceRegex?: string
  }
}
